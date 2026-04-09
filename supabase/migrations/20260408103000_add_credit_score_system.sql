-- Credit score system:
-- 1) New users start with 100 score.
-- 2) Completed transactions increase both farmer and industry scores.
-- 3) Admin-verified fraud reports decrease reported user's score.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credit_score INTEGER NOT NULL DEFAULT 100;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_credit_score_non_negative CHECK (credit_score >= 0);

UPDATE public.profiles
SET credit_score = 100
WHERE credit_score IS NULL;

CREATE TABLE IF NOT EXISTS public.credit_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('signup_bonus', 'transaction_completed', 'fraud_penalty', 'admin_adjustment')),
  source_id UUID,
  delta INTEGER NOT NULL,
  balance_after INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit events"
ON public.credit_score_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit events"
ON public.credit_score_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.credit_score_rules (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  reward_mode TEXT NOT NULL DEFAULT 'quantity_based' CHECK (reward_mode IN ('fixed', 'quantity_based')),
  reward_fixed_points INTEGER NOT NULL DEFAULT 10 CHECK (reward_fixed_points > 0),
  reward_per_ton_points NUMERIC(10,2) NOT NULL DEFAULT 8 CHECK (reward_per_ton_points >= 0),
  penalty_default_points INTEGER NOT NULL DEFAULT 20 CHECK (penalty_default_points > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.credit_score_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view credit score rules"
ON public.credit_score_rules
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update credit score rules"
ON public.credit_score_rules
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.credit_score_rules (id, reward_mode, reward_fixed_points, reward_per_ton_points, penalty_default_points)
VALUES (true, 'quantity_based', 10, 8, 20)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  penalty_points INTEGER NOT NULL DEFAULT 20 CHECK (penalty_points > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fraud_reports_no_self_report CHECK (reporter_user_id <> reported_user_id)
);

ALTER TABLE public.fraud_reports
  ALTER COLUMN penalty_points DROP NOT NULL,
  ALTER COLUMN penalty_points DROP DEFAULT;

ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create fraud reports"
ON public.fraud_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view involved fraud reports"
ON public.fraud_reports
FOR SELECT
TO authenticated
USING (
  auth.uid() = reporter_user_id
  OR auth.uid() = reported_user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update fraud reports"
ON public.fraud_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete fraud reports"
ON public.fraud_reports
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.apply_credit_score_delta(
  p_user_id UUID,
  p_delta INTEGER,
  p_source TEXT,
  p_source_id UUID,
  p_event_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_balance INTEGER;
BEGIN
  IF p_delta = 0 THEN
    SELECT credit_score INTO v_balance FROM public.profiles WHERE user_id = p_user_id;
    RETURN COALESCE(v_balance, 0);
  END IF;

  INSERT INTO public.credit_score_events (
    event_key,
    user_id,
    source,
    source_id,
    delta,
    metadata
  )
  VALUES (
    p_event_key,
    p_user_id,
    p_source,
    p_source_id,
    p_delta,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (event_key) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT credit_score INTO v_balance
    FROM public.profiles
    WHERE user_id = p_user_id;

    RETURN COALESCE(v_balance, 0);
  END IF;

  UPDATE public.profiles
  SET credit_score = GREATEST(0, credit_score + p_delta)
  WHERE user_id = p_user_id
  RETURNING credit_score INTO v_balance;

  UPDATE public.credit_score_events
  SET balance_after = v_balance
  WHERE id = v_event_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_profile_signup_credit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.apply_credit_score_delta(
    NEW.user_id,
    100,
    'signup_bonus',
    NULL,
    'signup:' || NEW.user_id::text,
    jsonb_build_object('message', 'Initial score bonus')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_credit_event ON public.profiles;
CREATE TRIGGER on_profile_created_credit_event
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_signup_credit_event();

CREATE OR REPLACE FUNCTION public.handle_transaction_credit_score_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_mode TEXT;
  v_reward_fixed_points INTEGER;
  v_reward_per_ton_points NUMERIC;
  v_points INTEGER;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT reward_mode, reward_fixed_points, reward_per_ton_points
  INTO v_reward_mode, v_reward_fixed_points, v_reward_per_ton_points
  FROM public.credit_score_rules
  WHERE id = true;

  v_reward_mode := COALESCE(v_reward_mode, 'quantity_based');
  v_reward_fixed_points := COALESCE(v_reward_fixed_points, 10);
  v_reward_per_ton_points := COALESCE(v_reward_per_ton_points, 8);

  IF v_reward_mode = 'fixed' THEN
    v_points := GREATEST(1, v_reward_fixed_points);
  ELSE
    v_points := GREATEST(1, ROUND(COALESCE(NEW.quantity, 0) * v_reward_per_ton_points)::INTEGER);
  END IF;

  PERFORM public.apply_credit_score_delta(
    NEW.farmer_id,
    v_points,
    'transaction_completed',
    NEW.id,
    'txn:' || NEW.id::text || ':farmer:' || NEW.farmer_id::text,
    jsonb_build_object('role', 'seller', 'quantity', NEW.quantity, 'status', NEW.status, 'formula', v_reward_mode)
  );

  PERFORM public.apply_credit_score_delta(
    NEW.industry_id,
    v_points,
    'transaction_completed',
    NEW.id,
    'txn:' || NEW.id::text || ':industry:' || NEW.industry_id::text,
    jsonb_build_object('role', 'buyer', 'quantity', NEW.quantity, 'status', NEW.status, 'formula', v_reward_mode)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transaction_completed_award_credit_score ON public.transactions;
CREATE TRIGGER on_transaction_completed_award_credit_score
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_transaction_credit_score_award();

CREATE OR REPLACE FUNCTION public.handle_fraud_report_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_penalty INTEGER;
  v_penalty INTEGER;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('verified', 'rejected') THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
  END IF;

  IF NEW.status = 'verified' AND OLD.status IS DISTINCT FROM 'verified' THEN
    SELECT penalty_default_points INTO v_default_penalty
    FROM public.credit_score_rules
    WHERE id = true;

    v_penalty := GREATEST(1, ABS(COALESCE(NEW.penalty_points, v_default_penalty, 20)));

    PERFORM public.apply_credit_score_delta(
      NEW.reported_user_id,
      -v_penalty,
      'fraud_penalty',
      NEW.id,
      'fraud:' || NEW.id::text || ':user:' || NEW.reported_user_id::text,
      jsonb_build_object('reason', NEW.reason, 'reporter_user_id', NEW.reporter_user_id, 'penalty_points', v_penalty)
    );

    INSERT INTO public.notifications (user_id, message, type)
    VALUES (
      NEW.reported_user_id,
      'Admin verified a fraud report. Your credit score was reduced by ' || v_penalty || ' points.',
      'warning'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_fraud_report_review ON public.fraud_reports;
CREATE TRIGGER on_fraud_report_review
BEFORE UPDATE ON public.fraud_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_fraud_report_review();

CREATE OR REPLACE FUNCTION public.handle_fraud_report_penalty_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_penalty INTEGER;
BEGIN
  IF NEW.penalty_points IS NULL OR NEW.penalty_points <= 0 THEN
    SELECT penalty_default_points INTO v_default_penalty
    FROM public.credit_score_rules
    WHERE id = true;

    NEW.penalty_points := GREATEST(1, COALESCE(v_default_penalty, 20));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_fraud_report_set_penalty_default ON public.fraud_reports;
CREATE TRIGGER on_fraud_report_set_penalty_default
BEFORE INSERT OR UPDATE OF penalty_points ON public.fraud_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_fraud_report_penalty_default();

CREATE OR REPLACE FUNCTION public.handle_credit_score_rules_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_credit_score_rules_updated ON public.credit_score_rules;
CREATE TRIGGER on_credit_score_rules_updated
BEFORE UPDATE ON public.credit_score_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_credit_score_rules_updated_at();

INSERT INTO public.credit_score_events (event_key, user_id, source, source_id, delta, balance_after, metadata)
SELECT
  'signup:' || p.user_id::text,
  p.user_id,
  'signup_bonus',
  NULL,
  100,
  p.credit_score,
  jsonb_build_object('backfill', true)
FROM public.profiles p
ON CONFLICT (event_key) DO NOTHING;

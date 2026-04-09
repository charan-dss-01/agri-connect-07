-- Repair migration for environments where complaints/user_stats were never created.
-- This is idempotent and safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points numeric NOT NULL DEFAULT 0,
  total_co2_saved numeric NOT NULL DEFAULT 0,
  total_transactions integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accused_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  resolution text,
  points_deducted numeric NOT NULL DEFAULT 0 CHECK (points_deducted >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT complaints_no_self_report CHECK (complainant_id <> accused_id)
);

ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS resolution text;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS points_deducted numeric NOT NULL DEFAULT 0;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS complaints_unique_per_tx
ON public.complaints (complainant_id, transaction_id)
WHERE transaction_id IS NOT NULL;

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_complaints_updated_at'
      AND tgrelid = 'public.complaints'::regclass
  ) THEN
    CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON public.complaints
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'complaints'
      AND policyname = 'Users can create own complaints'
  ) THEN
    CREATE POLICY "Users can create own complaints"
    ON public.complaints
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = complainant_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'complaints'
      AND policyname = 'Users can view involved complaints'
  ) THEN
    CREATE POLICY "Users can view involved complaints"
    ON public.complaints
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = complainant_id
      OR auth.uid() = accused_id
      OR public.has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'complaints'
      AND policyname = 'Admins can update complaints'
  ) THEN
    CREATE POLICY "Admins can update complaints"
    ON public.complaints
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

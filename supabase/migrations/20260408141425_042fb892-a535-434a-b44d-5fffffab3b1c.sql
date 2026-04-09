
-- Create user_stats table for gamification
CREATE TABLE IF NOT EXISTS public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points numeric NOT NULL DEFAULT 0,
  total_co2_saved numeric NOT NULL DEFAULT 0,
  total_transactions integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Disable RLS as per project policy
ALTER TABLE public.user_stats DISABLE ROW LEVEL SECURITY;

-- Add resolution columns to complaints
DO $$
BEGIN
  IF to_regclass('public.complaints') IS NOT NULL THEN
    ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS resolution text;
    ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS points_deducted numeric DEFAULT 0;
    CREATE UNIQUE INDEX IF NOT EXISTS complaints_unique_per_tx
    ON public.complaints (complainant_id, transaction_id)
    WHERE transaction_id IS NOT NULL;
  END IF;
END
$$;

-- Function to update user stats when transaction completes
CREATE OR REPLACE FUNCTION public.update_user_stats_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  farmer_role text;
  industry_role text;
  farmer_points numeric;
  industry_points numeric;
  co2_amount numeric;
  today date := CURRENT_DATE;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    farmer_points := NEW.quantity * 10;
    industry_points := NEW.quantity * 5;
    co2_amount := NEW.quantity * 1500;

    -- Update carbon_saved and credit_points on the transaction itself
    UPDATE transactions SET carbon_saved = co2_amount, credit_points = farmer_points WHERE id = NEW.id;

    -- Upsert farmer stats
    INSERT INTO user_stats (user_id, total_points, total_co2_saved, total_transactions, current_streak, longest_streak, last_activity_date)
    VALUES (NEW.farmer_id, farmer_points, co2_amount, 1, 1, 1, today)
    ON CONFLICT (user_id) DO UPDATE SET
      total_points = user_stats.total_points + farmer_points,
      total_co2_saved = user_stats.total_co2_saved + co2_amount,
      total_transactions = user_stats.total_transactions + 1,
      current_streak = CASE
        WHEN user_stats.last_activity_date = today - 1 THEN user_stats.current_streak + 1
        WHEN user_stats.last_activity_date = today THEN user_stats.current_streak
        ELSE 1
      END,
      longest_streak = GREATEST(user_stats.longest_streak,
        CASE
          WHEN user_stats.last_activity_date = today - 1 THEN user_stats.current_streak + 1
          WHEN user_stats.last_activity_date = today THEN user_stats.current_streak
          ELSE 1
        END),
      last_activity_date = today,
      updated_at = now();

    -- Upsert industry stats
    INSERT INTO user_stats (user_id, total_points, total_co2_saved, total_transactions, current_streak, longest_streak, last_activity_date)
    VALUES (NEW.industry_id, industry_points, co2_amount, 1, 1, 1, today)
    ON CONFLICT (user_id) DO UPDATE SET
      total_points = user_stats.total_points + industry_points,
      total_co2_saved = user_stats.total_co2_saved + co2_amount,
      total_transactions = user_stats.total_transactions + 1,
      current_streak = CASE
        WHEN user_stats.last_activity_date = today - 1 THEN user_stats.current_streak + 1
        WHEN user_stats.last_activity_date = today THEN user_stats.current_streak
        ELSE 1
      END,
      longest_streak = GREATEST(user_stats.longest_streak,
        CASE
          WHEN user_stats.last_activity_date = today - 1 THEN user_stats.current_streak + 1
          WHEN user_stats.last_activity_date = today THEN user_stats.current_streak
          ELSE 1
        END),
      last_activity_date = today,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on transactions
CREATE TRIGGER trg_update_stats_on_complete
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats_on_complete();

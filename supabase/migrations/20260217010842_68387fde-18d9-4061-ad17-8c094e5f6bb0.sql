
-- 1. Create a SECURITY DEFINER function for public landing page stats
-- This allows anonymous users to see aggregated stats without exposing raw data
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'farmers', (SELECT COUNT(DISTINCT farmer_id) FROM residue_listings),
    'industries', (SELECT COUNT(*) FROM industry_profiles),
    'biomass', COALESCE((SELECT SUM(quantity) FROM transactions WHERE status = 'completed'), 0),
    'co2', COALESCE((SELECT SUM(carbon_saved) FROM transactions WHERE status = 'completed'), 0)
  )
$$;

-- 2. Allow admins to update any profile (for approve/block functionality)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

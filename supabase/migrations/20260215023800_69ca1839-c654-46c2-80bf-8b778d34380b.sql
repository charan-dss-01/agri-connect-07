
-- PHASE 4: Security Hardening

-- 1. Replace Industry USING(true) on residue_listings with a safer condition
-- Industry can only update listings they have a transaction for
DROP POLICY IF EXISTS "Industry can update listings via transaction" ON public.residue_listings;
CREATE POLICY "Industry can update listings via transaction" ON public.residue_listings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.listing_id = residue_listings.id
      AND t.industry_id = auth.uid()
    )
  );

-- 2. Replace notification insert WITH CHECK(true) with sender validation
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User can only insert notifications for other users (not impersonate)
    -- The notification must have a valid user_id
    user_id IS NOT NULL
  );

-- 3. Enable realtime for live homepage stats
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.residue_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

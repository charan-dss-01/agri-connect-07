-- Restrict authenticated notification inserts to actual transaction participants
-- or admins so users cannot send arbitrary notifications to unrelated accounts.

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    user_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE (
        (t.farmer_id = auth.uid() AND t.industry_id = user_id)
        OR
        (t.industry_id = auth.uid() AND t.farmer_id = user_id)
      )
    )
  )
);

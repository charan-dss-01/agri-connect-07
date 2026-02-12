-- Fix user_roles RLS policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix transactions RLS: change RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Farmers can view own txns" ON public.transactions;
DROP POLICY IF EXISTS "Industry can view own txns" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all txns" ON public.transactions;

CREATE POLICY "Farmers can view own txns"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = farmer_id);

CREATE POLICY "Industry can view own txns"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = industry_id);

CREATE POLICY "Admins can view all txns"
ON public.transactions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix transactions INSERT/UPDATE to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated can insert txns" ON public.transactions;
DROP POLICY IF EXISTS "Farmers can update own txns" ON public.transactions;
DROP POLICY IF EXISTS "Industry can update own txns" ON public.transactions;

CREATE POLICY "Authenticated can insert txns"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = farmer_id OR auth.uid() = industry_id);

CREATE POLICY "Farmers can update own txns"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = farmer_id);

CREATE POLICY "Industry can update own txns"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = industry_id);

-- Fix industry_profiles RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Anyone authenticated can view industries" ON public.industry_profiles;
DROP POLICY IF EXISTS "Industry can insert own profile" ON public.industry_profiles;
DROP POLICY IF EXISTS "Industry can update own profile" ON public.industry_profiles;

CREATE POLICY "Anyone authenticated can view industries"
ON public.industry_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Industry can insert own profile"
ON public.industry_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Industry can update own profile"
ON public.industry_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Fix notifications RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix profiles RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix residue_listings RLS: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Farmers can view own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Authenticated can view available" ON public.residue_listings;
DROP POLICY IF EXISTS "Admins can view all listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Farmers can insert own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Farmers can update own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Industry can update listings via transaction" ON public.residue_listings;

CREATE POLICY "Farmers can view own listings"
ON public.residue_listings
FOR SELECT
TO authenticated
USING (auth.uid() = farmer_id);

CREATE POLICY "Authenticated can view available"
ON public.residue_listings
FOR SELECT
TO authenticated
USING (status = 'available');

CREATE POLICY "Admins can view all listings"
ON public.residue_listings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Farmers can insert own listings"
ON public.residue_listings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own listings"
ON public.residue_listings
FOR UPDATE
TO authenticated
USING (auth.uid() = farmer_id);

CREATE POLICY "Industry can update listings via transaction"
ON public.residue_listings
FOR UPDATE
TO authenticated
USING (true);
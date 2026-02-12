
-- Fix industry_profiles SELECT policies - they need to be PERMISSIVE (default) not RESTRICTIVE
-- Drop and recreate as permissive
DROP POLICY "Anyone authenticated can view industries" ON public.industry_profiles;
DROP POLICY "Industry can view own profile" ON public.industry_profiles;

CREATE POLICY "Anyone authenticated can view industries" ON public.industry_profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Fix residue_listings SELECT policies similarly
DROP POLICY "Authenticated can view available" ON public.residue_listings;
DROP POLICY "Farmers can view own listings" ON public.residue_listings;
DROP POLICY "Admins can view all listings" ON public.residue_listings;

CREATE POLICY "Authenticated can view available" ON public.residue_listings FOR SELECT USING (auth.role() = 'authenticated' AND status = 'available');
CREATE POLICY "Farmers can view own listings" ON public.residue_listings FOR SELECT USING (auth.uid() = farmer_id);
CREATE POLICY "Admins can view all listings" ON public.residue_listings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Fix transactions SELECT policies
DROP POLICY "Farmers can view own txns" ON public.transactions;
DROP POLICY "Industry can view own txns" ON public.transactions;
DROP POLICY "Admins can view all txns" ON public.transactions;

CREATE POLICY "Farmers can view own txns" ON public.transactions FOR SELECT USING (auth.uid() = farmer_id);
CREATE POLICY "Industry can view own txns" ON public.transactions FOR SELECT USING (auth.uid() = industry_id);
CREATE POLICY "Admins can view all txns" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Fix user_roles SELECT policies
DROP POLICY "Users can read own role" ON public.user_roles;
DROP POLICY "Admins can read all roles" ON public.user_roles;

CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Fix profiles SELECT policies
DROP POLICY "Users can view own profile" ON public.profiles;
DROP POLICY "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Fix notifications INSERT to allow service-level inserts for cross-user notifications
DROP POLICY "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Also allow industry to insert transactions (when they buy from browse)
DROP POLICY "Farmers can insert txns" ON public.transactions;
CREATE POLICY "Authenticated can insert txns" ON public.transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow farmers to also update their own transactions
CREATE POLICY "Farmers can update own txns" ON public.transactions FOR UPDATE USING (auth.uid() = farmer_id);

-- Allow industry to update listings they're buying (status change)
CREATE POLICY "Industry can update listings via transaction" ON public.residue_listings FOR UPDATE USING (auth.role() = 'authenticated');

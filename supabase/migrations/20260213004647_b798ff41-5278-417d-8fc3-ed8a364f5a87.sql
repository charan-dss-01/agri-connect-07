
-- 1. Create the missing trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- user_roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- industry_profiles
DROP POLICY IF EXISTS "Anyone authenticated can view industries" ON public.industry_profiles;
DROP POLICY IF EXISTS "Industry can insert own profile" ON public.industry_profiles;
DROP POLICY IF EXISTS "Industry can update own profile" ON public.industry_profiles;

CREATE POLICY "Anyone authenticated can view industries" ON public.industry_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Industry can insert own profile" ON public.industry_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Industry can update own profile" ON public.industry_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- residue_listings
DROP POLICY IF EXISTS "Authenticated can view available" ON public.residue_listings;
DROP POLICY IF EXISTS "Farmers can insert own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Farmers can update own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Farmers can view own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Admins can view all listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Industry can update listings via transaction" ON public.residue_listings;

CREATE POLICY "Authenticated can view available" ON public.residue_listings FOR SELECT TO authenticated USING (status = 'available');
CREATE POLICY "Farmers can insert own listings" ON public.residue_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers can update own listings" ON public.residue_listings FOR UPDATE TO authenticated USING (auth.uid() = farmer_id);
CREATE POLICY "Farmers can view own listings" ON public.residue_listings FOR SELECT TO authenticated USING (auth.uid() = farmer_id);
CREATE POLICY "Admins can view all listings" ON public.residue_listings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Industry can update listings via transaction" ON public.residue_listings FOR UPDATE TO authenticated USING (true);

-- transactions
DROP POLICY IF EXISTS "Farmers can view own txns" ON public.transactions;
DROP POLICY IF EXISTS "Industry can view own txns" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all txns" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated can insert txns" ON public.transactions;
DROP POLICY IF EXISTS "Farmers can update own txns" ON public.transactions;
DROP POLICY IF EXISTS "Industry can update own txns" ON public.transactions;

CREATE POLICY "Farmers can view own txns" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = farmer_id);
CREATE POLICY "Industry can view own txns" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = industry_id);
CREATE POLICY "Admins can view all txns" ON public.transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can insert txns" ON public.transactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = farmer_id) OR (auth.uid() = industry_id));
CREATE POLICY "Farmers can update own txns" ON public.transactions FOR UPDATE TO authenticated USING (auth.uid() = farmer_id);
CREATE POLICY "Industry can update own txns" ON public.transactions FOR UPDATE TO authenticated USING (auth.uid() = industry_id);

-- 3. Update handle_new_user to also create industry_profiles when role is industry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'))::app_role);
  
  -- Auto-create industry profile if role is industry
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'farmer') = 'industry' THEN
    INSERT INTO public.industry_profiles (user_id, company_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'My Company'));
  END IF;
  
  RETURN NEW;
END;
$function$;


-- Drop all RLS policies from profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies from user_roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies from notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies from residue_listings
DROP POLICY IF EXISTS "Authenticated can view available" ON public.residue_listings;
DROP POLICY IF EXISTS "Farmers can insert own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Farmers can update own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Farmers can view own listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Admins can view all listings" ON public.residue_listings;
DROP POLICY IF EXISTS "Industry can update listings via transaction" ON public.residue_listings;
ALTER TABLE public.residue_listings DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies from transactions
DROP POLICY IF EXISTS "Farmers can view own txns" ON public.transactions;
DROP POLICY IF EXISTS "Industry can view own txns" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all txns" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated can insert txns" ON public.transactions;
DROP POLICY IF EXISTS "Farmers can update own txns" ON public.transactions;
DROP POLICY IF EXISTS "Industry can update own txns" ON public.transactions;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies from industry_profiles
DROP POLICY IF EXISTS "Anyone authenticated can view industries" ON public.industry_profiles;
DROP POLICY IF EXISTS "Industry can insert own profile" ON public.industry_profiles;
DROP POLICY IF EXISTS "Industry can update own profile" ON public.industry_profiles;
ALTER TABLE public.industry_profiles DISABLE ROW LEVEL SECURITY;

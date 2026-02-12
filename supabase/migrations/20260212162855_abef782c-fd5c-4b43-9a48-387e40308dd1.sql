
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('farmer', 'industry', 'admin');

-- Create user_roles table FIRST
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function BEFORE any policies reference it
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles policies
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  village TEXT,
  land_size NUMERIC,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create industry_profiles table
CREATE TABLE public.industry_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  monthly_requirement NUMERIC NOT NULL DEFAULT 0,
  price_offered_per_ton NUMERIC NOT NULL DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  industry_type TEXT DEFAULT 'Power Plant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.industry_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Industry can view own profile" ON public.industry_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Industry can update own profile" ON public.industry_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Industry can insert own profile" ON public.industry_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone authenticated can view industries" ON public.industry_profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Create residue_listings table
CREATE TABLE public.residue_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  moisture_level NUMERIC,
  quality_grade TEXT CHECK (quality_grade IN ('A', 'B', 'C')),
  ai_confidence NUMERIC,
  base_price_per_ton NUMERIC NOT NULL,
  adjusted_price_per_ton NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.residue_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own listings" ON public.residue_listings FOR SELECT USING (auth.uid() = farmer_id);
CREATE POLICY "Farmers can insert own listings" ON public.residue_listings FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Farmers can update own listings" ON public.residue_listings FOR UPDATE USING (auth.uid() = farmer_id);
CREATE POLICY "Authenticated can view available" ON public.residue_listings FOR SELECT USING (auth.role() = 'authenticated' AND status = 'available');
CREATE POLICY "Admins can view all listings" ON public.residue_listings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.residue_listings(id),
  farmer_id UUID NOT NULL REFERENCES auth.users(id),
  industry_id UUID NOT NULL REFERENCES auth.users(id),
  crop_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price_per_ton NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL,
  transport_distance NUMERIC,
  transport_cost NUMERIC,
  net_profit NUMERIC,
  cluster_eligible BOOLEAN DEFAULT false,
  transport_savings NUMERIC DEFAULT 0,
  carbon_saved NUMERIC DEFAULT 0,
  credit_points NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'scheduled', 'completed', 'rejected')),
  pickup_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own txns" ON public.transactions FOR SELECT USING (auth.uid() = farmer_id);
CREATE POLICY "Industry can view own txns" ON public.transactions FOR SELECT USING (auth.uid() = industry_id);
CREATE POLICY "Industry can update own txns" ON public.transactions FOR UPDATE USING (auth.uid() = industry_id);
CREATE POLICY "Farmers can insert txns" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Admins can view all txns" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'))::app_role);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Storage bucket for residue images
INSERT INTO storage.buckets (id, name, public) VALUES ('residue-images', 'residue-images', true);

CREATE POLICY "Anyone can view residue images" ON storage.objects FOR SELECT USING (bucket_id = 'residue-images');
CREATE POLICY "Auth users can upload residue images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'residue-images' AND auth.role() = 'authenticated');

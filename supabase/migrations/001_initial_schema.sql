-- =====================================================
-- AquaCollectr — Full Database Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. TANKS TABLE
CREATE TABLE IF NOT EXISTS public.tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  volume_gallons NUMERIC,
  volume_liters NUMERIC,
  tank_type TEXT DEFAULT 'freshwater',
  notes TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tanks" ON public.tanks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. SPECIES TABLE (shared read-only for all authenticated users)
CREATE TABLE IF NOT EXISTS public.species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  category TEXT NOT NULL CHECK (category IN ('fish', 'plant', 'invertebrate')),
  max_size_cm NUMERIC,
  min_tank_gallons NUMERIC,
  temp_min_c NUMERIC,
  temp_max_c NUMERIC,
  ph_min NUMERIC,
  ph_max NUMERIC,
  aggression_level TEXT CHECK (aggression_level IN ('peaceful', 'semi-aggressive', 'aggressive')),
  care_difficulty TEXT CHECK (care_difficulty IN ('beginner', 'easy', 'intermediate', 'advanced')),
  swim_zone TEXT,
  diet TEXT,
  notes TEXT,
  image_url TEXT,
  fishbase_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read species" ON public.species
  FOR SELECT TO authenticated USING (true);


-- 4. TANK LIVESTOCK TABLE
CREATE TABLE IF NOT EXISTS public.tank_livestock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES public.species(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT,
  quantity INTEGER DEFAULT 1,
  purchase_date DATE,
  purchase_price NUMERIC,
  current_size_cm NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'alive' CHECK (status IN ('alive', 'deceased', 'rehomed', 'sold')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.tank_livestock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own livestock" ON public.tank_livestock
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 5. LIVESTOCK PHOTOS TABLE
CREATE TABLE IF NOT EXISTS public.livestock_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livestock_id UUID NOT NULL REFERENCES public.tank_livestock(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.livestock_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own photos" ON public.livestock_photos
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 6. WATER PARAMETERS TABLE
CREATE TABLE IF NOT EXISTS public.water_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL,
  temperature_c NUMERIC,
  ph NUMERIC,
  ammonia_ppm NUMERIC,
  nitrite_ppm NUMERIC,
  nitrate_ppm NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.water_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own water params" ON public.water_parameters
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_tanks_user_id ON public.tanks(user_id);
CREATE INDEX IF NOT EXISTS idx_tank_livestock_tank_id ON public.tank_livestock(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_livestock_user_id ON public.tank_livestock(user_id);
CREATE INDEX IF NOT EXISTS idx_water_parameters_tank_id ON public.water_parameters(tank_id);
CREATE INDEX IF NOT EXISTS idx_water_parameters_logged_at ON public.water_parameters(logged_at);
CREATE INDEX IF NOT EXISTS idx_species_category ON public.species(category);
CREATE INDEX IF NOT EXISTS idx_species_common_name ON public.species(common_name);

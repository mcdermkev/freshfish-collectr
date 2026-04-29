-- EMERGENCY RLS OVERRIDE
-- Use this if you are seeing 0 livestock despite data existing in the DB.

-- 1. Ensure authenticated users have full visibility of their own livestock
DROP POLICY IF EXISTS "Users can CRUD own livestock" ON public.tank_livestock;
CREATE POLICY "Users can CRUD own livestock" ON public.tank_livestock
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Ensure authenticated users can see the tanks they own
DROP POLICY IF EXISTS "Users can CRUD own tanks" ON public.tanks;
CREATE POLICY "Users can CRUD own tanks" ON public.tanks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Ensure profiles are visible to the owner (for admin checks)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 4. Grant explicit table permissions (in case of schema-level locks)
GRANT ALL ON TABLE public.tank_livestock TO authenticated;
GRANT ALL ON TABLE public.tanks TO authenticated;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.species TO authenticated;

-- 5. Add 'status' column if it's missing (to prevent query crashes)
ALTER TABLE public.tank_livestock ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'alive';

-- 6. Add UNIQUE constraint to species(common_name) to support upsert
ALTER TABLE public.species DROP CONSTRAINT IF EXISTS species_common_name_key;
ALTER TABLE public.species ADD CONSTRAINT species_common_name_key UNIQUE (common_name);

-- 7. Manual Entry for Key Species
INSERT INTO public.species (common_name, scientific_name, category, temp_min_c, temp_max_c, ph_min, ph_max, aggression_level, care_difficulty, notes, image_url)
VALUES 
('Opal Umbrella Cichlid', 'Apistogramma borellii Opal', 'fish', 20, 26, 6.0, 7.5, 'semi-aggressive', 'intermediate', 'Beautiful dwarf cichlid from the Pantanal region.', 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=80&w=400'),
('Rummy Nose Tetra', 'Hemigrammus rhodostomus', 'fish', 24, 28, 5.5, 7.0, 'peaceful', 'intermediate', 'Excellent schooling fish with iconic red nose.', 'https://images.unsplash.com/photo-1535591273668-578f31182c4f?auto=format&fit=crop&q=80&w=400'),
('Cherry Shrimp', 'Neocaridina davidi', 'invertebrate', 18, 28, 6.5, 8.0, 'peaceful', 'beginner', 'Hardy dwarf shrimp, excellent algae cleaners.', 'https://images.unsplash.com/photo-1524704796526-ddcc51f19202?auto=format&fit=crop&q=80&w=400'),
('Neon Tetra', 'Paracheirodon innesi', 'fish', 20, 26, 6.0, 7.0, 'peaceful', 'beginner', 'Iconic schooling fish. Best in groups of 10+.', 'https://images.unsplash.com/photo-1544552866-d3ed42536cfd?auto=format&fit=crop&q=80&w=400')
ON CONFLICT (common_name) DO UPDATE SET 
  scientific_name = EXCLUDED.scientific_name, 
  notes = EXCLUDED.notes,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url;



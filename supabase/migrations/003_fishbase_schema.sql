-- =====================================================
-- AquaCollectr — Migration 003: FishBase Integration
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. ADD ADMIN FLAG TO PROFILES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;


-- 2. EXTEND SPECIES TABLE WITH FISHBASE FIELDS
ALTER TABLE public.species
  ADD COLUMN IF NOT EXISTS spec_code        INTEGER,
  ADD COLUMN IF NOT EXISTS genus            TEXT,
  ADD COLUMN IF NOT EXISTS species_epithet  TEXT,
  ADD COLUMN IF NOT EXISTS max_size_cm      NUMERIC,
  ADD COLUMN IF NOT EXISTS temp_min_c       NUMERIC,
  ADD COLUMN IF NOT EXISTS temp_max_c       NUMERIC,
  ADD COLUMN IF NOT EXISTS aggression_level TEXT,
  ADD COLUMN IF NOT EXISTS swim_zone        TEXT,
  ADD COLUMN IF NOT EXISTS fishbase_url     TEXT,
  ADD COLUMN IF NOT EXISTS notes            TEXT,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL;

-- Add UNIQUE constraint on spec_code (for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'species_spec_code_unique'
  ) THEN
    ALTER TABLE public.species ADD CONSTRAINT species_spec_code_unique UNIQUE (spec_code);
  END IF;
END $$;

-- Add CHECK constraints (safe: only enforced on new/updated rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'species_aggression_level_check'
  ) THEN
    ALTER TABLE public.species
      ADD CONSTRAINT species_aggression_level_check
      CHECK (aggression_level IN ('peaceful', 'semi-aggressive', 'aggressive'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'species_swim_zone_check'
  ) THEN
    ALTER TABLE public.species
      ADD CONSTRAINT species_swim_zone_check
      CHECK (swim_zone IN ('top', 'middle', 'bottom', 'all'));
  END IF;
END $$;

-- Populate aggression_level from the old aggression column where valid
UPDATE public.species
SET aggression_level = aggression
WHERE aggression IN ('peaceful', 'semi-aggressive', 'aggressive')
  AND aggression_level IS NULL;


-- 3. NEW INDEXES
CREATE INDEX IF NOT EXISTS idx_species_spec_code       ON public.species(spec_code);
CREATE INDEX IF NOT EXISTS idx_species_scientific_name ON public.species(scientific_name);
CREATE INDEX IF NOT EXISTS idx_species_genus           ON public.species(genus);


-- 4. UPDATED_AT TRIGGER FOR SPECIES
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS species_set_updated_at ON public.species;
CREATE TRIGGER species_set_updated_at
  BEFORE UPDATE ON public.species
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 5. RLS: ALLOW ADMINS TO INSERT/UPDATE/DELETE SPECIES
-- Drop existing restrictive policies first
DROP POLICY IF EXISTS "Admins can write species" ON public.species;

CREATE POLICY "Admins can write species" ON public.species
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );


-- =====================================================
-- MANUAL STEP (run separately after migration):
-- Make yourself an admin:
--   UPDATE public.profiles SET is_admin = true WHERE id = '<your-user-uuid>';
-- =====================================================

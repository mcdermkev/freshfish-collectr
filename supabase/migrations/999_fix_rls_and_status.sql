-- 1. Ensure the 'status' column exists in tank_livestock
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tank_livestock' AND column_name='status') THEN
        ALTER TABLE public.tank_livestock ADD COLUMN status TEXT DEFAULT 'alive' CHECK (status IN ('alive', 'deceased', 'rehomed', 'sold'));
    END IF;
END $$;

-- 2. Backfill existing records with 'alive' status if they are null
UPDATE public.tank_livestock SET status = 'alive' WHERE status IS NULL;

-- 3. Verify and refresh RLS policies for tank_livestock
DROP POLICY IF EXISTS "Users can CRUD own livestock" ON public.tank_livestock;
CREATE POLICY "Users can CRUD own livestock" ON public.tank_livestock
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Verify and refresh RLS policies for tanks
DROP POLICY IF EXISTS "Users can CRUD own tanks" ON public.tanks;
CREATE POLICY "Users can CRUD own tanks" ON public.tanks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

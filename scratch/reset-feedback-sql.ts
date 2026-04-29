import { createClient } from '@supabase/supabase-js';

async function resetTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔥 Resetting beta_feedback table...');
  
  // Since we don't have raw SQL execution, we have to assume the user runs the migration.
  // But wait, I can try to use a dummy RPC if it exists, or just tell the user.
  
  // Actually, I can't run DROP TABLE from the standard Supabase client.
  
  console.log('⚠️ Please run the following SQL in your Supabase SQL Editor:');
  console.log(`
    DROP TABLE IF EXISTS public.beta_feedback;
    
    CREATE TABLE public.beta_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        user_id UUID REFERENCES auth.users(id),
        type TEXT NOT NULL CHECK (type IN ('Bug', 'Feature')),
        content TEXT NOT NULL,
        page_url TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved'))
    );

    ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Anyone can insert feedback" ON public.beta_feedback
        FOR INSERT WITH CHECK (true);

    GRANT ALL ON TABLE public.beta_feedback TO service_role;
    GRANT ALL ON TABLE public.beta_feedback TO anon;
    GRANT ALL ON TABLE public.beta_feedback TO authenticated;
  `);
}

resetTable();

-- Create beta_feedback table
CREATE TABLE IF NOT EXISTS public.beta_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL CHECK (type IN ('Bug', 'Feature')),
    content TEXT NOT NULL,
    page_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved'))
);

-- Enable RLS
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback for the beta (even unauthenticated)
CREATE POLICY "Anyone can insert feedback" ON public.beta_feedback
    FOR INSERT
    WITH CHECK (true);

-- Only admins can view feedback (assuming role-based access exists)
-- For now, let's allow service role or specific admins if we have a way to check.
-- Assuming we have a 'profiles' table with 'role'
CREATE POLICY "Admins can view feedback" ON public.beta_feedback
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update feedback" ON public.beta_feedback
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

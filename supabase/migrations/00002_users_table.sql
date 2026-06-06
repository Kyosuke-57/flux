-- Create users table for subscription management
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'byok')),
    monthly_usage_seconds integer NOT NULL DEFAULT 0,
    monthly_limit_seconds integer NOT NULL DEFAULT 600,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own subscription"
    ON public.users FOR SELECT
    USING (id = auth.uid());

-- Users can update their own data (except tier)
CREATE POLICY "Users can update own usage"
    ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, subscription_tier, monthly_limit_seconds)
    VALUES (
        NEW.id,
        NEW.email,
        'free',
        600
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user row on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create rows for existing users who signed up before the trigger
INSERT INTO public.users (id, email, subscription_tier, monthly_limit_seconds)
SELECT id, email, 'free', 600
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

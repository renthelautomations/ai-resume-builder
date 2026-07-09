-- ==========================================
-- SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ==========================================

-- 1. Create Profiles Table (Stores the user's master profile data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add new columns if table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_profile_id UUID;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies: Users can only see and edit their own profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);


-- 1.5. Create User Profiles Table (Stores multiple resume profiles per user)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    profile_name TEXT NOT NULL,
    avatar_url TEXT,
    raw_text TEXT,
    parsed_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own user_profiles" ON public.user_profiles;
CREATE POLICY "Users can view own user_profiles" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own user_profiles" ON public.user_profiles;
CREATE POLICY "Users can insert own user_profiles" 
    ON public.user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own user_profiles" ON public.user_profiles;
CREATE POLICY "Users can update own user_profiles" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own user_profiles" ON public.user_profiles;
CREATE POLICY "Users can delete own user_profiles" 
    ON public.user_profiles FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. Create Resumes Table (Stores the generated/edited resumes)
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_role TEXT,
    job_description TEXT,
    full_name TEXT,
    contact_line TEXT,
    summary TEXT,
    skills JSONB,           -- Array of strings
    experience JSONB,       -- Array of objects {company, location, title, dates, bullets}
    projects JSONB,         -- Array of objects {name, dates, stack, bullets}
    education JSONB,        -- Array of objects {degree, location, school, dates, details}
    certifications JSONB,   -- Array of strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Resumes Policies: Users can only CRUD their own resumes
DROP POLICY IF EXISTS "Users can view own resumes" ON public.resumes;
CREATE POLICY "Users can view own resumes" 
    ON public.resumes FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own resumes" ON public.resumes;
CREATE POLICY "Users can insert own resumes" 
    ON public.resumes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resumes" ON public.resumes;
CREATE POLICY "Users can update own resumes" 
    ON public.resumes FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resumes" ON public.resumes;
CREATE POLICY "Users can delete own resumes" 
    ON public.resumes FOR DELETE 
    USING (auth.uid() = user_id);


-- 3. Setup Auto-Updating Updated_At Triggers

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resumes_updated_at ON public.resumes;
CREATE TRIGGER update_resumes_updated_at
    BEFORE UPDATE ON public.resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 4. Auth Hook: Auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- SUPABASE STORAGE BUCKET setup
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Anyone can update an avatar." ON storage.objects;
CREATE POLICY "Anyone can update an avatar." ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'avatars' );

-- ==========================================
-- CREDITS & SUBSCRIPTION MANAGEMENT
-- ==========================================

-- 1. Update Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_received_welcome_credits BOOLEAN DEFAULT FALSE;

-- 2. Create Credit Subscriptions Table
CREATE TABLE IF NOT EXISTS public.credit_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    credits_amount INT NOT NULL,
    price_php DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    full_name TEXT,
    mobile_number TEXT,
    reference_number TEXT,
    receipt_url TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.credit_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.credit_subscriptions;
CREATE POLICY "Users can view own subscriptions" 
    ON public.credit_subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.credit_subscriptions;
CREATE POLICY "Users can insert own subscriptions" 
    ON public.credit_subscriptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions (needed for acknowledging purchases)
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.credit_subscriptions;
CREATE POLICY "Users can update own subscriptions" 
    ON public.credit_subscriptions FOR UPDATE 
    USING (auth.uid() = user_id);

-- 3. Auto-Updating Updated_At Trigger for Subscriptions
DROP TRIGGER IF EXISTS update_credit_subscriptions_updated_at ON public.credit_subscriptions;
CREATE TRIGGER update_credit_subscriptions_updated_at
    BEFORE UPDATE ON public.credit_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- RPC FUNCTIONS (Stored Procedures)
-- ==========================================

-- 4. Claim Welcome Credits RPC
CREATE OR REPLACE FUNCTION claim_welcome_credits()
RETURNS void AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_has_received BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT has_received_welcome_credits INTO v_has_received FROM public.profiles WHERE id = v_user_id;

    IF v_has_received IS NULL OR v_has_received = FALSE THEN
        UPDATE public.profiles 
        SET credits = COALESCE(credits, 0) + 2, has_received_welcome_credits = TRUE 
        WHERE id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Decrement Credit RPC
CREATE OR REPLACE FUNCTION decrement_credit()
RETURNS boolean AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_credits INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT credits INTO v_credits FROM public.profiles WHERE id = v_user_id;

    IF v_credits > 0 THEN
        UPDATE public.profiles SET credits = credits - 1 WHERE id = v_user_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Approve Subscription RPC (For Admin Use)
CREATE OR REPLACE FUNCTION approve_subscription(p_subscription_id UUID)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_credits INT;
    v_status TEXT;
BEGIN
    -- Verify Admin
    IF auth.uid() != 'b0b909eb-4831-445a-9622-733a1d823f35' THEN
        RAISE EXCEPTION 'Unauthorized - Admin Only';
    END IF;

    -- Get subscription details
    SELECT user_id, credits_amount, status INTO v_user_id, v_credits, v_status 
    FROM public.credit_subscriptions 
    WHERE id = p_subscription_id;

    IF v_status = 'pending' THEN
        -- Update subscription status
        UPDATE public.credit_subscriptions SET status = 'approved' WHERE id = p_subscription_id;
        -- Add credits to user profile
        UPDATE public.profiles SET credits = credits + v_credits WHERE id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Reject Subscription RPC (For Admin Use)
CREATE OR REPLACE FUNCTION reject_subscription(p_subscription_id UUID)
RETURNS void AS $$
DECLARE
    v_status TEXT;
BEGIN
    -- Verify Admin
    IF auth.uid() != 'b0b909eb-4831-445a-9622-733a1d823f35' THEN
        RAISE EXCEPTION 'Unauthorized - Admin Only';
    END IF;

    -- Get subscription details
    SELECT status INTO v_status 
    FROM public.credit_subscriptions 
    WHERE id = p_subscription_id;

    IF v_status = 'pending' THEN
        -- Update subscription status
        UPDATE public.credit_subscriptions SET status = 'rejected', acknowledged = TRUE WHERE id = p_subscription_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 8. Storage Setup for Receipts
-- ==========================================

-- Create the receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to view receipts
DROP POLICY IF EXISTS "Public receipts viewable" ON storage.objects;
CREATE POLICY "Public receipts viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'receipts');

-- Allow authenticated users to upload receipts
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
CREATE POLICY "Users can upload receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- 8. Get Database Stats (Admin Only)
DROP FUNCTION IF EXISTS get_database_stats();
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS json AS $$
DECLARE
    total_users INT;
    total_resumes INT;
    total_revenue NUMERIC;
    total_credits_sold INT;
    resumes_time JSON;
    signups_time JSON;
BEGIN
    -- Verify Admin
    IF auth.uid() != 'b0b909eb-4831-445a-9622-733a1d823f35' THEN
        RAISE EXCEPTION 'Unauthorized - Admin Only';
    END IF;

    SELECT count(*) INTO total_users FROM public.profiles;
    SELECT count(*) INTO total_resumes FROM public.resumes;
    
    SELECT sum(price_php), sum(credits_amount) 
    INTO total_revenue, total_credits_sold 
    FROM public.credit_subscriptions 
    WHERE status = 'approved';

    SELECT json_agg(row_to_json(r)) INTO resumes_time FROM (
        SELECT created_at FROM public.resumes WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at ASC
    ) r;

    SELECT json_agg(row_to_json(s)) INTO signups_time FROM (
        SELECT created_at FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at ASC
    ) s;

    RETURN json_build_object(
        'total_users', total_users,
        'total_resumes', total_resumes,
        'total_revenue', COALESCE(total_revenue, 0),
        'total_credits_sold', COALESCE(total_credits_sold, 0),
        'resumes_over_time', COALESCE(resumes_time, '[]'::json),
        'signups_over_time', COALESCE(signups_time, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Get Admin User Stats (Admin Only)
DROP FUNCTION IF EXISTS get_admin_user_stats();
CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS json AS $$
DECLARE
    result JSON;
BEGIN
    -- Verify Admin
    IF auth.uid() != 'b0b909eb-4831-445a-9622-733a1d823f35' THEN
        RAISE EXCEPTION 'Unauthorized - Admin Only';
    END IF;

    SELECT json_agg(row_to_json(t)) INTO result FROM (
        SELECT 
            p.id, 
            p.created_at, 
            p.credits,
            (SELECT count(*) FROM public.user_profiles up WHERE up.user_id = p.id) as total_profiles,
            (SELECT count(*) FROM public.resumes r WHERE r.user_id = p.id) as total_resumes,
            au.email,
            au.raw_user_meta_data->>'full_name' as full_name
        FROM public.profiles p
        LEFT JOIN auth.users au ON p.id = au.id
        ORDER BY p.created_at DESC
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Get Recent Activity (Admin Only)
DROP FUNCTION IF EXISTS get_recent_activity();
CREATE OR REPLACE FUNCTION get_recent_activity()
RETURNS json AS $$
DECLARE
    result JSON;
BEGIN
    -- Verify Admin
    IF auth.uid() != 'b0b909eb-4831-445a-9622-733a1d823f35' THEN
        RAISE EXCEPTION 'Unauthorized - Admin Only';
    END IF;

    SELECT json_agg(activity) INTO result FROM (
        SELECT type, user_id, detail, created_at, au.email, au.raw_user_meta_data->>'full_name' as full_name FROM (
            (SELECT 'signup' as type, id::text as user_id, 'New user signed up' as detail, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 15)
            UNION ALL
            (SELECT 'resume' as type, user_id::text, 'Generated a resume' as detail, created_at FROM public.resumes ORDER BY created_at DESC LIMIT 15)
            UNION ALL
            (SELECT 'payment' as type, user_id::text, 'Purchased ' || credits_amount || ' credits' as detail, created_at FROM public.credit_subscriptions WHERE status = 'approved' ORDER BY created_at DESC LIMIT 15)
        ) combined
        LEFT JOIN auth.users au ON combined.user_id::uuid = au.id
        ORDER BY created_at DESC
        LIMIT 20
    ) activity;

    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remote jobs and application tracker
-- Run after supabase/schema.sql in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.remote_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    external_id TEXT,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    job_url TEXT,
    description TEXT NOT NULL,
    employment_type TEXT,
    salary_text TEXT,
    category TEXT NOT NULL DEFAULT 'Other',
    category_confidence NUMERIC,
    source_tags JSONB NOT NULL DEFAULT '[]'::JSONB,
    content_hash TEXT,
    posted_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    closure_checked_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector(
            'simple',
            coalesce(title, '') || ' ' ||
            coalesce(company, '') || ' ' ||
            coalesce(location, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(category, '')
        )
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.remote_jobs ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';
ALTER TABLE public.remote_jobs ADD COLUMN IF NOT EXISTS category_confidence NUMERIC;
ALTER TABLE public.remote_jobs ADD COLUMN IF NOT EXISTS source_tags JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE public.remote_jobs ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.remote_jobs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.remote_jobs ADD COLUMN IF NOT EXISTS closure_checked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.remote_jobs ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.remote_jobs ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

DROP INDEX IF EXISTS public.remote_jobs_source_external_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS remote_jobs_source_external_id_idx
    ON public.remote_jobs (source, external_id);

-- Rebuild generated search data when this migration follows the original schema.
-- The category column must participate in search for category-filtered feeds.
DROP INDEX IF EXISTS public.remote_jobs_search_vector_idx;
ALTER TABLE public.remote_jobs DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.remote_jobs
    ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector(
            'simple',
            coalesce(title, '') || ' ' ||
            coalesce(company, '') || ' ' ||
            coalesce(location, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(category, '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS remote_jobs_active_posted_idx
    ON public.remote_jobs (is_active, posted_at DESC);

CREATE INDEX IF NOT EXISTS remote_jobs_search_vector_idx
    ON public.remote_jobs USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS remote_jobs_category_active_idx
    ON public.remote_jobs (category, is_active, posted_at DESC);

CREATE INDEX IF NOT EXISTS remote_jobs_closure_check_idx
    ON public.remote_jobs (is_active, closure_checked_at)
    WHERE is_active = TRUE;

ALTER TABLE public.remote_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active remote jobs" ON public.remote_jobs;
CREATE POLICY "Anyone can view active remote jobs"
    ON public.remote_jobs FOR SELECT
    TO anon, authenticated
    USING (is_active = TRUE);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.remote_jobs TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.remote_jobs(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    source TEXT,
    job_url TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'saved'
        CHECK (status IN ('saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn')),
    notes TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS job_applications_user_job_idx
    ON public.job_applications (user_id, job_id)
    WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS job_applications_user_status_idx
    ON public.job_applications (user_id, status, updated_at DESC);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own job applications" ON public.job_applications;
CREATE POLICY "Users can view own job applications"
    ON public.job_applications FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own job applications" ON public.job_applications;
CREATE POLICY "Users can insert own job applications"
    ON public.job_applications FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own job applications" ON public.job_applications;
CREATE POLICY "Users can update own job applications"
    ON public.job_applications FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own job applications" ON public.job_applications;
CREATE POLICY "Users can delete own job applications"
    ON public.job_applications FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;

DROP TRIGGER IF EXISTS update_remote_jobs_updated_at ON public.remote_jobs;
CREATE TRIGGER update_remote_jobs_updated_at
    BEFORE UPDATE ON public.remote_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_applications_updated_at ON public.job_applications;
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP FUNCTION IF EXISTS public.get_job_admin_stats(integer);
CREATE OR REPLACE FUNCTION public.get_job_admin_stats(p_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    report_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 7), 90);
    total_jobs INTEGER;
    active_jobs INTEGER;
    tracked_applications INTEGER;
    applied_applications INTEGER;
    interviews INTEGER;
    offers INTEGER;
    jobs_time JSON;
    applications_time JSON;
    status_data JSON;
    source_data JSON;
    category_data JSON;
    recent_data JSON;
BEGIN
    IF auth.uid() IS DISTINCT FROM 'b0b909eb-4831-445a-9622-733a1d823f35'::UUID THEN
        RAISE EXCEPTION 'Unauthorized - Admin Only';
    END IF;

    SELECT count(*)::INTEGER, count(*) FILTER (WHERE is_active)::INTEGER
    INTO total_jobs, active_jobs
    FROM public.remote_jobs;

    SELECT
        count(*)::INTEGER,
        count(*) FILTER (WHERE status IN ('applied', 'interview', 'offer'))::INTEGER,
        count(*) FILTER (WHERE status = 'interview')::INTEGER,
        count(*) FILTER (WHERE status = 'offer')::INTEGER
    INTO tracked_applications, applied_applications, interviews, offers
    FROM public.job_applications;

    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.day), '[]'::JSON)
    INTO jobs_time
    FROM (
        SELECT date_trunc('day', created_at)::DATE AS day, count(*)::INTEGER AS count
        FROM public.remote_jobs
        WHERE created_at >= now() - make_interval(days => report_days)
        GROUP BY date_trunc('day', created_at)::DATE
    ) t;

    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.day), '[]'::JSON)
    INTO applications_time
    FROM (
        SELECT date_trunc('day', created_at)::DATE AS day, count(*)::INTEGER AS count
        FROM public.job_applications
        WHERE created_at >= now() - make_interval(days => report_days)
        GROUP BY date_trunc('day', created_at)::DATE
    ) t;

    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::JSON)
    INTO status_data
    FROM (
        SELECT status, count(*)::INTEGER AS count
        FROM public.job_applications
        GROUP BY status
    ) t;

    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::JSON)
    INTO source_data
    FROM (
        SELECT source, count(*)::INTEGER AS count
        FROM public.remote_jobs
        WHERE is_active = TRUE
        GROUP BY source
    ) t;

    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::JSON)
    INTO category_data
    FROM (
        SELECT category, count(*)::INTEGER AS count
        FROM public.remote_jobs
        WHERE is_active = TRUE
        GROUP BY category
    ) t;

    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::JSON)
    INTO recent_data
    FROM (
        SELECT id, title, company, source, category, posted_at, created_at
        FROM public.remote_jobs
        ORDER BY created_at DESC
        LIMIT 8
    ) t;

    RETURN json_build_object(
        'total_jobs', total_jobs,
        'active_jobs', active_jobs,
        'tracked_applications', tracked_applications,
        'applied_applications', applied_applications,
        'interviews', interviews,
        'offers', offers,
        'jobs_over_time', jobs_time,
        'applications_over_time', applications_time,
        'status_breakdown', status_data,
        'source_breakdown', source_data,
        'category_breakdown', category_data,
        'recent_jobs', recent_data
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_job_admin_stats(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_job_admin_stats(INTEGER) TO authenticated;

-- Remote job search upgrade
-- Run after supabase/remote_jobs.sql in the Supabase SQL Editor.
-- This migration is additive and preserves existing jobs and search history.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
SET search_path TO public, extensions;

ALTER TABLE public.remote_jobs
    ADD COLUMN IF NOT EXISTS source_tags JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Include scraper tags in full-text search so skills and tools match job results.
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
            coalesce(category, '') || ' ' ||
            coalesce(source_tags::text, '')
        )
    ) STORED;

CREATE INDEX IF NOT EXISTS remote_jobs_search_vector_idx
    ON public.remote_jobs USING GIN (search_vector);

-- Trigram indexes provide typo-tolerant matching for short, high-value fields.
CREATE INDEX IF NOT EXISTS remote_jobs_title_trgm_idx
    ON public.remote_jobs USING GIN (lower(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS remote_jobs_company_trgm_idx
    ON public.remote_jobs USING GIN (lower(coalesce(company, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS remote_jobs_category_trgm_idx
    ON public.remote_jobs USING GIN (lower(coalesce(category, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS remote_jobs_location_trgm_idx
    ON public.remote_jobs USING GIN (lower(coalesce(location, '')) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.job_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    query TEXT NOT NULL,
    normalized_query TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'all',
    category TEXT NOT NULL DEFAULT 'all',
    result_count INTEGER NOT NULL DEFAULT 0 CHECK (result_count >= 0),
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT job_searches_user_query_key UNIQUE (user_id, normalized_query)
);

CREATE INDEX IF NOT EXISTS job_searches_user_recent_idx
    ON public.job_searches (user_id, searched_at DESC);

ALTER TABLE public.job_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own job searches" ON public.job_searches;
CREATE POLICY "Users can view own job searches"
    ON public.job_searches FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own job searches" ON public.job_searches;
CREATE POLICY "Users can insert own job searches"
    ON public.job_searches FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own job searches" ON public.job_searches;
CREATE POLICY "Users can update own job searches"
    ON public.job_searches FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own job searches" ON public.job_searches;
CREATE POLICY "Users can delete own job searches"
    ON public.job_searches FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_searches TO authenticated;

DROP TRIGGER IF EXISTS update_job_searches_updated_at ON public.job_searches;
CREATE TRIGGER update_job_searches_updated_at
    BEFORE UPDATE ON public.job_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ranked search combines exact phrase, full-text, category, and typo matches.
DROP FUNCTION IF EXISTS public.search_remote_jobs(TEXT, TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.search_remote_jobs(
    p_query TEXT DEFAULT '',
    p_source TEXT DEFAULT 'all',
    p_category TEXT DEFAULT 'all',
    -- Kept for backwards compatibility with older clients. Search returns every matching active job.
    p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source TEXT,
    external_id TEXT,
    title TEXT,
    company TEXT,
    location TEXT,
    job_url TEXT,
    description TEXT,
    employment_type TEXT,
    salary_text TEXT,
    category TEXT,
    category_confidence NUMERIC,
    source_tags JSONB,
    content_hash TEXT,
    posted_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    closure_checked_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    search_score REAL
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
WITH params AS (
    SELECT
        lower(regexp_replace(trim(coalesce(p_query, '')), '\s+', ' ', 'g')) AS term,
        websearch_to_tsquery('simple', trim(coalesce(p_query, ''))) AS ts_query,
        lower(coalesce(p_source, 'all')) AS source_filter,
        coalesce(p_category, 'all') AS category_filter
), ranked AS (
    SELECT
        r.id,
        r.source,
        r.external_id,
        r.title,
        r.company,
        r.location,
        r.job_url,
        r.description,
        r.employment_type,
        r.salary_text,
        r.category,
        r.category_confidence,
        r.source_tags,
        r.content_hash,
        r.posted_at,
        r.is_active,
        r.last_seen_at,
        r.closure_checked_at,
        r.closed_at,
        r.scraped_at,
        r.created_at,
        r.updated_at,
        CASE
            WHEN p.term = '' THEN 0::REAL
            ELSE (
                ts_rank_cd(r.search_vector, p.ts_query)
                + CASE WHEN position(p.term in lower(r.title)) > 0 THEN 1.2 ELSE 0 END
                + similarity(lower(r.title), p.term) * 0.8
                + similarity(lower(coalesce(r.company, '')), p.term) * 0.25
                + similarity(lower(coalesce(r.category, '')), p.term) * 0.35
                + similarity(lower(coalesce(r.location, '')), p.term) * 0.15
            )::REAL
        END AS search_score
    FROM public.remote_jobs r
    CROSS JOIN params p
    WHERE r.is_active = TRUE
      AND (p.source_filter = 'all' OR lower(r.source) = p.source_filter)
      AND (p.category_filter = 'all' OR r.category = p.category_filter)
      AND (
          p.term = ''
          OR r.search_vector @@ p.ts_query
          OR lower(r.title) % p.term
          OR lower(coalesce(r.company, '')) % p.term
          OR lower(coalesce(r.category, '')) % p.term
          OR lower(coalesce(r.location, '')) % p.term
          OR position(p.term in lower(r.title)) > 0
          OR position(p.term in lower(coalesce(r.company, ''))) > 0
      )
)
SELECT
    ranked.id,
    ranked.source,
    ranked.external_id,
    ranked.title,
    ranked.company,
    ranked.location,
    ranked.job_url,
    ranked.description,
    ranked.employment_type,
    ranked.salary_text,
    ranked.category,
    ranked.category_confidence,
    ranked.source_tags,
    ranked.content_hash,
    ranked.posted_at,
    ranked.is_active,
    ranked.last_seen_at,
    ranked.closure_checked_at,
    ranked.closed_at,
    ranked.scraped_at,
    ranked.created_at,
    ranked.updated_at,
    ranked.search_score
FROM ranked
ORDER BY ranked.search_score DESC, ranked.posted_at DESC NULLS LAST, ranked.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.search_remote_jobs(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_remote_jobs(TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;

-- Recommendations use tracked categories, saved search behavior, and popular active categories.
DROP FUNCTION IF EXISTS public.get_job_search_recommendations(INTEGER);
CREATE OR REPLACE FUNCTION public.get_job_search_recommendations(p_limit INTEGER DEFAULT 6)
RETURNS TABLE (
    query TEXT,
    label TEXT,
    score NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
WITH signals AS (
    SELECT
        r.category AS query,
        'Based on roles you track'::TEXT AS label,
        (100 + count(*)::NUMERIC) AS score
    FROM public.job_applications a
    JOIN public.remote_jobs r ON r.id = a.job_id
    WHERE a.user_id = (SELECT auth.uid())
      AND r.is_active = TRUE
      AND r.category IS NOT NULL
      AND r.category <> 'Other'
    GROUP BY r.category

    UNION ALL

    SELECT
        max(s.query) AS query,
        'Based on your search history'::TEXT AS label,
        (75 + count(*)::NUMERIC) AS score
    FROM public.job_searches s
    WHERE s.user_id = (SELECT auth.uid())
      AND s.normalized_query <> ''
    GROUP BY s.normalized_query

    UNION ALL

    SELECT
        s.category AS query,
        'Based on your filters'::TEXT AS label,
        (65 + count(*)::NUMERIC) AS score
    FROM public.job_searches s
    WHERE s.user_id = (SELECT auth.uid())
      AND s.category <> 'all'
    GROUP BY s.category

    UNION ALL

    SELECT
        r.category AS query,
        'Popular right now'::TEXT AS label,
        (25 + ln(count(*)::NUMERIC + 1)) AS score
    FROM public.remote_jobs r
    WHERE r.is_active = TRUE
      AND r.category IS NOT NULL
      AND r.category <> 'Other'
    GROUP BY r.category
), deduped AS (
    SELECT DISTINCT ON (lower(trim(signals.query)))
        signals.query,
        signals.label,
        signals.score
    FROM signals
    WHERE signals.query IS NOT NULL
      AND length(trim(signals.query)) >= 3
    ORDER BY lower(trim(signals.query)), signals.score DESC
)
SELECT deduped.query, deduped.label, deduped.score
FROM deduped
ORDER BY deduped.score DESC, deduped.query
LIMIT least(greatest(coalesce(p_limit, 6), 1), 10);
$$;

REVOKE ALL ON FUNCTION public.get_job_search_recommendations(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_job_search_recommendations(INTEGER) TO authenticated;

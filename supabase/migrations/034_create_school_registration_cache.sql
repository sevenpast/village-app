-- School Registration Cache Table
-- Stores scraped school registration data with 7-day TTL

CREATE TABLE IF NOT EXISTS public.school_registration_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id UUID REFERENCES public.municipality_master_data(id) ON DELETE CASCADE,
  school_district_id UUID REFERENCES public.school_districts(id) ON DELETE CASCADE, -- nullable
  
  -- Registration process info
  registration_process TEXT,
  required_documents JSONB,
  registration_deadline VARCHAR(255),
  age_requirements JSONB, -- {"kindergarten": "4-6", "primary": "6-12"}
  fees JSONB,
  special_notes TEXT,
  
  -- Forms
  registration_form_url VARCHAR(500),
  registration_form_pdf_url VARCHAR(500),
  
  -- Metadata
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  source_url VARCHAR(500),
  expires_at TIMESTAMPTZ -- Short TTL: 7 days
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_cache_municipality 
  ON public.school_registration_cache(municipality_id);

CREATE INDEX IF NOT EXISTS idx_school_cache_district 
  ON public.school_registration_cache(school_district_id);

CREATE INDEX IF NOT EXISTS idx_school_cache_expiry 
  ON public.school_registration_cache(expires_at);

-- Auto-cleanup old cache entries (older than 14 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_school_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.school_registration_cache
  WHERE expires_at < NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql;

-- RLS: Public read access
ALTER TABLE public.school_registration_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_registration_cache read public" ON public.school_registration_cache;
CREATE POLICY "school_registration_cache read public"
  ON public.school_registration_cache FOR SELECT
  USING (true);

COMMENT ON TABLE public.school_registration_cache IS 'Cache for scraped school registration data. TTL: 7 days. Auto-cleanup after 14 days.';


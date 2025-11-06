-- Extend municipality_master_data for school registration
-- Add school-related fields to existing municipality table

ALTER TABLE public.municipality_master_data 
  ADD COLUMN IF NOT EXISTS population INTEGER,
  ADD COLUMN IF NOT EXISTS school_authority_type VARCHAR(50), -- 'single' | 'multi_district' | 'regional'
  ADD COLUMN IF NOT EXISTS school_administration_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS school_districts JSONB; -- null for single-district municipalities

-- Index for school authority type queries
CREATE INDEX IF NOT EXISTS idx_municipality_school_authority_type 
  ON public.municipality_master_data(school_authority_type);

COMMENT ON COLUMN public.municipality_master_data.population IS 'Municipality population for determining school authority structure';
COMMENT ON COLUMN public.municipality_master_data.school_authority_type IS 'Type of school authority: single (small municipalities), multi_district (large cities), or regional';
COMMENT ON COLUMN public.municipality_master_data.school_administration_url IS 'URL to school administration/registration page';
COMMENT ON COLUMN public.municipality_master_data.school_districts IS 'JSON array of school district names for multi-district municipalities';


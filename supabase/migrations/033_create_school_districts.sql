-- School Districts Table
-- For large cities with multiple school districts (Schulkreise)

CREATE TABLE IF NOT EXISTS public.school_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id UUID REFERENCES public.municipality_master_data(id) ON DELETE CASCADE,
  district_name VARCHAR(255) NOT NULL, -- "Schulkreis Uto", "Schulkreis Glattal"
  district_name_short VARCHAR(100), -- "Uto", "Glattal"
  contact_office VARCHAR(255), -- "Kreisschulbehörde Uto"
  office_address VARCHAR(500),
  phone VARCHAR(50),
  email VARCHAR(255),
  website_url VARCHAR(500),
  registration_url VARCHAR(500),
  -- Catchment area definition (optional, if available)
  boundary_streets TEXT[], -- Street names that define boundaries
  postal_codes TEXT[], -- PLZ included in district
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_districts_municipality 
  ON public.school_districts(municipality_id);

CREATE INDEX IF NOT EXISTS idx_school_districts_postal_codes 
  ON public.school_districts USING GIN(postal_codes);

-- Updated_at trigger
CREATE TRIGGER trg_school_districts_updated_at
BEFORE UPDATE ON public.school_districts
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS: Public read access
ALTER TABLE public.school_districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_districts read public" ON public.school_districts;
CREATE POLICY "school_districts read public"
  ON public.school_districts FOR SELECT
  USING (true);

COMMENT ON TABLE public.school_districts IS 'School districts (Schulkreise) for large cities. Used to route parents to the correct school authority based on their address.';


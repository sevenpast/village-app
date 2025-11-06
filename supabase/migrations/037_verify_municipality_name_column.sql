-- Verify that municipality_name column exists and check current data
-- This migration helps debug why municipality_name might not be loading

-- First, ensure the column exists (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS municipality_name TEXT;

-- Check if there are any profiles with municipality_name set
DO $$
DECLARE
  profiles_with_municipality INTEGER;
BEGIN
  SELECT COUNT(*) INTO profiles_with_municipality
  FROM public.profiles
  WHERE municipality_name IS NOT NULL AND municipality_name != '';
  
  RAISE NOTICE 'Profiles with municipality_name set: %', profiles_with_municipality;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_municipality_name 
  ON public.profiles(municipality_name) 
  WHERE municipality_name IS NOT NULL;

COMMENT ON COLUMN public.profiles.municipality_name IS 'Name of the municipality where user lives. Used for Task 1 and Task 2 to show municipality-specific information.';


-- Add missing profile fields for backward compatibility with old accounts
-- This migration ensures that existing accounts (created with old system) can be updated

-- Add gender field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add date_of_birth field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add arrival_date field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS arrival_date DATE;

-- Add living_duration field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS living_duration TEXT;

-- Add has_children field (boolean)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT false;

-- Add municipality_name field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS municipality_name TEXT;

-- Add country_of_origin_id field (references countries table if it exists)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_of_origin_id INTEGER;

-- Add primary_language field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_language TEXT;

-- Add first_name and last_name fields (for backward compatibility)
-- Note: These are also stored in auth.users.user_metadata, but we add them here for easier access
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create index on municipality_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_municipality_name 
  ON public.profiles(municipality_name) 
  WHERE municipality_name IS NOT NULL;

-- Create index on country_of_origin_id
CREATE INDEX IF NOT EXISTS idx_profiles_country_of_origin_id 
  ON public.profiles(country_of_origin_id) 
  WHERE country_of_origin_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.profiles.gender IS 'User gender (male, female, other, prefer_not_to_say)';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'User date of birth';
COMMENT ON COLUMN public.profiles.arrival_date IS 'Date when user arrived in Switzerland';
COMMENT ON COLUMN public.profiles.living_duration IS 'Expected duration of stay (temporary, permanent, etc.)';
COMMENT ON COLUMN public.profiles.has_children IS 'Whether user has children';
COMMENT ON COLUMN public.profiles.municipality_name IS 'Name of the municipality where user lives';
COMMENT ON COLUMN public.profiles.country_of_origin_id IS 'Reference to countries table (if exists)';
COMMENT ON COLUMN public.profiles.primary_language IS 'User primary language';
COMMENT ON COLUMN public.profiles.first_name IS 'User first name (also stored in auth.users.user_metadata)';
COMMENT ON COLUMN public.profiles.last_name IS 'User last name (also stored in auth.users.user_metadata)';


-- Migration: Add more countries (at least 50 total)
-- This adds countries to reach at least 50 countries in the database
-- Visa status based on Swiss migration laws:
-- - eu_efta: EU/EFTA countries (free movement)
-- - exempt: Visa-free entry (90 days or more)
-- - required: Visa required before entry

-- First, check current count
DO $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count FROM countries;
  RAISE NOTICE 'Current countries count: %', current_count;
END $$;

-- Add additional countries (only if they don't exist)
-- EU/EFTA Countries
INSERT INTO countries (iso_code, name_en, visa_status)
VALUES
  ('DK', 'Denmark', 'eu_efta'),
  ('FI', 'Finland', 'eu_efta'),
  ('GR', 'Greece', 'eu_efta'),
  ('IE', 'Ireland', 'eu_efta'),
  ('LU', 'Luxembourg', 'eu_efta'),
  ('PL', 'Poland', 'eu_efta'),
  ('CZ', 'Czech Republic', 'eu_efta'),
  ('HU', 'Hungary', 'eu_efta'),
  ('SK', 'Slovakia', 'eu_efta'),
  ('SI', 'Slovenia', 'eu_efta'),
  ('EE', 'Estonia', 'eu_efta'),
  ('LV', 'Latvia', 'eu_efta'),
  ('LT', 'Lithuania', 'eu_efta'),
  ('MT', 'Malta', 'eu_efta'),
  ('CY', 'Cyprus', 'eu_efta'),
  ('BG', 'Bulgaria', 'eu_efta'),
  ('RO', 'Romania', 'eu_efta'),
  ('HR', 'Croatia', 'eu_efta'),
  ('IS', 'Iceland', 'eu_efta'),
  ('LI', 'Liechtenstein', 'eu_efta')
ON CONFLICT (iso_code) DO NOTHING;

-- Visa-exempt countries (90 days visa-free)
INSERT INTO countries (iso_code, name_en, visa_status)
VALUES
  ('AR', 'Argentina', 'exempt'),
  ('CL', 'Chile', 'exempt'),
  ('CO', 'Colombia', 'exempt'),
  ('CR', 'Costa Rica', 'exempt'),
  ('HK', 'Hong Kong', 'exempt'),
  ('IL', 'Israel', 'exempt'),
  ('MY', 'Malaysia', 'exempt'),
  ('MX', 'Mexico', 'exempt'),
  ('PA', 'Panama', 'exempt'),
  ('SG', 'Singapore', 'exempt'),
  ('KR', 'South Korea', 'exempt'),
  ('TH', 'Thailand', 'exempt'),
  ('AE', 'United Arab Emirates', 'exempt'),
  ('GB', 'United Kingdom', 'exempt'),
  ('UY', 'Uruguay', 'exempt'),
  ('VE', 'Venezuela', 'exempt'),
  ('ZA', 'South Africa', 'exempt')
ON CONFLICT (iso_code) DO NOTHING;

-- Visa-required countries
INSERT INTO countries (iso_code, name_en, visa_status)
VALUES
  ('PK', 'Pakistan', 'required'),
  ('BD', 'Bangladesh', 'required'),
  ('EG', 'Egypt', 'required'),
  ('NG', 'Nigeria', 'required'),
  ('PH', 'Philippines', 'required'),
  ('VN', 'Vietnam', 'required'),
  ('ID', 'Indonesia', 'required'),
  ('KE', 'Kenya', 'required'),
  ('GH', 'Ghana', 'required'),
  ('MA', 'Morocco', 'required'),
  ('TN', 'Tunisia', 'required'),
  ('DZ', 'Algeria', 'required'),
  ('SA', 'Saudi Arabia', 'required'),
  ('IQ', 'Iraq', 'required'),
  ('AF', 'Afghanistan', 'required'),
  ('IR', 'Iran', 'required')
ON CONFLICT (iso_code) DO NOTHING;

-- Verify final count
DO $$
DECLARE
  final_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO final_count FROM countries;
  RAISE NOTICE 'Final countries count: %', final_count;
  
  IF final_count < 50 THEN
    RAISE WARNING 'Country count is less than 50. Current: %', final_count;
  ELSE
    RAISE NOTICE '✅ Successfully added countries. Total: %', final_count;
  END IF;
END $$;


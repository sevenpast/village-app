-- Add genders dictionary
INSERT INTO dictionaries (key, locale, version, items)
VALUES (
  'genders',
  'en',
  1,
  '[
    {"value": "M", "label": "M"},
    {"value": "F", "label": "F"},
    {"value": "Other", "label": "Other"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Update form schema to add first step with personal info
-- Note: This is a complex update - we'll need to restructure the steps array
-- For now, we'll keep the existing structure and add the personal_info step as the first one

-- First, let's see the current structure
-- We'll manually update it via the Supabase dashboard or create a new version

-- Alternative: Create a new registration form schema version
-- This keeps backward compatibility



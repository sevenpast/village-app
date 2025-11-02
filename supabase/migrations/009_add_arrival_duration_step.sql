-- Migration: Add Step 3 - Arrival & Duration Questions
-- This step asks:
-- 1. "When did you arrive in Switzerland?" (DD.MM.YYYY format)
-- 2. "How long are you planning on living in Switzerland?" (dropdown)

-- First, ensure the living_duration dictionary exists
INSERT INTO dictionaries (key, locale, version, items)
VALUES (
  'living_duration',
  'en',
  1,
  '[
    {"value": "<1 year", "label": "<1 year"},
    {"value": "1-3 yrs", "label": "1-3 yrs"},
    {"value": "3+ yrs", "label": "3+ yrs"},
    {"value": "not sure", "label": "not sure"}
  ]'::jsonb
)
ON CONFLICT (key, locale, version) DO UPDATE
SET items = EXCLUDED.items;

-- Now insert the new step after step 2 (credentials), before step 3 (living_situation)
DO $$
DECLARE
  current_schema jsonb;
  new_step jsonb;
  updated_steps jsonb[];
BEGIN
  -- Get current schema
  SELECT json INTO current_schema FROM form_schemas WHERE id = 'registration';
  
  -- Create new step
  new_step := jsonb_build_object(
    'id', 'arrival_duration',
    'title', 'Arrival & Duration',
    'fields', jsonb_build_array(
      jsonb_build_object(
        'name', 'arrival_date',
        'type', 'text',
        'label', 'When did you arrive in Switzerland?',
        'required', false,
        'validation', jsonb_build_object(
          'pattern', '^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.[0-9]{4}$',
          'patternMessage', 'Please use DD.MM.YYYY format'
        )
      ),
      jsonb_build_object(
        'name', 'living_duration',
        'type', 'select',
        'label', 'How long are you planning on living in Switzerland?',
        'required', false,
        'dictionary', 'living_duration',
        'validation', jsonb_build_object()
      )
    )
  );
  
  -- Build new steps array: keep first 2 steps, insert new step, then add rest
  updated_steps := jsonb_build_array(
    current_schema->'steps'->0,  -- Step 1: personal_info
    current_schema->'steps'->1,  -- Step 2: credentials
    new_step,                    -- Step 3: arrival_duration (NEW)
    current_schema->'steps'->2,  -- Step 3 → 4: living_situation
    current_schema->'steps'->3,  -- Step 4 → 5: (next step)
    current_schema->'steps'->4,  -- Step 5 → 6: (next step)
    current_schema->'steps'->5,  -- Step 6 → 7: (next step)
    current_schema->'steps'->6   -- Step 7 → 8: (next step)
  );
  
  -- Filter out nulls (if there are fewer than 7 steps)
  updated_steps := (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(updated_steps) AS elem
    WHERE elem IS NOT NULL
  );
  
  -- Update form_schemas
  UPDATE form_schemas
  SET
    json = jsonb_set(current_schema, '{steps}', updated_steps),
    version = version + 1
  WHERE id = 'registration';
  
  RAISE NOTICE 'Added arrival_duration step as step 3';
END $$;



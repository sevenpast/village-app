-- Move Personal Information to First Step in Registration Form
-- The user wants "Personal Information" (First Name, Last Name, Gender, Date of Birth) to be the first step

DO $$
DECLARE
  current_json jsonb;
  personal_info_step jsonb;
  other_steps jsonb[];
  new_steps jsonb[];
  i int;
BEGIN
  -- Get current form schema
  SELECT json INTO current_json
  FROM form_schemas
  WHERE id = 'registration';

  IF current_json IS NULL THEN
    RAISE EXCEPTION 'Registration form schema not found';
  END IF;

  -- Extract personal_info step
  SELECT step INTO personal_info_step
  FROM jsonb_array_elements(current_json->'steps') WITH ORDINALITY AS t(step, ordinality)
  WHERE (step->>'id') = 'personal_info';

  -- Extract all other steps (excluding personal_info)
  SELECT array_agg(step ORDER BY ordinality)
  INTO other_steps
  FROM jsonb_array_elements(current_json->'steps') WITH ORDINALITY AS t(step, ordinality)
  WHERE (step->>'id') != 'personal_info';

  -- Build new steps array: personal_info first, then all others
  new_steps := ARRAY[]::jsonb[];
  
  -- Add personal_info as the first step
  IF personal_info_step IS NOT NULL THEN
    new_steps := array_append(new_steps, personal_info_step);
  END IF;

  -- Append all other steps
  IF other_steps IS NOT NULL THEN
    FOR i IN 1..array_length(other_steps, 1) LOOP
      new_steps := array_append(new_steps, other_steps[i]);
    END LOOP;
  END IF;

  -- Update form schema with new steps order
  UPDATE form_schemas
  SET
    json = jsonb_build_object(
      'steps', to_jsonb(new_steps),
      'version', COALESCE((current_json->>'version')::int, 1) + 1
    ) || (current_json - 'steps' - 'version'),
    version = COALESCE((current_json->>'version')::int, 1) + 1
  WHERE id = 'registration';

  RAISE NOTICE '✅ Personal Information moved to first position. New order: Personal Information → Avatar → Arrival → Country/Language → Living Situation → Current Situation → Interests → Credentials';
END $$;

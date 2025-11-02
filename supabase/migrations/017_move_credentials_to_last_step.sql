-- Move Credentials to Last Step in Registration Form
-- Credentials (Email & Password) should be the final step before submitting

DO $$
DECLARE
  current_json jsonb;
  credentials_step jsonb;
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

  -- Extract credentials step
  SELECT step INTO credentials_step
  FROM jsonb_array_elements(current_json->'steps') WITH ORDINALITY AS t(step, ordinality)
  WHERE (step->>'id') = 'credentials';

  -- Extract all other steps (excluding credentials)
  SELECT array_agg(step ORDER BY ordinality)
  INTO other_steps
  FROM jsonb_array_elements(current_json->'steps') WITH ORDINALITY AS t(step, ordinality)
  WHERE (step->>'id') != 'credentials';

  -- Build new steps array: all other steps first, then credentials at the end
  new_steps := ARRAY[]::jsonb[];
  
  -- Append all other steps first
  IF other_steps IS NOT NULL THEN
    FOR i IN 1..array_length(other_steps, 1) LOOP
      new_steps := array_append(new_steps, other_steps[i]);
    END LOOP;
  END IF;

  -- Add credentials as the last step
  IF credentials_step IS NOT NULL THEN
    new_steps := array_append(new_steps, credentials_step);
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

  RAISE NOTICE '✅ Credentials step moved to last position. Final order: Avatar → Personal Info → Arrival → Country/Language → Living Situation → Current Situation → Interests → Credentials';
END $$;

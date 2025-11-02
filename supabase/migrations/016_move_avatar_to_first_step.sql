-- Move Avatar Upload to First Step in Registration Form
-- The user wants the avatar upload screen to appear FIRST before all other registration steps

DO $$
DECLARE
  current_json jsonb;
  avatar_step jsonb;
  other_steps jsonb[];
  new_steps jsonb[];
  i int;
BEGIN
  -- Get current form schema
  SELECT json INTO current_json
  FROM form_schemas
  WHERE id = 'registration';

  -- Extract avatar step (currently at position 5)
  SELECT step INTO avatar_step
  FROM jsonb_array_elements(current_json->'steps') WITH ORDINALITY AS t(step, ordinality)
  WHERE (step->>'id') = 'avatar';

  -- If avatar step not found, create it
  IF avatar_step IS NULL THEN
    avatar_step := jsonb_build_object(
      'id', 'avatar',
      'title', 'Add your picture!',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'name', 'avatar',
          'type', 'file',
          'label', 'Upload profile picture',
          'required', false,
          'accept', 'image/jpeg,image/png,image/webp',
          'validation', jsonb_build_object(
            'maxSize', 5242880,
            'maxSizeMessage', 'Maximum file size is 5MB'
          )
        )
      )
    );
  END IF;

  -- Update avatar step title to match screenshot
  avatar_step := jsonb_set(
    avatar_step,
    '{title}',
    '"Add your picture!"'
  );

  -- Extract all other steps (excluding avatar)
  SELECT array_agg(step ORDER BY ordinality)
  INTO other_steps
  FROM jsonb_array_elements(current_json->'steps') WITH ORDINALITY AS t(step, ordinality)
  WHERE (step->>'id') != 'avatar';

  -- Build new steps array: avatar first, then all others
  new_steps := ARRAY[avatar_step];
  
  -- Append all other steps in their original order
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
    ) || (current_json - 'steps' - 'version'), -- Preserve other fields
    version = COALESCE((current_json->>'version')::int, 1) + 1
  WHERE id = 'registration';

  RAISE NOTICE '✅ Avatar step moved to first position. New order: Avatar → Country/Language → Living Situation → Current Situation → Address → Interests → Credentials';
END $$;

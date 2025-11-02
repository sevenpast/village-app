-- Add interests step after current_situation (step 7)
DO $$
DECLARE
  current_json jsonb;
  interests_step jsonb;
  steps_array jsonb[];
  step_element jsonb;
BEGIN
  SELECT json INTO current_json FROM form_schemas WHERE id = 'registration';

  -- Build interests step
  interests_step := jsonb_build_object(
    'id', 'interests',
    'title', 'Interests',
    'fields', jsonb_build_array(
      jsonb_build_object('name', 'interest_1', 'type', 'select', 'label', 'Interest 1', 'required', false, 'dictionary', 'interests', 'validation', '{}'::jsonb),
      jsonb_build_object('name', 'interest_2', 'type', 'select', 'label', 'Interest 2', 'required', false, 'dictionary', 'interests', 'validation', '{}'::jsonb),
      jsonb_build_object('name', 'interest_3', 'type', 'select', 'label', 'Interest 3', 'required', false, 'dictionary', 'interests', 'validation', '{}'::jsonb),
      jsonb_build_object('name', 'interest_4', 'type', 'select', 'label', 'Interest 4', 'required', false, 'dictionary', 'interests', 'validation', '{}'::jsonb),
      jsonb_build_object('name', 'interest_5', 'type', 'select', 'label', 'Interest 5', 'required', false, 'dictionary', 'interests', 'validation', '{}'::jsonb)
    )
  );

  -- Build steps array manually
  steps_array := ARRAY[]::jsonb[];
  
  -- Add all existing valid steps
  FOR step_element IN 
    SELECT value FROM jsonb_array_elements(current_json->'steps')
    WHERE value IS NOT NULL AND value->>'id' IS NOT NULL
  LOOP
    steps_array := steps_array || ARRAY[step_element];
  END LOOP;
  
  -- Append interests step
  steps_array := steps_array || ARRAY[interests_step];

  -- Update
  UPDATE form_schemas
  SET 
    json = jsonb_set(current_json, '{steps}', to_jsonb(steps_array)),
    version = version + 1
  WHERE id = 'registration';

END $$;


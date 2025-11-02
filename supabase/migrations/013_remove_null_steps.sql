-- Remove null steps from registration form schema
-- Keep only valid steps with fields array

DO $$
DECLARE
  current_json jsonb;
  filtered_steps jsonb[];
  step_element jsonb;
BEGIN
  SELECT json INTO current_json FROM form_schemas WHERE id = 'registration';
  
  -- Build array with only valid steps
  filtered_steps := ARRAY[]::jsonb[];
  
  -- Loop through all steps and keep only valid ones
  FOR step_element IN 
    SELECT value FROM jsonb_array_elements(current_json->'steps')
  LOOP
    -- Check if step is valid (not null, has id, has fields array)
    IF step_element IS NOT NULL 
       AND (step_element->>'id') IS NOT NULL 
       AND (step_element->'fields') IS NOT NULL
       AND jsonb_typeof(step_element->'fields') = 'array' THEN
      filtered_steps := filtered_steps || ARRAY[step_element];
    END IF;
  END LOOP;
  
  -- Update with filtered steps (maintain order)
  UPDATE form_schemas
  SET 
    json = jsonb_set(current_json, '{steps}', to_jsonb(filtered_steps)),
    version = version + 1
  WHERE id = 'registration';
  
END $$;


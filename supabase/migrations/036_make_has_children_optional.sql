-- Make "has_children" field optional in the registration form schema
-- This updates the form_schemas table to set required: false for the has_children field

DO $$
DECLARE
  current_schema JSONB;
  updated_schema JSONB;
  step_index INT;
  field_index INT;
  step JSONB;
  field JSONB;
  steps_array JSONB;
BEGIN
  -- Get the current registration form schema
  SELECT json INTO current_schema
  FROM public.form_schemas
  WHERE id = 'registration'
  ORDER BY version DESC
  LIMIT 1;

  IF current_schema IS NULL THEN
    RAISE NOTICE 'No registration form schema found';
    RETURN;
  END IF;

  -- Extract steps array
  steps_array := current_schema->'steps';

  IF steps_array IS NULL OR jsonb_typeof(steps_array) != 'array' THEN
    RAISE NOTICE 'No steps array found in schema';
    RETURN;
  END IF;

  -- Initialize updated schema
  updated_schema := current_schema;

  -- Loop through all steps
  FOR step_index IN 0..jsonb_array_length(steps_array) - 1 LOOP
    step := steps_array->step_index;
    
    -- Check if step has fields
    IF step->'fields' IS NOT NULL AND jsonb_typeof(step->'fields') = 'array' THEN
      -- Loop through all fields in this step
      FOR field_index IN 0..jsonb_array_length(step->'fields') - 1 LOOP
        field := step->'fields'->field_index;
        
        -- Check if this is the has_children field
        IF (field->>'name' = 'has_children' OR field->>'key' = 'has_children') THEN
          -- Set required to false
          field := field || '{"required": false}'::jsonb;
          
          -- Update the field in the step
          step := jsonb_set(
            step,
            ARRAY['fields', field_index::text],
            field
          );
          
          -- Update the step in the steps array
          updated_schema := jsonb_set(
            updated_schema,
            ARRAY['steps', step_index::text],
            step
          );
          
          RAISE NOTICE 'Updated has_children field to optional in step %', step_index;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Update the form schema in the database
  -- Get the latest version
  UPDATE public.form_schemas
  SET 
    json = updated_schema,
    version = version + 1,
    created_at = NOW()
  WHERE id = 'registration'
  AND version = (
    SELECT MAX(version) 
    FROM public.form_schemas 
    WHERE id = 'registration'
  );

  RAISE NOTICE 'Successfully updated registration form schema - has_children is now optional';
END $$;


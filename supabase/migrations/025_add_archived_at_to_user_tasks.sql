-- Add archived_at column to user_tasks table
-- This allows tasks to be archived when marked as done, 
-- while still counting towards progress

ALTER TABLE public.user_tasks 
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Create index for efficient filtering of archived vs active tasks
CREATE INDEX IF NOT EXISTS idx_user_tasks_archived 
  ON public.user_tasks(user_id, archived_at) 
  WHERE archived_at IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.user_tasks.archived_at IS 
  'Timestamp when task was archived (marked as done). NULL means task is active (visible in essentials list).';


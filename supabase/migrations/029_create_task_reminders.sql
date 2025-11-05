-- Create task_reminders table for email reminders
CREATE TABLE IF NOT EXISTS public.task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL, -- Task ID (1-5 for essentials)
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_task_reminders_user_task 
  ON public.task_reminders(user_id, task_id);

CREATE INDEX IF NOT EXISTS idx_task_reminders_scheduled_status 
  ON public.task_reminders(scheduled_at, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_task_reminders_status 
  ON public.task_reminders(status) 
  WHERE status = 'pending';

-- Updated_at trigger
CREATE TRIGGER trg_task_reminders_updated_at
  BEFORE UPDATE ON public.task_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reminders
CREATE POLICY "Users can view their own reminders"
  ON public.task_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reminders
CREATE POLICY "Users can insert their own reminders"
  ON public.task_reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update their own reminders"
  ON public.task_reminders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own reminders"
  ON public.task_reminders
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.task_reminders IS 'Stores task reminders for email notifications';
COMMENT ON COLUMN public.task_reminders.scheduled_at IS 'When the reminder should be sent';
COMMENT ON COLUMN public.task_reminders.status IS 'pending, sent, or cancelled';
COMMENT ON COLUMN public.task_reminders.sent_at IS 'When the reminder email was actually sent';


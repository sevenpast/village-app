-- Migration: Create document reminders table for Smart Reminders & Expiry Tracking
-- This allows users to track important deadlines from their documents (visa expiry, insurance renewal, contract deadlines)
-- Created: 2025-01-11

-- Table: document_reminders
-- Stores reminders for document deadlines/expiry dates
CREATE TABLE IF NOT EXISTS public.document_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('30_days', '14_days', '7_days', '1_day')),
  reminder_date TIMESTAMPTZ NOT NULL, -- When the reminder should be sent
  deadline_date TIMESTAMPTZ NOT NULL, -- The actual deadline/expiry date
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'snoozed', 'completed', 'cancelled')),
  snoozed_until TIMESTAMPTZ, -- If snoozed, when to show again
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_reminders_user_id ON public.document_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_document_reminders_document_id ON public.document_reminders(document_id);
CREATE INDEX IF NOT EXISTS idx_document_reminders_reminder_date ON public.document_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_document_reminders_status ON public.document_reminders(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_document_reminders_deadline_date ON public.document_reminders(deadline_date);
CREATE INDEX IF NOT EXISTS idx_document_reminders_user_status ON public.document_reminders(user_id, status, reminder_date);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_document_reminders_updated_at ON public.document_reminders;
CREATE TRIGGER trg_document_reminders_updated_at
BEFORE UPDATE ON public.document_reminders
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.document_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_reminders

-- Policy: Users can view their own reminders
CREATE POLICY "Users can view own document reminders"
ON public.document_reminders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert their own reminders
CREATE POLICY "Users can insert own document reminders"
ON public.document_reminders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own reminders
CREATE POLICY "Users can update own document reminders"
ON public.document_reminders FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own reminders
CREATE POLICY "Users can delete own document reminders"
ON public.document_reminders FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE public.document_reminders IS 'Stores reminders for document deadlines and expiry dates';
COMMENT ON COLUMN public.document_reminders.reminder_type IS 'Type of reminder: 30_days, 14_days, 7_days, or 1_day before deadline';
COMMENT ON COLUMN public.document_reminders.reminder_date IS 'When the reminder should be sent (calculated as deadline_date minus reminder_type days)';
COMMENT ON COLUMN public.document_reminders.deadline_date IS 'The actual deadline or expiry date from the document';
COMMENT ON COLUMN public.document_reminders.status IS 'Reminder status: pending, sent, snoozed, completed, or cancelled';
COMMENT ON COLUMN public.document_reminders.snoozed_until IS 'If reminder is snoozed, when to show it again';



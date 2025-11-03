-- Migration: Create documents table for Document Vault
-- This table stores metadata for documents uploaded to the vault

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  document_type TEXT DEFAULT 'other',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  confidence NUMERIC(3, 2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  extracted_fields JSONB DEFAULT '{}'::JSONB,
  language TEXT DEFAULT 'en' CHECK (language IN ('de', 'fr', 'it', 'en')),
  requires_review BOOLEAN DEFAULT true,
  thumbnail_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_active ON public.documents(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_processing ON public.documents(processing_status) WHERE deleted_at IS NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents table

-- Policy: Users can view their own documents (non-deleted only)
CREATE POLICY "Users can view own documents"
ON public.documents FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Policy: Users can insert their own documents
CREATE POLICY "Users can insert own documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
ON public.documents FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete (soft delete) their own documents
CREATE POLICY "Users can delete own documents"
ON public.documents FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Note: We use UPDATE for soft delete (setting deleted_at)
-- For hard delete, use the admin client or service role key


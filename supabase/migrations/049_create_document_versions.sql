-- Migration: Create document versions table for version tracking and history
-- This allows users to track multiple versions of the same document and compare changes
-- Created: 2025-01-11

-- Table: document_versions
-- Stores version history for documents
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES public.document_versions(id) ON DELETE SET NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary TEXT, -- User-provided summary of changes
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional version metadata (file_size, mime_type, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure only one current version per document
  CONSTRAINT unique_current_version UNIQUE (document_id, is_current) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON public.document_versions(document_id, version_number);
CREATE INDEX IF NOT EXISTS idx_document_versions_parent_version_id ON public.document_versions(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_is_current ON public.document_versions(document_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_by ON public.document_versions(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_at ON public.document_versions(uploaded_at DESC);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_document_versions_updated_at ON public.document_versions;
CREATE TRIGGER trg_document_versions_updated_at
BEFORE UPDATE ON public.document_versions
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Function to automatically set version_number based on existing versions
CREATE OR REPLACE FUNCTION public.get_next_version_number(p_document_id UUID)
RETURNS INTEGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO max_version
  FROM public.document_versions
  WHERE document_id = p_document_id;
  
  RETURN max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure only one current version per document
CREATE OR REPLACE FUNCTION public.ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a version as current, unset all other current versions for this document
  IF NEW.is_current = true THEN
    UPDATE public.document_versions
    SET is_current = false
    WHERE document_id = NEW.document_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one current version per document
DROP TRIGGER IF EXISTS trg_ensure_single_current_version ON public.document_versions;
CREATE TRIGGER trg_ensure_single_current_version
BEFORE INSERT OR UPDATE ON public.document_versions
FOR EACH ROW
WHEN (NEW.is_current = true)
EXECUTE FUNCTION public.ensure_single_current_version();

-- Enable RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_versions

-- Policy: Users can view versions for their own documents
CREATE POLICY "Users can view own document versions"
ON public.document_versions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Policy: Users can insert versions for their own documents
CREATE POLICY "Users can insert own document versions"
ON public.document_versions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
  AND uploaded_by = auth.uid()
);

-- Policy: Users can update versions for their own documents
CREATE POLICY "Users can update own document versions"
ON public.document_versions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Policy: Users can delete versions for their own documents
CREATE POLICY "Users can delete own document versions"
ON public.document_versions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Add comments for documentation
COMMENT ON TABLE public.document_versions IS 'Stores version history for documents, allowing users to track changes and restore previous versions';
COMMENT ON COLUMN public.document_versions.version_number IS 'Sequential version number (1, 2, 3, ...) for this document';
COMMENT ON COLUMN public.document_versions.parent_version_id IS 'Reference to the parent version (for version tree/history)';
COMMENT ON COLUMN public.document_versions.is_current IS 'Whether this is the current/active version of the document';
COMMENT ON COLUMN public.document_versions.change_summary IS 'User-provided description of changes in this version';
COMMENT ON COLUMN public.document_versions.metadata IS 'Additional version metadata (file_size, mime_type, extracted_fields snapshot, etc.)';



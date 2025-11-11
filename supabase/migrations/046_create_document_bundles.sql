-- Migration: Create document bundles tables for persistent bundling feature
-- This allows users to create named bundles of documents that can be reused
-- Created: 2025-01-10

-- Table: document_bundles
-- Stores bundle metadata (name, description, etc.)
CREATE TABLE IF NOT EXISTS public.document_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: bundle_documents
-- Junction table linking bundles to documents
CREATE TABLE IF NOT EXISTS public.bundle_documents (
  bundle_id UUID NOT NULL REFERENCES public.document_bundles(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bundle_id, document_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bundles_user_id ON public.document_bundles(user_id);
CREATE INDEX IF NOT EXISTS idx_bundles_user_created ON public.document_bundles(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bundle_documents_bundle_id ON public.bundle_documents(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_documents_document_id ON public.bundle_documents(document_id);

-- Updated_at trigger for document_bundles
DROP TRIGGER IF EXISTS trg_bundles_updated_at ON public.document_bundles;
CREATE TRIGGER trg_bundles_updated_at
BEFORE UPDATE ON public.document_bundles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.document_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_bundles

-- Policy: Users can view their own bundles
CREATE POLICY "Users can view own bundles"
ON public.document_bundles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert their own bundles
CREATE POLICY "Users can insert own bundles"
ON public.document_bundles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own bundles
CREATE POLICY "Users can update own bundles"
ON public.document_bundles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own bundles
CREATE POLICY "Users can delete own bundles"
ON public.document_bundles FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for bundle_documents

-- Policy: Users can view bundle_documents for their own bundles
CREATE POLICY "Users can view own bundle documents"
ON public.bundle_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.document_bundles
    WHERE document_bundles.id = bundle_documents.bundle_id
    AND document_bundles.user_id = auth.uid()
  )
);

-- Policy: Users can insert bundle_documents for their own bundles
CREATE POLICY "Users can insert own bundle documents"
ON public.bundle_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.document_bundles
    WHERE document_bundles.id = bundle_documents.bundle_id
    AND document_bundles.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = bundle_documents.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Policy: Users can delete bundle_documents from their own bundles
CREATE POLICY "Users can delete own bundle documents"
ON public.bundle_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.document_bundles
    WHERE document_bundles.id = bundle_documents.bundle_id
    AND document_bundles.user_id = auth.uid()
  )
);

-- Add comments for documentation
COMMENT ON TABLE public.document_bundles IS 'Stores user-created bundles of documents for easy reuse';
COMMENT ON TABLE public.bundle_documents IS 'Junction table linking bundles to their documents';
COMMENT ON COLUMN public.document_bundles.bundle_name IS 'User-defined name for the bundle';
COMMENT ON COLUMN public.document_bundles.description IS 'Optional description of the bundle';


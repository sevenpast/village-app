-- Migration: Link apartment viewings to documents from vault
-- This allows users to attach documents (e.g., photos, contracts) to apartment viewings
-- Created: 2025-01-10

-- Junction table linking viewings to documents
CREATE TABLE IF NOT EXISTS public.viewing_documents (
  viewing_id UUID NOT NULL REFERENCES public.apartment_viewings(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (viewing_id, document_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_viewing_documents_viewing_id ON public.viewing_documents(viewing_id);
CREATE INDEX IF NOT EXISTS idx_viewing_documents_document_id ON public.viewing_documents(document_id);

-- Enable RLS
ALTER TABLE public.viewing_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for viewing_documents

-- Policy: Users can view viewing_documents for their own viewings
CREATE POLICY "Users can view own viewing documents"
ON public.viewing_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.apartment_viewings
    WHERE apartment_viewings.id = viewing_documents.viewing_id
    AND apartment_viewings.user_id = auth.uid()
  )
);

-- Policy: Users can insert viewing_documents for their own viewings and documents
CREATE POLICY "Users can insert own viewing documents"
ON public.viewing_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.apartment_viewings
    WHERE apartment_viewings.id = viewing_documents.viewing_id
    AND apartment_viewings.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = viewing_documents.document_id
    AND documents.user_id = auth.uid()
    AND documents.deleted_at IS NULL
  )
);

-- Policy: Users can delete viewing_documents from their own viewings
CREATE POLICY "Users can delete own viewing documents"
ON public.viewing_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.apartment_viewings
    WHERE apartment_viewings.id = viewing_documents.viewing_id
    AND apartment_viewings.user_id = auth.uid()
  )
);

-- Add comments for documentation
COMMENT ON TABLE public.viewing_documents IS 'Junction table linking apartment viewings to documents from the vault';
COMMENT ON COLUMN public.viewing_documents.viewing_id IS 'Reference to the apartment viewing';
COMMENT ON COLUMN public.viewing_documents.document_id IS 'Reference to the document from the vault';


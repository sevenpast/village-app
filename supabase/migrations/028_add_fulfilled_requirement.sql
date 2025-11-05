-- Migration: Add fulfilled_requirement column to documents table
-- This allows documents to track which specific requirement they fulfill,
-- enabling precise 1:1 matching instead of just type-based matching

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS fulfilled_requirement TEXT;

-- Index for faster requirement-based queries
CREATE INDEX IF NOT EXISTS idx_documents_fulfilled_requirement 
ON public.documents(fulfilled_requirement) 
WHERE deleted_at IS NULL AND fulfilled_requirement IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.documents.fulfilled_requirement IS 
'Stores the exact requirement text that this document fulfills, enabling precise requirement-to-document matching';


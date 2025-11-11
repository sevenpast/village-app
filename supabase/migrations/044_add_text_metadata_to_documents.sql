-- Migration: Add text_metadata column for PDF extraction metadata
-- This stores detailed information about extracted text including page breakdown and statistics

-- Add text_metadata column to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS text_metadata JSONB DEFAULT NULL;

-- Add index for text metadata queries
CREATE INDEX IF NOT EXISTS idx_documents_text_metadata ON public.documents USING GIN(text_metadata) WHERE text_metadata IS NOT NULL;

-- Update the column names to be consistent
-- Change file_name to name for consistency with the API
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing records if name column is empty
UPDATE public.documents
SET name = file_name
WHERE name IS NULL OR name = '';

-- Change mime_type to content_type for consistency
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS content_type TEXT;

-- Update existing records if content_type column is empty
UPDATE public.documents
SET content_type = mime_type
WHERE content_type IS NULL OR content_type = '';

-- Add comments for documentation
COMMENT ON COLUMN public.documents.text_metadata IS 'Stores PDF extraction metadata including page breakdown, statistics, and extraction timestamp';
COMMENT ON COLUMN public.documents.extracted_text IS 'Full text content extracted from the document (PDF)';
COMMENT ON COLUMN public.documents.name IS 'Display name of the document';
COMMENT ON COLUMN public.documents.content_type IS 'MIME type of the document (e.g., application/pdf)';
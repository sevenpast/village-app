-- Migration: Add file_hash column to documents table for duplicate detection
-- This allows us to detect exact duplicates by comparing SHA256 hashes

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create index for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON public.documents(file_hash) WHERE file_hash IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.documents.file_hash IS 'SHA256 hash of the file content for duplicate detection';


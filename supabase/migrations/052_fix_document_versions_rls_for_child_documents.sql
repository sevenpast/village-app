-- Migration: Fix RLS policies for document_versions to handle child documents
-- Problem: RLS policies only check document_id, but versions can reference child documents via metadata.new_document_id
-- Solution: Extend RLS policies to also check if the user owns documents referenced in metadata

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can insert own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can update own document versions" ON public.document_versions;
DROP POLICY IF EXISTS "Users can delete own document versions" ON public.document_versions;

-- Policy: Users can view versions for their own documents OR child documents referenced in metadata
CREATE POLICY "Users can view own document versions"
ON public.document_versions FOR SELECT
TO authenticated
USING (
  -- Check if user owns the document_id (parent document)
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
  OR
  -- Check if user owns a child document referenced in metadata.new_document_id
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id::text = document_versions.metadata->>'new_document_id'
    AND documents.user_id = auth.uid()
  )
  OR
  -- Check if user owns a parent document referenced in metadata.parent_document_id
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id::text = document_versions.metadata->>'parent_document_id'
    AND documents.user_id = auth.uid()
  )
);

-- Policy: Users can insert versions for their own documents
CREATE POLICY "Users can insert own document versions"
ON public.document_versions FOR INSERT
TO authenticated
WITH CHECK (
  (
    -- Check if user owns the document_id (parent document)
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
    OR
    -- Check if user owns a child document referenced in metadata.new_document_id
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id::text = document_versions.metadata->>'new_document_id'
      AND documents.user_id = auth.uid()
    )
    OR
    -- Check if user owns a parent document referenced in metadata.parent_document_id
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id::text = document_versions.metadata->>'parent_document_id'
      AND documents.user_id = auth.uid()
    )
  )
  AND uploaded_by = auth.uid()
);

-- Policy: Users can update versions for their own documents
CREATE POLICY "Users can update own document versions"
ON public.document_versions FOR UPDATE
TO authenticated
USING (
  -- Check if user owns the document_id (parent document)
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
  OR
  -- Check if user owns a child document referenced in metadata.new_document_id
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id::text = document_versions.metadata->>'new_document_id'
    AND documents.user_id = auth.uid()
  )
  OR
  -- Check if user owns a parent document referenced in metadata.parent_document_id
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id::text = document_versions.metadata->>'parent_document_id'
    AND documents.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same checks for WITH CHECK clause
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id::text = document_versions.metadata->>'new_document_id'
    AND documents.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id::text = document_versions.metadata->>'parent_document_id'
    AND documents.user_id = auth.uid()
  )
);

-- Policy: Users can delete versions for their own documents
CREATE POLICY "Users can delete own document versions"
ON public.document_versions FOR DELETE
TO authenticated
USING (
  -- Check if user owns the document_id (parent document)
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
  OR
  -- Check if user owns a child document referenced in metadata.new_document_id
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id::text = document_versions.metadata->>'new_document_id'
    AND documents.user_id = auth.uid()
  )
  OR
  -- Check if user owns a parent document referenced in metadata.parent_document_id
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id::text = document_versions.metadata->>'parent_document_id'
    AND documents.user_id = auth.uid()
  )
);


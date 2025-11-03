-- Migration: Add DELETE policy for documents table
-- This allows users to hard delete their own documents

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON public.documents FOR DELETE
TO authenticated
USING (user_id = auth.uid());
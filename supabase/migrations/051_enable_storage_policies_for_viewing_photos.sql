-- Migration: Enable Storage Policies for viewing_photos
-- This ensures users can upload photos to the documents bucket under their user_id/viewing_photos/ path

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- Policy: Users can upload their own viewing photos
-- This policy allows authenticated users to upload files to the documents bucket
-- as long as the path starts with their user_id
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own viewing photos
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own viewing photos
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: These policies work for any path structure under {user_id}/...
-- This includes:
-- - {user_id}/documents/... (for document vault)
-- - {user_id}/viewing_photos/... (for apartment viewing photos)
-- - {user_id}/avatars/... (if needed)


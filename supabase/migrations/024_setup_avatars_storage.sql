-- Migration: Setup Storage Bucket for Avatars
-- Note: Storage buckets cannot be created via SQL directly
-- To create the bucket, run in Supabase Dashboard → Storage:
-- 1. Create bucket named "avatars"
-- 2. Set it to "Public bucket" (since avatars need to be accessible)
-- 3. Apply the policies below

-- Storage Policies (RLS for Storage)
-- These policies ensure users can only upload/access their own avatars

-- Policy: Users can upload their own avatar
CREATE POLICY IF NOT EXISTS "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own avatars (and public avatars)
CREATE POLICY IF NOT EXISTS "Users can view avatars"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'avatars'
);

-- Policy: Users can update their own avatar
CREATE POLICY IF NOT EXISTS "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY IF NOT EXISTS "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);


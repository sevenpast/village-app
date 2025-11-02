-- Migration: Setup Storage Bucket for Documents
-- Note: Storage buckets cannot be created via SQL directly
-- This migration provides instructions and sets up policies
-- 
-- To create the bucket, run in Supabase Dashboard → Storage:
-- 1. Click "New bucket"
-- 2. Name: "documents"
-- 3. Public: false (private bucket)
-- 4. File size limit: 10485760 (10MB)
-- 5. Allowed MIME types: application/pdf,image/jpeg,image/png,image/heic

-- Storage Policies (RLS for Storage)
-- These policies will be applied once the bucket is created

-- Policy: Users can upload their own documents
-- CREATE POLICY "Users can upload documents"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'documents' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: Users can view their own documents
-- CREATE POLICY "Users can view own documents"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'documents' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: Users can delete their own documents
-- CREATE POLICY "Users can delete own documents"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'documents' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Note: Run this after creating the bucket in Supabase Dashboard


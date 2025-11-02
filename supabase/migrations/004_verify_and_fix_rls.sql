-- Verify and Fix RLS Policies
-- Execute this in Supabase Dashboard → SQL Editor

-- 1. Check current RLS status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'RLS enabled' ELSE 'RLS disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('form_schemas', 'dictionaries', 'email_templates', 'feature_flags', 'municipalities')
ORDER BY tablename;

-- 2. Check existing policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('form_schemas', 'dictionaries', 'email_templates', 'feature_flags', 'municipalities')
ORDER BY tablename, policyname;

-- 3. Ensure public read access for config tables
-- Form Schemas
DROP POLICY IF EXISTS "config read public" ON public.form_schemas;
CREATE POLICY "config read public"
  ON public.form_schemas
  FOR SELECT
  TO public
  USING (true);

-- Dictionaries  
DROP POLICY IF EXISTS "dictionaries read public" ON public.dictionaries;
CREATE POLICY "dictionaries read public"
  ON public.dictionaries
  FOR SELECT
  TO public
  USING (true);

-- Email Templates
DROP POLICY IF EXISTS "email_templates read public" ON public.email_templates;
CREATE POLICY "email_templates read public"
  ON public.email_templates
  FOR SELECT
  TO public
  USING (true);

-- Feature Flags
DROP POLICY IF EXISTS "feature_flags read public" ON public.feature_flags;
CREATE POLICY "feature_flags read public"
  ON public.feature_flags
  FOR SELECT
  TO public
  USING (true);

-- Municipalities
DROP POLICY IF EXISTS "municipalities read public" ON public.municipalities;
CREATE POLICY "municipalities read public"
  ON public.municipalities
  FOR SELECT
  TO public
  USING (true);

-- 4. Test query (should return data)
SELECT id, version FROM public.form_schemas LIMIT 1;
SELECT key, locale FROM public.dictionaries LIMIT 1;






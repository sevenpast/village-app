-- Fix RLS Policies: Ensure public read access for config tables
-- Execute this in Supabase Dashboard → SQL Editor

-- Disable RLS temporarily, then re-enable with correct policies
-- This ensures anonymous users (anon key) can read config tables

-- 1. Form Schemas - Public Read
ALTER TABLE public.form_schemas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config read public" ON public.form_schemas;
CREATE POLICY "config read public"
  ON public.form_schemas
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Dictionaries - Public Read  
ALTER TABLE public.dictionaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dictionaries read public" ON public.dictionaries;
CREATE POLICY "dictionaries read public"
  ON public.dictionaries
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Email Templates - Public Read
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates read public" ON public.email_templates;
CREATE POLICY "email_templates read public"
  ON public.email_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Feature Flags - Public Read
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags read public" ON public.feature_flags;
CREATE POLICY "feature_flags read public"
  ON public.feature_flags
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Municipalities - Public Read
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "municipalities read public" ON public.municipalities;
CREATE POLICY "municipalities read public"
  ON public.municipalities
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6. Verify: Test queries (should work now)
SELECT 'form_schemas' as table_name, COUNT(*) as row_count FROM public.form_schemas
UNION ALL
SELECT 'dictionaries', COUNT(*) FROM public.dictionaries
UNION ALL
SELECT 'email_templates', COUNT(*) FROM public.email_templates
UNION ALL
SELECT 'feature_flags', COUNT(*) FROM public.feature_flags;






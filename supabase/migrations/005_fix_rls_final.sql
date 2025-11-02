-- Final Fix: Ensure Config Tables are publicly readable
-- Execute this in Supabase Dashboard → SQL Editor

-- CRITICAL: Config tables MUST be readable by anon role
-- This is needed for config-driven architecture

-- Form Schemas
ALTER TABLE public.form_schemas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config read public" ON public.form_schemas;
DROP POLICY IF EXISTS "Public read access" ON public.form_schemas;

CREATE POLICY "Public read access"
  ON public.form_schemas
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

-- Dictionaries
ALTER TABLE public.dictionaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dictionaries read public" ON public.dictionaries;
DROP POLICY IF EXISTS "Public read access" ON public.dictionaries;

CREATE POLICY "Public read access"
  ON public.dictionaries
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

-- Email Templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates read public" ON public.email_templates;
DROP POLICY IF EXISTS "Public read access" ON public.email_templates;

CREATE POLICY "Public read access"
  ON public.email_templates
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

-- Feature Flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags read public" ON public.feature_flags;
DROP POLICY IF EXISTS "Public read access" ON public.feature_flags;

CREATE POLICY "Public read access"
  ON public.feature_flags
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

-- Municipalities
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "municipalities read public" ON public.municipalities;
DROP POLICY IF EXISTS "Public read access" ON public.municipalities;

CREATE POLICY "Public read access"
  ON public.municipalities
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

-- Verify: Test queries (should return data without errors)
SELECT 
  'form_schemas' as table_name, 
  COUNT(*) as rows,
  '✅ Readable' as status
FROM public.form_schemas
UNION ALL
SELECT 'dictionaries', COUNT(*), '✅ Readable' FROM public.dictionaries
UNION ALL
SELECT 'email_templates', COUNT(*), '✅ Readable' FROM public.email_templates
UNION ALL
SELECT 'feature_flags', COUNT(*), '✅ Readable' FROM public.feature_flags;






-- Fix RLS Policies for Config Tables
-- These tables need to be publicly readable for config-driven architecture

-- Form Schemas: Public Read
drop policy if exists "config read public" on public.form_schemas;
create policy "config read public"
  on public.form_schemas for select
  using (true);

-- Dictionaries: Public Read
drop policy if exists "dictionaries read public" on public.dictionaries;
create policy "dictionaries read public"
  on public.dictionaries for select
  using (true);

-- Email Templates: Public Read
drop policy if exists "email_templates read public" on public.email_templates;
create policy "email_templates read public"
  on public.email_templates for select
  using (true);

-- Feature Flags: Public Read
drop policy if exists "feature_flags read public" on public.feature_flags;
create policy "feature_flags read public"
  on public.feature_flags for select
  using (true);

-- Municipalities: Public Read
drop policy if exists "municipalities read public" on public.municipalities;
create policy "municipalities read public"
  on public.municipalities for select
  using (true);

-- Events: Allow authenticated inserts (for event tracking)
drop policy if exists "events insert authenticated" on public.events;
create policy "events insert authenticated"
  on public.events for insert
  with check (auth.role() = 'authenticated');






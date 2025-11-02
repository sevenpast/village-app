-- Village App: Initial Schema Migration
-- Execute this in Supabase Dashboard → SQL Editor

-- =========================
-- Extensions
-- =========================
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists vector;

-- =========================
-- Profiles
-- =========================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country text,
  language text,
  living_situation text,
  current_situation text,
  address_street text,
  address_number text,
  plz text,
  city text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- optional interests via junction (empfohlen)
create table if not exists public.user_interests (
  user_id uuid references auth.users(id) on delete cascade,
  interest_key text not null,
  primary key (user_id, interest_key)
);

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- =========================
-- Password Resets (custom)
-- =========================
create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null, -- store ONLY hash
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  request_ip inet
);

-- Ein aktives Reset je User erzwingen
create unique index if not exists uq_password_resets_user_active
  on public.password_resets(user_id)
  where used_at is null;

-- token_hash uniqueness (kollisionsschutz)
create unique index if not exists uq_password_resets_tokenhash
  on public.password_resets(token_hash);

-- schneller Cleanup/Abfragen
create index if not exists idx_password_resets_expires_at
  on public.password_resets(expires_at);

-- =========================
-- Config-Driven Artefakte
-- =========================
create table if not exists public.form_schemas (
  id text primary key,
  version int not null default 1,
  json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dictionaries (
  key text not null,
  locale text not null,
  version int not null default 1,
  items jsonb not null,
  primary key (key, locale, version)
);

create table if not exists public.email_templates (
  key text not null,
  locale text not null,
  version int not null default 1,
  mjml text,
  html text,
  primary key (key, locale, version)
);

create table if not exists public.feature_flags (
  key text primary key,
  value jsonb,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- =========================
-- Events (persistentes Log)
-- =========================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  retries int not null default 0
);

create index if not exists idx_events_name on public.events(name);
create index if not exists idx_events_created_at on public.events(created_at);

-- =========================
-- Tasks Engine (v1)
-- =========================
-- ENUM für Status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('todo','in_progress','blocked','done');
  END IF;
END
$$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority int not null default 3,
  module_id text not null,          -- z.B. "welcome_to_switzerland"
  visibility jsonb,                 -- oder rule_expr text (wenn string-basiert)
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_module on public.tasks(module_id);

create table if not exists public.user_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  status task_status not null default 'todo',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create index if not exists idx_user_tasks_user_status
  on public.user_tasks(user_id, status);

drop trigger if exists trg_user_tasks_updated_at on public.user_tasks;
create trigger trg_user_tasks_updated_at
before update on public.user_tasks
for each row execute procedure public.set_updated_at();

-- =========================
-- (Optional) Municipalities v1 (Lookup)
-- =========================
create table if not exists public.municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  canton text,
  postal_codes text[],           -- oder normalisiert in eigene Tabelle
  contact_info jsonb,
  office_hours jsonb,
  website text
);

-- =========================
-- RLS Policies
-- =========================
alter table public.profiles enable row level security;
drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
  on public.profiles for select
  using (auth.uid() = user_id);
drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = user_id);
drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = user_id);

alter table public.user_interests enable row level security;
drop policy if exists "User interests owned" on public.user_interests;
create policy "User interests owned"
  on public.user_interests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.user_tasks enable row level security;
drop policy if exists "User tasks owned" on public.user_tasks;
create policy "User tasks owned"
  on public.user_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.password_resets enable row level security;
drop policy if exists "Password resets are readable by owner" on public.password_resets;
create policy "Password resets are readable by owner"
  on public.password_resets for select
  using (auth.uid() = user_id);

-- Konfig-Tabellen: Public Read (für Config-Driven Architecture)
alter table public.form_schemas enable row level security;
drop policy if exists "config read public" on public.form_schemas;
create policy "config read public"
  on public.form_schemas for select
  using (true);

alter table public.dictionaries enable row level security;
drop policy if exists "dictionaries read public" on public.dictionaries;
create policy "dictionaries read public"
  on public.dictionaries for select
  using (true);

alter table public.email_templates enable row level security;
drop policy if exists "email_templates read public" on public.email_templates;
create policy "email_templates read public"
  on public.email_templates for select
  using (true);

alter table public.feature_flags enable row level security;
drop policy if exists "feature_flags read public" on public.feature_flags;
create policy "feature_flags read public"
  on public.feature_flags for select
  using (true);

alter table public.events enable row level security;
drop policy if exists "events insert authenticated" on public.events;
create policy "events insert authenticated"
  on public.events for insert
  with check (auth.role() = 'authenticated');

-- Municipalities: Public read
alter table public.municipalities enable row level security;
drop policy if exists "municipalities read public" on public.municipalities;
create policy "municipalities read public"
  on public.municipalities for select
  using (true);







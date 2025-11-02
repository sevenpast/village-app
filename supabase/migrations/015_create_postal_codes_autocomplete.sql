-- Migration: Create postal codes and place aliases tables for Swiss address autocomplete
-- This provides a fast, fuzzy-search-based autocomplete for postal codes and places

-- Enable required extensions
create extension if not exists pg_trgm;
create extension if not exists postgis;

-- =========================
-- Postal Codes Table
-- =========================
create table if not exists public.postal_codes (
  id bigserial primary key,
  postalcode text not null,
  place_name text not null,
  municipality_name text not null,
  bfs_number int not null,
  canton_abbr text not null,
  lat double precision,
  lng double precision,
  
  -- Normalized search fields (without umlauts, lowercase)
  -- These are computed columns for fuzzy search
  place_name_norm text generated always as (
    translate(lower(place_name), 'äöüéèàâêîôûç', 'aoueeaaeiouc')
  ) stored,
  municipality_name_norm text generated always as (
    translate(lower(municipality_name), 'äöüéèàâêîôûç', 'aoueeaaeiouc')
  ) stored,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================
-- Place Aliases Table (for multilingual/alternative place names)
-- =========================
create table if not exists public.place_aliases (
  id bigserial primary key,
  bfs_number int not null,
  alias text not null,
  
  -- Normalized alias for fuzzy search
  alias_norm text generated always as (
    translate(lower(alias), 'äöüéèàâêîôûç', 'aoueeaaeiouc')
  ) stored,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================
-- Indexes for fast search
-- =========================

-- Exact match on postal code (most common use case)
create index if not exists idx_postalcode_exact 
  on public.postal_codes (postalcode);

-- Trigram fuzzy search indexes (for place and municipality names)
create index if not exists idx_place_trgm
  on public.postal_codes using gin (place_name_norm gin_trgm_ops);

create index if not exists idx_municipality_trgm
  on public.postal_codes using gin (municipality_name_norm gin_trgm_ops);

create index if not exists idx_alias_trgm
  on public.place_aliases using gin (alias_norm gin_trgm_ops);

-- Index for joining place_aliases with postal_codes
create index if not exists idx_place_aliases_bfs
  on public.place_aliases (bfs_number);

-- Index for BFS number lookups
create index if not exists idx_postal_codes_bfs
  on public.postal_codes (bfs_number);

-- =========================
-- RPC Function: autocomplete_places
-- =========================
create or replace function public.autocomplete_places(
  q text,
  limit_count int default 10
)
returns table (
  postalcode text,
  place_name text,
  municipality_name text,
  bfs_number int,
  canton_abbr text,
  lat double precision,
  lng double precision,
  score real
)
language sql
stable
as $$
  with inp as (
    select translate(lower(q), 'äöüéèàâêîôûç', 'aoueeaaeiouc') as term
  ),
  
  -- Strategy 1: Exact PLZ match (highest priority, score 1.0)
  plz as (
    select 
      p.postalcode,
      p.place_name,
      p.municipality_name,
      p.bfs_number,
      p.canton_abbr,
      p.lat,
      p.lng,
      1.0::real as score
    from public.postal_codes p, inp
    where q ~ '^\d{4}$' and p.postalcode = q
    order by p.place_name
    limit limit_count
  ),
  
  -- Strategy 2: Fuzzy search on place/municipality names
  places as (
    select 
      p.postalcode,
      p.place_name,
      p.municipality_name,
      p.bfs_number,
      p.canton_abbr,
      p.lat,
      p.lng,
      greatest(
        similarity(p.place_name_norm, (select term from inp)),
        similarity(p.municipality_name_norm, (select term from inp))
      ) as score
    from public.postal_codes p, inp
    where q !~ '^\d{4}$'
      and (
        p.place_name_norm % (select term from inp)
        or p.municipality_name_norm % (select term from inp)
      )
    order by score desc
    limit limit_count
  ),
  
  -- Strategy 3: Search in aliases (multilingual/alternative names)
  aliases as (
    select 
      p.postalcode,
      p.place_name,
      p.municipality_name,
      p.bfs_number,
      p.canton_abbr,
      p.lat,
      p.lng,
      similarity(a.alias_norm, (select term from inp)) as score
    from public.place_aliases a
    join public.postal_codes p using (bfs_number), inp
    where q !~ '^\d{4}$' 
      and a.alias_norm % (select term from inp)
    order by score desc
    limit limit_count
  )
  
  -- Combine all results, remove duplicates, sort by score
  select distinct on (postalcode, place_name, municipality_name)
    postalcode,
    place_name,
    municipality_name,
    bfs_number,
    canton_abbr,
    lat,
    lng,
    score
  from (
    select * from plz
    union all
    select * from places
    union all
    select * from aliases
  ) combined
  order by postalcode, place_name, municipality_name, score desc
  limit limit_count;
$$;

-- =========================
-- RLS Policies (Read-only for all authenticated/anonymous users)
-- =========================

-- Allow read access to postal_codes
alter table public.postal_codes enable row level security;

create policy "Allow read access to postal_codes"
  on public.postal_codes
  for select
  to authenticated, anon
  using (true);

-- Allow read access to place_aliases
alter table public.place_aliases enable row level security;

create policy "Allow read access to place_aliases"
  on public.place_aliases
  for select
  to authenticated, anon
  using (true);

-- Grant execute permission on autocomplete function
grant execute on function public.autocomplete_places(text, int) to authenticated, anon;

-- =========================
-- Comments for documentation
-- =========================

comment on table public.postal_codes is 'Swiss postal codes with place and municipality information. Used for address autocomplete.';
comment on table public.place_aliases is 'Alternative/multilingual place names for fuzzy search (e.g., "Biel/Bienne", "Genève/Geneva").';
comment on function public.autocomplete_places is 'Autocomplete function for Swiss postal codes and places. Supports exact PLZ matches and fuzzy search on place/municipality names and aliases.';


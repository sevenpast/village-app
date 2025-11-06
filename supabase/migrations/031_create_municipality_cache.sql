-- Municipality Cache Table
-- Stores scraped municipality data with 4-hour TTL

create table if not exists public.municipality_cache (
  id uuid primary key default gen_random_uuid(),
  bfs_nummer integer not null unique,
  data jsonb not null,
  cached_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for fast lookups
create index if not exists idx_municipality_cache_bfs_nummer 
  on public.municipality_cache(bfs_nummer);

create index if not exists idx_municipality_cache_cached_at 
  on public.municipality_cache(cached_at);

-- Auto-cleanup old cache entries (older than 24 hours)
create or replace function public.cleanup_old_municipality_cache()
returns void as $$
begin
  delete from public.municipality_cache
  where cached_at < now() - interval '24 hours';
end;
$$ language plpgsql;

-- RLS: Public read access
alter table public.municipality_cache enable row level security;

drop policy if exists "municipality_cache read public" on public.municipality_cache;
create policy "municipality_cache read public"
  on public.municipality_cache for select
  using (true);

comment on table public.municipality_cache is 'Cache for scraped municipality data. TTL: 4 hours. Auto-cleanup after 24 hours.';


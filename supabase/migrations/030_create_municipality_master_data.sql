-- Municipality Master Data System
-- Stores official municipality data from BFS and enriched information

create table if not exists public.municipality_master_data (
  id uuid primary key default gen_random_uuid(),
  bfs_nummer integer unique not null,
  gemeinde_name text not null,
  ortsteile jsonb default '[]'::jsonb,  -- ["Böttstein", "Kleindöttingen", ...]
  kanton varchar(2) not null,
  plz text[] default '{}',
  official_website text,
  registration_pages text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for fast lookups
create index if not exists idx_municipality_bfs_nummer 
  on public.municipality_master_data(bfs_nummer);

create index if not exists idx_municipality_name 
  on public.municipality_master_data using gin(gemeinde_name gin_trgm_ops);

create index if not exists idx_municipality_ortsteile 
  on public.municipality_master_data using gin(ortsteile jsonb_path_ops);

create index if not exists idx_municipality_plz 
  on public.municipality_master_data using gin(plz);

create index if not exists idx_municipality_kanton 
  on public.municipality_master_data(kanton);

-- Updated_at trigger
create trigger trg_municipality_master_data_updated_at
before update on public.municipality_master_data
for each row execute procedure public.set_updated_at();

-- RLS: Public read access
alter table public.municipality_master_data enable row level security;

drop policy if exists "municipality_master_data read public" on public.municipality_master_data;
create policy "municipality_master_data read public"
  on public.municipality_master_data for select
  using (true);

-- Fuzzy search function for municipality resolution
create or replace function public.fuzzy_search_municipality(
  search_term text,
  threshold float default 0.6
)
returns table (
  id uuid,
  gemeinde_name text,
  ortsteil text,
  bfs_nummer integer,
  official_website text,
  registration_pages text[],
  kanton varchar(2),
  similarity float
) as $$
begin
  return query
  select 
    m.id,
    m.gemeinde_name,
    search_term as ortsteil,
    m.bfs_nummer,
    m.official_website,
    m.registration_pages,
    m.kanton,
    greatest(
      similarity(lower(m.gemeinde_name), lower(search_term)),
      (select max(similarity(lower(ortsteil::text), lower(search_term)))
       from jsonb_array_elements_text(m.ortsteile) as ortsteil)
    ) as similarity
  from public.municipality_master_data m
  where 
    similarity(lower(m.gemeinde_name), lower(search_term)) >= threshold
    or exists (
      select 1 
      from jsonb_array_elements_text(m.ortsteile) as ortsteil
      where similarity(lower(ortsteil), lower(search_term)) >= threshold
    )
  order by similarity desc
  limit 5;
end;
$$ language plpgsql;

comment on table public.municipality_master_data is 'Master data for Swiss municipalities with BFS numbers, Ortsteile, and official websites. Used for resolving user input to official municipalities.';
comment on function public.fuzzy_search_municipality is 'Fuzzy search for municipalities by name or Ortsteil. Returns matches above similarity threshold.';


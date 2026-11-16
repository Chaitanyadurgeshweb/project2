-- Chaitu Tools: schema for the NEW Supabase project (not the loco portal).
-- Run once in the SQL Editor, then run seed_stations.sql.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sections (
  short_name text primary key,       -- name used in the Station list, e.g. GVD-VR
  long_name  text not null           -- name shown in RadTx, e.g. WR2-Section (GVD-VR)
);

create table if not exists public.stations (
  station_code text primary key,     -- hyphenated code, e.g. AKV-BH
  station_id   text,
  section_short text not null references public.sections(short_name) on update cascade
);

create table if not exists public.make_aliases (
  alias     text primary key,        -- upper case, trimmed
  canonical text not null
);

create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

create table if not exists public.make_cache (
  id int primary key default 1 check (id = 1),
  fetched_at timestamptz not null default now(),
  data jsonb not null                -- { "30174": "MEDHA", ... }
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  tool text not null check (tool in ('ltt', 'radtx')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  status text not null default 'done' check (status in ('done', 'failed')),
  structure text,
  input_name text,
  input_path text,
  output_path text,
  make_source text,                  -- portal | cache
  stats jsonb,
  skipped jsonb,
  warnings jsonb,
  error text
);
create index if not exists runs_created_idx on public.runs (created_at desc);

-- Helper used by policies
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

-- Row level security: all writes go through the server with the service role.
alter table public.profiles     enable row level security;
alter table public.sections     enable row level security;
alter table public.stations     enable row level security;
alter table public.make_aliases enable row level security;
alter table public.settings     enable row level security;
alter table public.make_cache   enable row level security;
alter table public.runs         enable row level security;

create policy "own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "read sections" on public.sections for select to authenticated using (true);
create policy "read stations" on public.stations for select to authenticated using (true);
create policy "read aliases"  on public.make_aliases for select to authenticated using (true);
create policy "read settings" on public.settings for select to authenticated using (true);
create policy "own runs or admin" on public.runs for select to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Private storage buckets
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('outputs', 'outputs', false) on conflict do nothing;

-- Defaults
insert into public.settings (key, value) values
  ('primary_make', '"MEDHA"'),
  ('radtx', '{"min_percentage": 90, "min_stations": 2, "bad_stations": 3}')
on conflict (key) do nothing;

insert into public.make_aliases (alias, canonical) values
  ('MEDHA', 'MEDHA'), ('GTRONICS', 'GGTRONICS'), ('GGTRONICS', 'GGTRONICS')
on conflict (alias) do nothing;

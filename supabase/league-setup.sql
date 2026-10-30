-- Hockey Dynasty: vrai système de ligues v1
-- À exécuter dans Supabase > SQL Editor, une seule fois.
create extension if not exists pgcrypto;

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  join_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at timestamptz not null default now()
);

alter table public.leagues add column if not exists name text;
alter table public.leagues add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.leagues add column if not exists join_code text;
alter table public.leagues add column if not exists created_at timestamptz not null default now();

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'manager',
  team_id integer,
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

alter table public.league_members add column if not exists league_id uuid references public.leagues(id) on delete cascade;
alter table public.league_members add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.league_members add column if not exists role text not null default 'manager';
alter table public.league_members add column if not exists team_id integer;
alter table public.league_members add column if not exists joined_at timestamptz not null default now();

create unique index if not exists leagues_join_code_unique on public.leagues(join_code);
create unique index if not exists league_members_unique_membership on public.league_members(league_id, user_id);
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

drop policy if exists "League owners can create leagues" on public.leagues;
create policy "League owners can create leagues" on public.leagues
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "Members can view their leagues" on public.leagues;
create policy "Members can view their leagues" on public.leagues
for select to authenticated using (
  owner_id = auth.uid() or exists (
    select 1 from public.league_members m
    where m.league_id = leagues.id and m.user_id = auth.uid()
  )
);

drop policy if exists "Owners can update their leagues" on public.leagues;
create policy "Owners can update their leagues" on public.leagues
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Users can join leagues" on public.league_members;
create policy "Users can join leagues" on public.league_members
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Members can view league members" on public.league_members;
create policy "Members can view league members" on public.league_members
for select to authenticated using (
  user_id = auth.uid() or exists (
    select 1 from public.league_members mine
    where mine.league_id = league_members.league_id and mine.user_id = auth.uid()
  )
);

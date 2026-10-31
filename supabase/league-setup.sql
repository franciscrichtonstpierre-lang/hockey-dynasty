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


-- Compatibility migration: align both historical league schemas with the current app.
alter table public.leagues add column if not exists commissioner_id uuid references auth.users(id) on delete cascade;
alter table public.leagues add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.leagues add column if not exists join_code text;
update public.leagues set owner_id = commissioner_id where owner_id is null and commissioner_id is not null;
update public.leagues set commissioner_id = owner_id where commissioner_id is null and owner_id is not null;
update public.leagues
set join_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
where join_code is null or btrim(join_code) = '';
create unique index if not exists leagues_join_code_unique on public.leagues(join_code);
alter table public.leagues alter column join_code set not null;

alter table public.league_members add column if not exists manager_name text not null default 'DG';
alter table public.league_members add column if not exists team_code text;
update public.league_members
set team_code = (array['ANA','BOS','BUF','CGY','CAR','CHI','COL','CBJ','DAL','DET','EDM','FLA','LAK','MIN','MTL','NSH','NJD','NYI','NYR','OTT','PHI','PIT','SJS','SEA','STL','TBL','TOR','UTA','VAN','VGK','WSH','WPG'])[team_id + 1]
where team_code is null and team_id between 0 and 31;
create unique index if not exists league_members_unique_team
on public.league_members(league_id, team_code) where team_code is not null;

drop policy if exists "League owners can update member assignments" on public.league_members;
create policy "League owners can update member assignments" on public.league_members
for update to authenticated
using (exists (select 1 from public.leagues l where l.id = league_id and l.owner_id = auth.uid()))
with check (exists (select 1 from public.leagues l where l.id = league_id and l.owner_id = auth.uid()));

create or replace function public.find_league_by_code(p_join_code text)
returns table (id uuid, name text, join_code text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise pour rechercher une ligue.';
  end if;
  if p_join_code is null or length(trim(p_join_code)) = 0 then
    return;
  end if;
  return query
    select l.id, l.name, l.join_code
    from public.leagues l
    where upper(trim(l.join_code)) = upper(trim(p_join_code))
    limit 1;
end;
$$;
revoke all on function public.find_league_by_code(text) from public;
revoke all on function public.find_league_by_code(text) from anon;
grant execute on function public.find_league_by_code(text) to authenticated;

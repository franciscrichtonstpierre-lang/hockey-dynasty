-- UHM: comptes, ligues multiples et adhésions. Exécuter dans Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.leagues (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 3 and 80),
 commissioner_id uuid not null references auth.users(id),
 visibility text not null default 'private' check (visibility in ('public','private')),
 created_at timestamptz not null default now()
);
create table if not exists public.league_members (
 league_id uuid not null references public.leagues(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 manager_name text not null default 'DG' check (char_length(manager_name) between 2 and 40),
 team_code text not null check (team_code in ('ANA','BOS','BUF','CGY','CAR','CHI','COL','CBJ','DAL','DET','EDM','FLA','LAK','MIN','MTL','NSH','NJD','NYI','NYR','OTT','PHI','PIT','SJS','SEA','STL','TBL','TOR','UTA','VAN','VGK','WSH','WPG')),
 joined_at timestamptz not null default now(),
 primary key (league_id,user_id),
 unique (league_id,team_code)
);
create index if not exists leagues_commissioner_idx on public.leagues(commissioner_id);
create index if not exists league_members_user_idx on public.league_members(user_id);
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
create policy "Users can create their leagues" on public.leagues for insert to authenticated with check (commissioner_id=auth.uid());
create policy "Members see their leagues" on public.leagues for select to authenticated using (visibility='public' or commissioner_id=auth.uid() or exists (select 1 from public.league_members m where m.league_id=id and m.user_id=auth.uid()));
create policy "Members see roster assignments" on public.league_members for select to authenticated using (user_id=auth.uid() or exists (select 1 from public.leagues l where l.id=league_id and l.commissioner_id=auth.uid()));
-- Membership writes must be implemented by validated server-side functions, not direct browser inserts.


-- Migration for existing installations: display name chosen by each DG per league.
alter table public.league_members add column if not exists manager_name text not null default 'DG';
alter table public.league_members drop constraint if exists league_members_manager_name_length;
alter table public.league_members add constraint league_members_manager_name_length check (char_length(manager_name) between 2 and 40);

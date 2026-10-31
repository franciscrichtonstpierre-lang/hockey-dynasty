-- League-scoped coach overrides.
-- Global reference records remain read-only in game_coaches; only the league owner
-- may change this league's roster, staff assignments, roles, and ratings.
create table if not exists public.league_coach_overrides (
  league_id uuid not null references public.leagues(id) on delete cascade,
  coach_id text not null,
  season text not null default '2026-2027',
  team_code text,
  league_code text,
  role text,
  employment_status text,
  full_name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (league_id, coach_id)
);
alter table public.league_coach_overrides enable row level security;
grant select, insert, update, delete on public.league_coach_overrides to authenticated;
drop policy if exists "League members read coach overrides" on public.league_coach_overrides;
create policy "League members read coach overrides" on public.league_coach_overrides
for select to authenticated
using (exists (
  select 1 from public.league_members m
  where m.league_id=league_coach_overrides.league_id and m.user_id=auth.uid()
));
drop policy if exists "Commissioners insert coach overrides" on public.league_coach_overrides;
create policy "Commissioners insert coach overrides" on public.league_coach_overrides
for insert to authenticated
with check (updated_by=auth.uid() and exists (
  select 1 from public.leagues l
  where l.id=league_coach_overrides.league_id and l.owner_id=auth.uid()
));
drop policy if exists "Commissioners update coach overrides" on public.league_coach_overrides;
create policy "Commissioners update coach overrides" on public.league_coach_overrides
for update to authenticated
using (exists (
  select 1 from public.leagues l
  where l.id=league_coach_overrides.league_id and l.owner_id=auth.uid()
))
with check (updated_by=auth.uid() and exists (
  select 1 from public.leagues l
  where l.id=league_coach_overrides.league_id and l.owner_id=auth.uid()
));
drop policy if exists "Commissioners delete coach overrides" on public.league_coach_overrides;
create policy "Commissioners delete coach overrides" on public.league_coach_overrides
for delete to authenticated
using (exists (
  select 1 from public.leagues l
  where l.id=league_coach_overrides.league_id and l.owner_id=auth.uid()
));

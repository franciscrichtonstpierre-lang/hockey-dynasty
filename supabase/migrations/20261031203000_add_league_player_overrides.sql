-- League-scoped player overrides. The global player registry remains the reference dataset;
-- the commissioner owns edits within a league and all members can read them.
create table if not exists public.league_player_overrides (
  league_id uuid not null references public.leagues(id) on delete cascade,
  player_id text not null,
  season text not null default '2026-2027',
  team_code text,
  league_code text,
  nhl_rights_team text,
  full_name text not null,
  overall integer check (overall between 0 and 99),
  potential integer check (potential between 0 and 99),
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (league_id, player_id)
);
alter table public.league_player_overrides enable row level security;
grant select, insert, update, delete on public.league_player_overrides to authenticated;
drop policy if exists "League members read player overrides" on public.league_player_overrides;
create policy "League members read player overrides" on public.league_player_overrides
for select to authenticated
using (exists (select 1 from public.league_members m where m.league_id=league_player_overrides.league_id and m.user_id=auth.uid()));
drop policy if exists "Commissioners insert player overrides" on public.league_player_overrides;
create policy "Commissioners insert player overrides" on public.league_player_overrides
for insert to authenticated
with check (updated_by=auth.uid() and exists (select 1 from public.leagues l where l.id=league_player_overrides.league_id and l.owner_id=auth.uid()));
drop policy if exists "Commissioners update player overrides" on public.league_player_overrides;
create policy "Commissioners update player overrides" on public.league_player_overrides
for update to authenticated
using (exists (select 1 from public.leagues l where l.id=league_player_overrides.league_id and l.owner_id=auth.uid()))
with check (updated_by=auth.uid() and exists (select 1 from public.leagues l where l.id=league_player_overrides.league_id and l.owner_id=auth.uid()));
drop policy if exists "Commissioners delete player overrides" on public.league_player_overrides;
create policy "Commissioners delete player overrides" on public.league_player_overrides
for delete to authenticated
using (exists (select 1 from public.leagues l where l.id=league_player_overrides.league_id and l.owner_id=auth.uid()));

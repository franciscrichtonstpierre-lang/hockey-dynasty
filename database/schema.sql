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


-- Compatibility with the browser app's league owner, invitation and membership fields.
alter table public.league_members add column if not exists role text not null default 'manager';
alter table public.league_members add column if not exists team_id integer;
alter table public.leagues add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.leagues add column if not exists join_code text;
update public.leagues set owner_id = commissioner_id where owner_id is null;
update public.leagues
set join_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
where join_code is null or btrim(join_code) = '';
alter table public.leagues alter column owner_id set not null;
alter table public.leagues alter column join_code set default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
alter table public.leagues alter column join_code set not null;
create unique index if not exists leagues_join_code_unique on public.leagues(join_code);

drop policy if exists "League owners can update leagues" on public.leagues;
create policy "League owners can update leagues" on public.leagues
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Users can join leagues" on public.league_members;

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


drop policy if exists "Users can update own league membership" on public.league_members;


-- Secure league joining: invitation-code validation and team allocation happen server-side.
drop policy if exists "Users can join leagues" on public.league_members;
drop policy if exists "Users can update own league membership" on public.league_members;
drop policy if exists "League owners can add their own membership" on public.league_members;
create policy "League owners can add their own membership" on public.league_members
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (select 1 from public.leagues l where l.id = league_id and l.owner_id = auth.uid())
);

create or replace function public.join_league_by_code(p_join_code text, p_manager_name text)
returns table (league_id uuid, league_name text, team_id integer, team_code text, manager_name text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_league_name text;
  v_member public.league_members%rowtype;
  v_codes text[] := array['ANA','BOS','BUF','CGY','CAR','CHI','COL','CBJ','DAL','DET','EDM','FLA','LAK','MIN','MTL','NSH','NJD','NYI','NYR','OTT','PHI','PIT','SJS','SEA','STL','TBL','TOR','UTA','VAN','VGK','WSH','WPG'];
  v_code text;
  v_team_id integer;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise pour rejoindre une ligue.';
  end if;
  if p_join_code is null or length(trim(p_join_code)) < 4 or length(trim(p_join_code)) > 8 then
    raise exception 'Le code doit contenir de 4 à 8 caractères.';
  end if;
  if p_manager_name is null or length(trim(p_manager_name)) < 2 or length(trim(p_manager_name)) > 40 then
    raise exception 'Le nom du DG doit contenir de 2 à 40 caractères.';
  end if;

  select l.id, l.name into v_league_id, v_league_name
  from public.leagues l
  where upper(trim(l.join_code)) = upper(trim(p_join_code))
  for update;
  if v_league_id is null then
    raise exception 'Aucune ligue trouvée avec ce code.';
  end if;

  select m.* into v_member
  from public.league_members m
  where m.league_id = v_league_id and m.user_id = auth.uid();

  if found then
    update public.league_members m
    set manager_name = trim(p_manager_name)
    where m.league_id = v_league_id and m.user_id = auth.uid();
    return query select v_member.league_id, v_league_name, v_member.team_id,
      v_member.team_code, trim(p_manager_name), v_member.role;
    return;
  end if;

  foreach v_code in array v_codes loop
    if not exists (
      select 1 from public.league_members m
      where m.league_id = v_league_id and m.team_code = v_code
    ) then
      v_team_id := array_position(v_codes, v_code) - 1;
      exit;
    end if;
    v_code := null;
  end loop;
  if v_code is null then
    raise exception 'Cette ligue a déjà attribué ses 32 équipes.';
  end if;

  insert into public.league_members(league_id, user_id, role, team_id, team_code, manager_name)
  values (v_league_id, auth.uid(), 'manager', v_team_id, v_code, trim(p_manager_name))
  returning * into v_member;

  return query select v_member.league_id, v_league_name, v_member.team_id,
    v_member.team_code, v_member.manager_name, v_member.role;
end;
$$;
revoke all on function public.join_league_by_code(text, text) from public;
revoke all on function public.join_league_by_code(text, text) from anon;
grant execute on function public.join_league_by_code(text, text) to authenticated;

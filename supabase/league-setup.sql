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
-- Existing installations may still require team_code to be non-null; unassigned DGs must be allowed.
alter table public.league_members alter column team_code drop not null;
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
  v_manager_name text := trim(coalesce(p_manager_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Connexion requise pour rejoindre une ligue.';
  end if;
  if p_join_code is null or length(trim(p_join_code)) < 4 or length(trim(p_join_code)) > 8 then
    raise exception 'Le code doit contenir de 4 à 8 caractères.';
  end if;
  if length(v_manager_name) < 2 or length(v_manager_name) > 40 then
    raise exception 'Le nom du DG doit contenir de 2 à 40 caractères.';
  end if;

  select l.id, l.name into v_league_id, v_league_name
  from public.leagues l
  where upper(trim(l.join_code)) = upper(trim(p_join_code))
  limit 1;
  if v_league_id is null then
    raise exception 'Aucune ligue trouvée avec ce code.';
  end if;

  select m.* into v_member
  from public.league_members m
  where m.league_id = v_league_id and m.user_id = auth.uid();

  if found then
    update public.league_members m
    set manager_name = v_manager_name
    where m.league_id = v_league_id and m.user_id = auth.uid()
    returning * into v_member;
  else
    -- Joining only registers the member. The commissioner assigns the team later.
    insert into public.league_members(league_id, user_id, role, team_id, team_code, manager_name)
    values (v_league_id, auth.uid(), 'manager', null, null, v_manager_name)
    returning * into v_member;
  end if;

  return query select v_member.league_id, v_league_name, v_member.team_id,
    v_member.team_code, v_member.manager_name, v_member.role;
end;
$$;
revoke all on function public.join_league_by_code(text, text) from public;
revoke all on function public.join_league_by_code(text, text) from anon;
grant execute on function public.join_league_by_code(text, text) to authenticated;


-- Atomic league creation: create the league and commissioner membership together.
create or replace function public.create_league_with_commissioner(p_name text, p_manager_name text)
returns table (id uuid, name text, join_code text, manager_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_manager_name text := trim(coalesce(p_manager_name, ''));
  v_join_code text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise pour créer une ligue.';
  end if;
  if length(v_name) < 3 or length(v_name) > 80 then
    raise exception 'Le nom de ligue doit contenir de 3 à 80 caractères.';
  end if;
  if length(v_manager_name) < 2 or length(v_manager_name) > 40 then
    raise exception 'Le nom du DG doit contenir de 2 à 40 caractères.';
  end if;

  loop
    v_join_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (
      select 1 from public.leagues l where l.join_code = v_join_code
    );
  end loop;

  insert into public.leagues as new_league(name, owner_id, commissioner_id, join_code)
  values (v_name, auth.uid(), auth.uid(), v_join_code)
  returning new_league.id into v_id;

  insert into public.league_members(league_id, user_id, role, team_id, team_code, manager_name)
  values (v_id, auth.uid(), 'commissioner', 14, 'MTL', v_manager_name);

  return query select l.id, l.name, l.join_code, v_manager_name
  from public.leagues l where l.id = v_id;
end;
$$;
revoke all on function public.create_league_with_commissioner(text, text) from public;
revoke all on function public.create_league_with_commissioner(text, text) from anon;
grant execute on function public.create_league_with_commissioner(text, text) to authenticated;

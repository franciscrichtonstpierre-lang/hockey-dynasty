-- Hockey Dynasty: réparer uniquement la fonction SQL utilisée pour rejoindre une ligue.
-- À exécuter dans Supabase > SQL Editor si l'erreur indique que
-- public.join_league_by_code(p_join_code, p_manager_name) est introuvable.
-- Prérequis: public.leagues et public.league_members existent avec les colonnes utilisées ci-dessous.

create or replace function public.join_league_by_code(p_join_code text, p_manager_name text)
returns table (
  league_id uuid,
  league_name text,
  team_id integer,
  team_code text,
  manager_name text,
  role text
)
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

  select l.id, l.name
    into v_league_id, v_league_name
  from public.leagues as l
  where upper(trim(l.join_code)) = upper(trim(p_join_code))
  limit 1;

  if v_league_id is null then
    raise exception 'Aucune ligue trouvée avec ce code.';
  end if;

  select m.*
    into v_member
  from public.league_members as m
  where m.league_id = v_league_id
    and m.user_id = auth.uid();

  if found then
    update public.league_members as m
    set manager_name = v_manager_name
    where m.league_id = v_league_id
      and m.user_id = auth.uid()
    returning m.* into v_member;
  else
    insert into public.league_members (
      league_id, user_id, role, team_id, team_code, manager_name
    )
    values (
      v_league_id, auth.uid(), 'manager', null, null, v_manager_name
    )
    returning * into v_member;
  end if;

  return query
  select v_member.league_id, v_league_name, v_member.team_id,
         v_member.team_code, v_member.manager_name, v_member.role;
end;
$$;

revoke all on function public.join_league_by_code(text, text) from public;
revoke all on function public.join_league_by_code(text, text) from anon;
grant execute on function public.join_league_by_code(text, text) to authenticated;

notify pgrst, 'reload schema';

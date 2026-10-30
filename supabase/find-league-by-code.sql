-- Hockey Dynasty: recherche securisee d'une ligue par code.
-- A executer une seule fois dans Supabase > SQL Editor.
-- Cette fonction ne retourne que la ligue correspondant au code fourni.
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
    from public.leagues as l
    where upper(trim(l.join_code)) = upper(trim(p_join_code))
    limit 1;
end;
$$;

revoke all on function public.find_league_by_code(text) from public;
revoke all on function public.find_league_by_code(text) from anon;
grant execute on function public.find_league_by_code(text) to authenticated;

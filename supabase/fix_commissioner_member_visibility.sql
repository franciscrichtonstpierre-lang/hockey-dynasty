-- Hockey Dynasty: permettre au propriétaire/commissaire de voir les membres de SA ligue.
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Cette règle ne donne pas accès aux membres des autres ligues.
-- Elle ne contourne pas les permissions des tables et ne doit pas être exécutée côté navigateur.

alter table public.league_members enable row level security;

drop policy if exists "league_members_select_commissioner" on public.league_members;

create policy "league_members_select_commissioner"
on public.league_members
for select
to authenticated
using (
  exists (
    select 1
    from public.leagues as l
    where l.id = league_members.league_id
      and l.owner_id = (select auth.uid())
  )
);

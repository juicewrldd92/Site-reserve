-- =============================================================================
-- 0005 — Invitations, rôles et temps réel
--
-- Envoyer un e-mail d'invitation demanderait la clé `service_role`, qui n'a
-- rien à faire dans un navigateur. On fait donc autrement : le patron enregistre
-- une invitation, la personne s'inscrit avec cette adresse, et sa première
-- connexion transforme l'invitation en membership.
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

create table if not exists public.invitations (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  email            text not null check (position('@' in email) > 1),
  role             public.member_role not null default 'staff',
  establishment_id uuid references public.establishments (id) on delete cascade,
  invited_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  accepted_at      timestamptz
);

-- Une seule invitation en attente par adresse et par organisation.
create unique index if not exists invitations_pending_idx
  on public.invitations (org_id, lower(email))
  where accepted_at is null;

create index if not exists invitations_email_idx on public.invitations (lower(email));

-- -----------------------------------------------------------------------------
-- Réclamation des invitations
--
-- Appelée à chaque connexion. SECURITY DEFINER parce que l'invité n'a par
-- définition aucun droit sur l'organisation avant d'y entrer — mais on ne se
-- fie qu'à l'e-mail vérifié du JWT, jamais à un paramètre.
-- -----------------------------------------------------------------------------
create or replace function public.claim_invitations()
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_user  uuid := auth.uid();
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_count integer := 0;
  v_row   record;
begin
  if v_user is null or v_email is null then
    return 0;
  end if;

  insert into public.profiles (id) values (v_user) on conflict (id) do nothing;

  for v_row in
    select id, org_id, role, establishment_id
      from public.invitations
     where lower(email) = v_email
       and accepted_at is null
     for update
  loop
    insert into public.memberships (org_id, user_id, role, establishment_id)
    values (v_row.org_id, v_user, v_row.role, v_row.establishment_id)
    on conflict do nothing;

    update public.invitations set accepted_at = now() where id = v_row.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.invitations enable row level security;

-- Les membres voient les invitations en attente de leur organisation
-- (la liste « L'équipe » les affiche avec la pastille « En attente »).
drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    public.org_role(org_id) = 'owner'
    or (public.org_role(org_id) = 'manager' and role = 'staff')
  );

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
  for delete to authenticated
  using (
    public.org_role(org_id) = 'owner'
    or (public.org_role(org_id) = 'manager' and role = 'staff')
  );

revoke all on public.invitations from anon;
grant select, insert, delete on public.invitations to authenticated;

revoke all on function public.claim_invitations() from public, anon;
grant execute on function public.claim_invitations() to authenticated;

-- -----------------------------------------------------------------------------
-- Temps réel
--
-- Le stock est partagé : quand quelqu'un ajuste une quantité en chambre froide,
-- les autres doivent le voir sans recharger. La RLS s'applique aussi aux
-- messages Realtime — personne ne reçoit les mouvements d'une autre
-- organisation.
-- -----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.stock_items;
exception
  when duplicate_object then null;
  when undefined_object then null;  -- publication absente : rien à faire
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.stock_batches;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

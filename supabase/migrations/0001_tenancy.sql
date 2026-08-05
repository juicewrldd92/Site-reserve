-- =============================================================================
-- 0001 — Multi-tenant & authentification
--
-- Organisations → établissements → membres. Tout est cloisonné par RLS :
-- un utilisateur ne voit JAMAIS les données d'une organisation dont il n'est
-- pas membre, et un membre rattaché à un seul établissement ne voit que
-- celui-là. On ne fait jamais confiance au client pour le scoping.
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.member_role as enum ('owner', 'manager', 'staff');
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 120),
  owner_id   uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists organizations_owner_id_idx
  on public.organizations (owner_id);

create table if not exists public.establishments (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 120),
  cuisine_type text,
  address      text,
  -- Emplacements de stockage, saisis à l'onboarding (« Frigo », « Congélo »…).
  -- Texte libre : chaque resto nomme ses zones comme il veut.
  locations    text[] not null default array['Frigo', 'Congélo', 'Réserve sèche'],
  created_at   timestamptz not null default now()
);

create index if not exists establishments_org_id_idx
  on public.establishments (org_id);

create table if not exists public.memberships (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             public.member_role not null default 'staff',
  -- NULL = accès à tous les établissements de l'organisation.
  establishment_id uuid references public.establishments (id) on delete cascade,
  created_at       timestamptz not null default now()
);

-- `unique (org_id, user_id, establishment_id)` ne suffit pas : en SQL deux NULL
-- ne sont pas égaux, on pourrait créer deux accès « tout l'org » en double.
create unique index if not exists memberships_unique_idx
  on public.memberships (
    org_id,
    user_id,
    coalesce(establishment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists memberships_user_id_idx on public.memberships (user_id);
create index if not exists memberships_org_id_idx on public.memberships (org_id);

-- -----------------------------------------------------------------------------
-- Helpers de sécurité
--
-- SECURITY DEFINER volontairement : ces fonctions sont appelées DEPUIS les
-- policies. Si elles passaient par la RLS, la policy de `memberships` se
-- rappellerait elle-même → récursion infinie. Le `search_path` est verrouillé.
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(p_org uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

-- Rôle le plus élevé de l'utilisateur courant sur une organisation.
create or replace function public.org_role(p_org uuid)
  returns public.member_role
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select m.role
    from public.memberships m
   where m.org_id = p_org and m.user_id = auth.uid()
   order by case m.role when 'owner' then 0 when 'manager' then 1 else 2 end
   limit 1;
$$;

-- Un membre « tout l'org » voit tous les établissements ; un membre rattaché
-- à un établissement ne voit que le sien.
create or replace function public.can_access_establishment(p_establishment uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.establishments e
      join public.memberships m on m.org_id = e.org_id
     where e.id = p_establishment
       and m.user_id = auth.uid()
       and (m.establishment_id is null or m.establishment_id = e.id)
  );
$$;

-- Deux personnes qui partagent une organisation peuvent voir leurs profils
-- (nécessaire pour la liste « L'équipe » des réglages).
create or replace function public.shares_org_with(p_user uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.memberships mine
      join public.memberships theirs on theirs.org_id = mine.org_id
     where mine.user_id = auth.uid() and theirs.user_id = p_user
  );
$$;

-- -----------------------------------------------------------------------------
-- Profil créé automatiquement à l'inscription
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Création d'organisation (onboarding)
--
-- En une transaction : organisation + premier établissement + membership patron.
-- Évite l'état bancal « org créée mais je n'en suis pas membre ».
-- -----------------------------------------------------------------------------
create or replace function public.create_organization_with_establishment(
  p_org_name           text,
  p_establishment_name text,
  p_cuisine_type       text default null,
  p_locations          text[] default null
)
  returns table (org_id uuid, establishment_id uuid)
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_org  uuid;
  v_est  uuid;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  insert into public.profiles (id) values (v_user) on conflict (id) do nothing;

  insert into public.organizations (name, owner_id)
  values (btrim(p_org_name), v_user)
  returning id into v_org;

  insert into public.establishments (org_id, name, cuisine_type, locations)
  values (
    v_org,
    btrim(p_establishment_name),
    nullif(btrim(coalesce(p_cuisine_type, '')), ''),
    coalesce(nullif(p_locations, '{}'), array['Frigo', 'Congélo', 'Réserve sèche'])
  )
  returning id into v_est;

  insert into public.memberships (org_id, user_id, role)
  values (v_org, v_user, 'owner');

  return query select v_org, v_est;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.organizations  enable row level security;
alter table public.establishments enable row level security;
alter table public.memberships    enable row level security;

-- profiles ---------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_org_with(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- organizations ----------------------------------------------------------
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (public.org_role(id) = 'owner')
  with check (public.org_role(id) = 'owner');

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
  for delete to authenticated
  using (owner_id = auth.uid());

-- establishments ---------------------------------------------------------
drop policy if exists establishments_select on public.establishments;
create policy establishments_select on public.establishments
  for select to authenticated
  using (public.can_access_establishment(id));

drop policy if exists establishments_insert on public.establishments;
create policy establishments_insert on public.establishments
  for insert to authenticated
  with check (public.org_role(org_id) = 'owner');

drop policy if exists establishments_update on public.establishments;
create policy establishments_update on public.establishments
  for update to authenticated
  using (
    public.org_role(org_id) in ('owner', 'manager')
    and public.can_access_establishment(id)
  )
  with check (public.org_role(org_id) in ('owner', 'manager'));

drop policy if exists establishments_delete on public.establishments;
create policy establishments_delete on public.establishments
  for delete to authenticated
  using (public.org_role(org_id) = 'owner');

-- memberships ------------------------------------------------------------
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists memberships_insert on public.memberships;
create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (
    -- Le patron s'inscrit lui-même sur l'organisation qu'il vient de créer.
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.organizations o
        where o.id = org_id and o.owner_id = auth.uid()
      )
    )
    -- Le patron invite qui il veut ; un manager ne peut créer que du staff.
    or public.org_role(org_id) = 'owner'
    or (public.org_role(org_id) = 'manager' and role = 'staff')
  );

drop policy if exists memberships_update on public.memberships;
create policy memberships_update on public.memberships
  for update to authenticated
  using (
    public.org_role(org_id) = 'owner'
    or (public.org_role(org_id) = 'manager' and role = 'staff')
  )
  with check (
    public.org_role(org_id) = 'owner'
    or (public.org_role(org_id) = 'manager' and role = 'staff')
  );

drop policy if exists memberships_delete on public.memberships;
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (
    public.org_role(org_id) = 'owner'
    or (public.org_role(org_id) = 'manager' and role = 'staff')
    -- On peut toujours se retirer soi-même, sauf si on est le patron.
    or (user_id = auth.uid() and role <> 'owner')
  );

-- -----------------------------------------------------------------------------
-- Droits
-- La RLS est la barrière ; les GRANT évitent qu'un visiteur non connecté
-- (rôle `anon`) puisse même tenter une requête.
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.organizations, public.establishments,
  public.memberships from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.establishments to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;

revoke all on function public.create_organization_with_establishment(text, text, text, text[]) from public, anon;
grant execute on function public.create_organization_with_establishment(text, text, text, text[]) to authenticated;

-- =============================================================================
-- 0006 — Fournisseurs et listes à commander
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

do $$
begin
  create type public.order_status as enum ('draft', 'sent');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 120),
  contact    text,
  created_at timestamptz not null default now()
);

create index if not exists suppliers_org_idx on public.suppliers (org_id);

create table if not exists public.order_lists (
  id               uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name             text not null check (length(btrim(name)) between 1 and 120),
  status           public.order_status not null default 'draft',
  supplier_id      uuid references public.suppliers (id) on delete set null,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);

create index if not exists order_lists_establishment_idx
  on public.order_lists (establishment_id, created_at desc);

create table if not exists public.order_list_items (
  id            uuid primary key default gen_random_uuid(),
  order_list_id uuid not null references public.order_lists (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  quantity      numeric(12, 3) not null default 1 check (quantity > 0),
  unit          public.product_unit not null,
  note          text,
  is_checked    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Un produit n'apparaît qu'une fois par liste : la génération auto peut être
-- relancée sans créer de doublons.
create unique index if not exists order_list_items_unique_idx
  on public.order_list_items (order_list_id, product_id);

create index if not exists order_list_items_list_idx
  on public.order_list_items (order_list_id);

-- -----------------------------------------------------------------------------
-- Vue de lecture des lignes, avec la fiche produit
-- -----------------------------------------------------------------------------
drop view if exists public.order_list_items_view;
create view public.order_list_items_view
  with (security_invoker = true)
as
select
  i.id,
  i.order_list_id,
  i.product_id,
  i.quantity,
  i.unit,
  i.note,
  i.is_checked,
  i.created_at,
  p.name,
  p.brand,
  p.image_url
from public.order_list_items i
join public.products p on p.id = i.product_id;

-- -----------------------------------------------------------------------------
-- Génération automatique depuis le stock bas
--
-- Quantité suggérée : de quoi repasser au double du seuil. Règle simple et
-- explicable — le restaurateur ajuste ensuite d'un tap.
-- Relançable : les lignes existantes sont laissées telles quelles.
-- -----------------------------------------------------------------------------
create or replace function public.fill_order_from_low_stock(p_order_list_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_establishment uuid;
  v_count         integer := 0;
begin
  select establishment_id into v_establishment
    from public.order_lists where id = p_order_list_id;

  if v_establishment is null then
    raise exception 'Liste introuvable' using errcode = 'P0002';
  end if;

  -- SECURITY DEFINER : on revérifie l'accès à la main, sinon on contournerait
  -- la RLS.
  if not public.can_access_establishment(v_establishment) then
    raise exception 'Accès refusé à cet établissement' using errcode = '42501';
  end if;

  with low as (
    select
      si.product_id,
      si.unit,
      greatest(1, ceil(si.min_threshold * 2 - si.quantity)) as suggested
    from public.stock_items si
    where si.establishment_id = v_establishment
      and si.min_threshold is not null
      and si.quantity <= si.min_threshold
  ),
  inserted as (
    insert into public.order_list_items (order_list_id, product_id, quantity, unit)
    select p_order_list_id, low.product_id, low.suggested, low.unit
      from low
    on conflict (order_list_id, product_id) do nothing
    returning 1
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.suppliers        enable row level security;
alter table public.order_lists      enable row level security;
alter table public.order_list_items enable row level security;

drop policy if exists suppliers_all on public.suppliers;
create policy suppliers_all on public.suppliers
  for all to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists order_lists_all on public.order_lists;
create policy order_lists_all on public.order_lists
  for all to authenticated
  using (public.can_access_establishment(establishment_id))
  with check (public.can_access_establishment(establishment_id));

-- Une ligne suit l'accès de sa liste : une seule règle à maintenir.
create or replace function public.can_access_order_list(p_list uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.order_lists ol
     where ol.id = p_list
       and public.can_access_establishment(ol.establishment_id)
  );
$$;

drop policy if exists order_list_items_all on public.order_list_items;
create policy order_list_items_all on public.order_list_items
  for all to authenticated
  using (public.can_access_order_list(order_list_id))
  with check (public.can_access_order_list(order_list_id));

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke all on public.suppliers, public.order_lists, public.order_list_items,
  public.order_list_items_view from anon;

grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.order_lists to authenticated;
grant select, insert, update, delete on public.order_list_items to authenticated;
grant select on public.order_list_items_view to authenticated;

revoke all on function public.fill_order_from_low_stock(uuid) from public, anon;
grant execute on function public.fill_order_from_low_stock(uuid) to authenticated;

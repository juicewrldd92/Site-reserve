-- =============================================================================
-- 0007 — Stock optimal, alertes par produit, fournisseurs et statuts de commande
--
-- Trois idées :
--   · `min_threshold` déclenche l'alerte, `target_quantity` dit jusqu'où
--     remonter. Sans les deux, la quantité à commander reste une devinette.
--   · Le délai d'alerte DLC devient réglable produit par produit (un yaourt et
--     un sac de farine ne se surveillent pas au même rythme).
--   · Une commande a un cycle de vie : à commander → commandée → reçue.
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Stock optimal & délai d'alerte par ligne de stock
-- -----------------------------------------------------------------------------
alter table public.stock_items
  add column if not exists target_quantity numeric(12, 3)
    check (target_quantity is null or target_quantity >= 0);

-- NULL = on retombe sur le réglage de l'établissement (`dlc_alert_days`).
alter table public.stock_items
  add column if not exists alert_lead_days smallint
    check (alert_lead_days is null or alert_lead_days between 1 and 365);

-- Le seuil ne peut pas dépasser l'optimal : ce serait incohérent et la
-- quantité suggérée deviendrait négative.
do $$
begin
  alter table public.stock_items
    add constraint stock_items_threshold_below_target
    check (
      min_threshold is null
      or target_quantity is null
      or min_threshold <= target_quantity
    );
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- Fournisseur au niveau du produit — c'est ce qui permet de grouper une
-- commande par fournisseur.
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

create index if not exists products_supplier_idx on public.products (supplier_id);

-- -----------------------------------------------------------------------------
-- Cycle de vie d'une commande
-- `sent` est conservé : les listes déjà envoyées gardent leur statut.
-- -----------------------------------------------------------------------------
alter type public.order_status add value if not exists 'ordered';
alter type public.order_status add value if not exists 'received';

alter table public.order_lists
  add column if not exists ordered_at timestamptz,
  add column if not exists received_at timestamptz;

alter table public.order_list_items
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null,
  add column if not exists received_quantity numeric(12, 3)
    check (received_quantity is null or received_quantity >= 0);

-- -----------------------------------------------------------------------------
-- Vue enrichie du stock
--
-- On remplace `stock_overview` pour y ajouter l'optimal, le délai d'alerte et
-- le fournisseur. `create or replace view` refuse d'ajouter des colonnes au
-- milieu : on la recrée.
-- -----------------------------------------------------------------------------
drop view if exists public.stock_overview;
create view public.stock_overview
  with (security_invoker = true)
as
select
  si.id,
  si.establishment_id,
  si.product_id,
  si.quantity,
  si.unit,
  si.min_threshold,
  si.target_quantity,
  si.alert_lead_days,
  si.location,
  si.updated_at,
  si.updated_by,
  p.name,
  p.brand,
  p.image_url,
  p.category,
  p.barcode,
  p.source,
  p.supplier_id,
  s.name as supplier_name,
  batches.next_expiry,
  batches.batch_count
from public.stock_items si
join public.products p on p.id = si.product_id
left join public.suppliers s on s.id = p.supplier_id
left join lateral (
  select
    min(sb.expiry_date) as next_expiry,
    count(*)            as batch_count
  from public.stock_batches sb
  where sb.stock_item_id = si.id
) batches on true;

revoke all on public.stock_overview from anon;
grant select on public.stock_overview to authenticated;

-- -----------------------------------------------------------------------------
-- Vue des lignes de commande, enrichie du fournisseur
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
  i.received_quantity,
  i.created_at,
  p.name,
  p.brand,
  p.image_url,
  coalesce(i.supplier_id, p.supplier_id) as supplier_id,
  s.name as supplier_name
from public.order_list_items i
join public.products p on p.id = i.product_id
left join public.suppliers s on s.id = coalesce(i.supplier_id, p.supplier_id);

revoke all on public.order_list_items_view from anon;
grant select on public.order_list_items_view to authenticated;

-- -----------------------------------------------------------------------------
-- Ajout au stock : on accepte désormais l'optimal et le délai d'alerte
-- -----------------------------------------------------------------------------
create or replace function public.add_to_stock(
  p_establishment_id uuid,
  p_product_id       uuid,
  p_quantity         numeric,
  p_unit             public.product_unit,
  p_location         text default '',
  p_min_threshold    numeric default null,
  p_expiry_date      date default null,
  p_target_quantity  numeric default null,
  p_alert_lead_days  smallint default null
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_item uuid;
begin
  if v_user is null then
    raise exception 'Authentification requise' using errcode = '28000';
  end if;

  if not public.can_access_establishment(p_establishment_id) then
    raise exception 'Accès refusé à cet établissement' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité doit être positive' using errcode = '22023';
  end if;

  insert into public.stock_items as si (
    establishment_id, product_id, quantity, unit, min_threshold,
    target_quantity, alert_lead_days, location, updated_by
  )
  values (
    p_establishment_id, p_product_id, p_quantity, p_unit, p_min_threshold,
    p_target_quantity, p_alert_lead_days, coalesce(btrim(p_location), ''), v_user
  )
  on conflict (establishment_id, product_id, location) do update
    set quantity        = si.quantity + excluded.quantity,
        unit            = excluded.unit,
        -- Un réglage déjà en place ne se fait pas écraser par un ajout qui
        -- ne le précise pas.
        min_threshold   = coalesce(excluded.min_threshold, si.min_threshold),
        target_quantity = coalesce(excluded.target_quantity, si.target_quantity),
        alert_lead_days = coalesce(excluded.alert_lead_days, si.alert_lead_days),
        updated_by      = v_user
  returning si.id into v_item;

  if p_expiry_date is not null then
    insert into public.stock_batches (stock_item_id, quantity, expiry_date, created_by)
    values (v_item, p_quantity, p_expiry_date, v_user);
  end if;

  return v_item;
end;
$$;

revoke all on function public.add_to_stock(uuid, uuid, numeric, public.product_unit, text, numeric, date, numeric, smallint) from public, anon;
grant execute on function public.add_to_stock(uuid, uuid, numeric, public.product_unit, text, numeric, date, numeric, smallint) to authenticated;

-- -----------------------------------------------------------------------------
-- Génération d'une commande : on vise l'optimal
--
-- Exemple du cahier des charges : stock 3, optimal 12 → on suggère 9.
-- Sans optimal renseigné, on retombe sur le double du seuil (comportement
-- précédent), pour ne pas casser les stocks déjà réglés.
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

  if not public.can_access_establishment(v_establishment) then
    raise exception 'Accès refusé à cet établissement' using errcode = '42501';
  end if;

  with low as (
    select
      si.product_id,
      si.unit,
      p.supplier_id,
      greatest(
        1,
        ceil(coalesce(si.target_quantity, si.min_threshold * 2) - si.quantity)
      ) as suggested
    from public.stock_items si
    join public.products p on p.id = si.product_id
    where si.establishment_id = v_establishment
      and si.min_threshold is not null
      and si.quantity <= si.min_threshold
  ),
  inserted as (
    insert into public.order_list_items (order_list_id, product_id, quantity, unit, supplier_id)
    select p_order_list_id, low.product_id, low.suggested, low.unit, low.supplier_id
      from low
    on conflict (order_list_id, product_id) do nothing
    returning 1
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

revoke all on function public.fill_order_from_low_stock(uuid) from public, anon;
grant execute on function public.fill_order_from_low_stock(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Réception d'une commande
--
-- Marquer « reçue » doit remonter le stock : c'est tout l'intérêt du cycle.
-- -----------------------------------------------------------------------------
create or replace function public.receive_order_list(p_order_list_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_establishment uuid;
  v_user          uuid := auth.uid();
  v_count         integer := 0;
  v_row           record;
begin
  select establishment_id into v_establishment
    from public.order_lists where id = p_order_list_id;

  if v_establishment is null then
    raise exception 'Liste introuvable' using errcode = 'P0002';
  end if;

  if not public.can_access_establishment(v_establishment) then
    raise exception 'Accès refusé à cet établissement' using errcode = '42501';
  end if;

  for v_row in
    select product_id, unit, coalesce(received_quantity, quantity) as qty
      from public.order_list_items
     where order_list_id = p_order_list_id
       and is_checked
  loop
    insert into public.stock_items as si (
      establishment_id, product_id, quantity, unit, updated_by
    )
    values (v_establishment, v_row.product_id, v_row.qty, v_row.unit, v_user)
    on conflict (establishment_id, product_id, location) do update
      set quantity   = si.quantity + excluded.quantity,
          updated_by = v_user;

    v_count := v_count + 1;
  end loop;

  update public.order_lists
     set status = 'received', received_at = now()
   where id = p_order_list_id;

  return v_count;
end;
$$;

revoke all on function public.receive_order_list(uuid) from public, anon;
grant execute on function public.receive_order_list(uuid) to authenticated;

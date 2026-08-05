-- =============================================================================
-- 0004 — Stock & lots (DLC)
--
-- Modèle, et le compromis assumé derrière :
--
--   · `stock_items.quantity` est LA quantité qui fait foi. C'est ce qu'on
--     compte sur l'étagère, c'est ce que le mode inventaire ajuste.
--   · `stock_batches` enregistre les lots datés. Ils ne servent qu'aux alertes
--     DLC, pas au total.
--
-- Les deux peuvent diverger (un ajustement manuel ne touche pas aux lots) et
-- c'est voulu : en cuisine on compte ce qu'on voit, les dates sont un sujet
-- séparé. Vouloir les synchroniser automatiquement produirait des corrections
-- surprises pendant un inventaire, ce qui est pire.
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Réglage d'alerte, par établissement
-- -----------------------------------------------------------------------------
alter table public.establishments
  add column if not exists dlc_alert_days smallint not null default 5
    check (dlc_alert_days between 1 and 60);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table if not exists public.stock_items (
  id               uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete cascade,
  quantity         numeric(12, 3) not null default 0 check (quantity >= 0),
  unit             public.product_unit not null,
  min_threshold    numeric(12, 3) check (min_threshold is null or min_threshold >= 0),
  -- Texte libre : chaque resto nomme ses zones comme il veut.
  -- '' = pas d'emplacement précisé (et non NULL, pour que l'unicité tienne).
  location         text not null default '' check (length(location) <= 60),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles (id) on delete set null
);

-- Un même produit peut être stocké à deux endroits : c'est deux lignes.
create unique index if not exists stock_items_unique_idx
  on public.stock_items (establishment_id, product_id, location);

create index if not exists stock_items_establishment_idx
  on public.stock_items (establishment_id);

drop trigger if exists stock_items_touch_updated_at on public.stock_items;
create trigger stock_items_touch_updated_at
  before update on public.stock_items
  for each row execute function public.touch_updated_at();

create table if not exists public.stock_batches (
  id            uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  quantity      numeric(12, 3) not null check (quantity > 0),
  -- DLC ou DLUO, on ne fait pas la distinction côté données.
  expiry_date   date not null,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id) on delete set null
);

create index if not exists stock_batches_item_idx
  on public.stock_batches (stock_item_id);

-- Les alertes DLC trient par date la plus proche : l'index sert à chaque écran.
create index if not exists stock_batches_expiry_idx
  on public.stock_batches (expiry_date);

-- -----------------------------------------------------------------------------
-- Vue de lecture — tout ce qu'un écran de stock affiche, en une requête
--
-- `security_invoker` : la vue s'exécute avec les droits de l'appelant, donc la
-- RLS de `stock_items` et `products` s'applique normalement. Sans ça, la vue
-- contournerait le cloisonnement.
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
  si.location,
  si.updated_at,
  si.updated_by,
  p.name,
  p.brand,
  p.image_url,
  p.category,
  p.barcode,
  p.source,
  batches.next_expiry,
  batches.batch_count
from public.stock_items si
join public.products p on p.id = si.product_id
left join lateral (
  select
    min(sb.expiry_date) as next_expiry,
    count(*)            as batch_count
  from public.stock_batches sb
  where sb.stock_item_id = si.id
) batches on true;

-- -----------------------------------------------------------------------------
-- Ajout au stock — une seule aller-retour, atomique
--
-- Objectif produit : du scan à l'enregistrement, ≤ 3 taps. Donc pas de
-- « je crée la ligne, puis j'ajoute le lot, puis je relis ».
-- Si le produit est déjà en stock à cet emplacement, on incrémente.
-- -----------------------------------------------------------------------------
create or replace function public.add_to_stock(
  p_establishment_id uuid,
  p_product_id       uuid,
  p_quantity         numeric,
  p_unit             public.product_unit,
  p_location         text default '',
  p_min_threshold    numeric default null,
  p_expiry_date      date default null
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

  -- La fonction est SECURITY DEFINER : elle court-circuite la RLS, donc on
  -- revérifie l'accès à la main. Sans ça, n'importe qui remplirait le stock
  -- de n'importe quel établissement.
  if not public.can_access_establishment(p_establishment_id) then
    raise exception 'Accès refusé à cet établissement' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La quantité doit être positive' using errcode = '22023';
  end if;

  insert into public.stock_items as si (
    establishment_id, product_id, quantity, unit, min_threshold, location, updated_by
  )
  values (
    p_establishment_id, p_product_id, p_quantity, p_unit,
    p_min_threshold, coalesce(btrim(p_location), ''), v_user
  )
  on conflict (establishment_id, product_id, location) do update
    set quantity      = si.quantity + excluded.quantity,
        unit          = excluded.unit,
        -- Un seuil déjà réglé ne se fait pas écraser par un ajout sans seuil.
        min_threshold = coalesce(excluded.min_threshold, si.min_threshold),
        updated_by    = v_user
  returning si.id into v_item;

  if p_expiry_date is not null then
    insert into public.stock_batches (stock_item_id, quantity, expiry_date, created_by)
    values (v_item, p_quantity, p_expiry_date, v_user);
  end if;

  return v_item;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.stock_items   enable row level security;
alter table public.stock_batches enable row level security;

-- stock_items ------------------------------------------------------------
drop policy if exists stock_items_select on public.stock_items;
create policy stock_items_select on public.stock_items
  for select to authenticated
  using (public.can_access_establishment(establishment_id));

drop policy if exists stock_items_insert on public.stock_items;
create policy stock_items_insert on public.stock_items
  for insert to authenticated
  with check (public.can_access_establishment(establishment_id));

-- Le staff compte et ajuste : c'est tout l'intérêt du mode inventaire.
drop policy if exists stock_items_update on public.stock_items;
create policy stock_items_update on public.stock_items
  for update to authenticated
  using (public.can_access_establishment(establishment_id))
  with check (public.can_access_establishment(establishment_id));

drop policy if exists stock_items_delete on public.stock_items;
create policy stock_items_delete on public.stock_items
  for delete to authenticated
  using (public.can_access_establishment(establishment_id));

-- stock_batches ----------------------------------------------------------
-- Un lot suit l'accès de sa ligne de stock : une seule règle à maintenir.
create or replace function public.can_access_stock_item(p_item uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.stock_items si
     where si.id = p_item
       and public.can_access_establishment(si.establishment_id)
  );
$$;

drop policy if exists stock_batches_select on public.stock_batches;
create policy stock_batches_select on public.stock_batches
  for select to authenticated
  using (public.can_access_stock_item(stock_item_id));

drop policy if exists stock_batches_insert on public.stock_batches;
create policy stock_batches_insert on public.stock_batches
  for insert to authenticated
  with check (public.can_access_stock_item(stock_item_id));

drop policy if exists stock_batches_update on public.stock_batches;
create policy stock_batches_update on public.stock_batches
  for update to authenticated
  using (public.can_access_stock_item(stock_item_id))
  with check (public.can_access_stock_item(stock_item_id));

drop policy if exists stock_batches_delete on public.stock_batches;
create policy stock_batches_delete on public.stock_batches
  for delete to authenticated
  using (public.can_access_stock_item(stock_item_id));

-- -----------------------------------------------------------------------------
-- Droits
-- -----------------------------------------------------------------------------
revoke all on public.stock_items, public.stock_batches, public.stock_overview from anon;

grant select, insert, update, delete on public.stock_items to authenticated;
grant select, insert, update, delete on public.stock_batches to authenticated;
grant select on public.stock_overview to authenticated;

revoke all on function public.add_to_stock(uuid, uuid, numeric, public.product_unit, text, numeric, date) from public, anon;
grant execute on function public.add_to_stock(uuid, uuid, numeric, public.product_unit, text, numeric, date) to authenticated;

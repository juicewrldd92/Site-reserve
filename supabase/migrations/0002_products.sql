-- =============================================================================
-- 0002 — Catalogue produits
--
-- Le catalogue est partagé au niveau de l'organisation : un produit scanné
-- dans un établissement est réutilisable dans les autres.
--
-- Deux origines, à égalité de traitement :
--   · openfoodfacts — enrichi automatiquement après un scan
--   · manual        — saisi à la main, avec photo prise en cuisine
-- En resto la majorité du stock n'a pas de code-barre : le second cas n'est
-- pas un plan B, c'est le cas nominal.
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.product_unit as enum (
    'piece', 'kg', 'g', 'l', 'ml',
    'boite', 'bouteille', 'sac', 'sachet', 'botte', 'bidon', 'brique', 'barquette'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.product_source as enum ('openfoodfacts', 'manual');
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- Horodatage automatique (servira aussi au last-write-wins du stock)
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  -- EAN-13, EAN-8, UPC-A/E, Code 128 numérique.
  barcode       text check (barcode is null or barcode ~ '^[0-9]{6,14}$'),
  name          text not null check (length(btrim(name)) between 1 and 200),
  brand         text,
  -- Toujours une URL de NOTRE Storage : les URL d'Open Food Facts bougent.
  image_url     text,
  category      text,
  default_unit  public.product_unit not null default 'piece',
  source        public.product_source not null default 'manual',
  -- Réservé au food cost (hors MVP). Jamais exposé dans l'UI pour l'instant.
  unit_cost     numeric(10, 4),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Un code-barre ne peut désigner qu'un produit par organisation ; les produits
-- sans code-barre, eux, peuvent se ressembler autant qu'ils veulent.
create unique index if not exists products_org_barcode_idx
  on public.products (org_id, barcode)
  where barcode is not null;

create index if not exists products_org_id_idx on public.products (org_id);

-- Recherche « Cherche un produit… » tolérante aux fautes de frappe.
create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated
  using (public.is_org_member(org_id));

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert to authenticated
  with check (public.is_org_member(org_id));

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- Le staff scanne et ajuste, mais ne supprime pas du catalogue.
drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete to authenticated
  using (public.org_role(org_id) in ('owner', 'manager'));

revoke all on public.products from anon;
grant select, insert, update, delete on public.products to authenticated;

-- -----------------------------------------------------------------------------
-- Storage — photos de produits
--
-- Bucket public, mais les chemins sont `<org_id>/<uuid>.<ext>` : illisibles à
-- deviner. On assume ce compromis pour que les photos soient cachables par le
-- service worker — une URL signée expire, donc casse le mode hors-ligne, qui
-- est un différenciateur.
-- L'écriture, elle, reste cloisonnée par organisation.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Le premier segment du chemin doit être une organisation dont je suis membre.
-- En plpgsql avec garde d'exception : un chemin bidon renvoie `false` au lieu
-- de faire échouer la policy sur un cast invalide.
create or replace function public.owns_product_image_path(p_name text)
  returns boolean
  language plpgsql
  stable
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_org uuid;
begin
  v_org := (storage.foldername(p_name))[1]::uuid;
  return public.is_org_member(v_org);
exception
  when others then
    return false;
end;
$$;

drop policy if exists product_images_insert on storage.objects;
create policy product_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.owns_product_image_path(name)
  );

drop policy if exists product_images_update on storage.objects;
create policy product_images_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.owns_product_image_path(name))
  with check (bucket_id = 'product-images' and public.owns_product_image_path(name));

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.owns_product_image_path(name));

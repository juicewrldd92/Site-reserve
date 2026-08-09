-- Présets de stock : « Stock midi semaine », « Stock soir week-end »…
--
-- Un préset est une liste type qu'on applique d'un geste plutôt que de rajouter
-- vingt produits un par un chaque lundi. Il est rattaché à l'établissement :
-- deux restos de la même enseigne n'ont pas le même service du midi.
--
-- Une ligne de préset désigne un produit de trois façons possibles :
--   • `product_id` — produit déjà au catalogue, le cas normal ;
--   • `barcode`    — référence saisie de tête, résolue à l'application ;
--   • `label`      — nom libre, pour ce qui n'a pas de code-barres.
-- Au moins l'une des trois doit être renseignée, d'où la contrainte plus bas.

create table if not exists public.stock_presets (
  id               uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name             text not null check (length(btrim(name)) between 1 and 80),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Deux présets du même nom dans le même établissement ne s'appliqueraient qu'à
-- semer le doute au moment de choisir.
create unique index if not exists stock_presets_unique_name
  on public.stock_presets (establishment_id, lower(btrim(name)));

drop trigger if exists stock_presets_touch on public.stock_presets;
create trigger stock_presets_touch
  before update on public.stock_presets
  for each row execute function public.touch_updated_at();

create table if not exists public.stock_preset_items (
  id         uuid primary key default gen_random_uuid(),
  preset_id  uuid not null references public.stock_presets (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  label      text check (label is null or length(btrim(label)) between 1 and 200),
  barcode    text check (barcode is null or barcode ~ '^[0-9]{6,14}$'),
  quantity   numeric(12, 3) not null default 1 check (quantity > 0),
  unit       public.product_unit not null default 'piece',
  location   text not null default '',
  position   integer not null default 0,
  created_at timestamptz not null default now(),

  -- Une ligne qui ne désigne rien ne sert à rien : on refuse en base plutôt que
  -- de la découvrir vide au moment d'appliquer le préset.
  constraint stock_preset_items_designates_something
    check (product_id is not null or label is not null or barcode is not null)
);

create index if not exists stock_preset_items_preset
  on public.stock_preset_items (preset_id, position);

alter table public.stock_presets      enable row level security;
alter table public.stock_preset_items enable row level security;

-- L'accès suit celui de l'établissement : même règle que le stock lui-même.
drop policy if exists stock_presets_all on public.stock_presets;
create policy stock_presets_all on public.stock_presets
  for all to authenticated
  using (public.can_access_establishment(establishment_id))
  with check (public.can_access_establishment(establishment_id));

-- Les lignes héritent de l'accès de leur préset : une seule règle à maintenir.
drop policy if exists stock_preset_items_all on public.stock_preset_items;
create policy stock_preset_items_all on public.stock_preset_items
  for all to authenticated
  using (
    exists (
      select 1
        from public.stock_presets p
       where p.id = preset_id
         and public.can_access_establishment(p.establishment_id)
    )
  )
  with check (
    exists (
      select 1
        from public.stock_presets p
       where p.id = preset_id
         and public.can_access_establishment(p.establishment_id)
    )
  );

comment on table public.stock_presets is
  'Listes type de réassort, appliquées en un geste au stock d''un établissement.';

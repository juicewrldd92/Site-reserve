-- =============================================================================
-- 0015 — Abonnement : 14 jours d'essai réel, puis paiement
--
-- L'abonnement se règle au niveau de l'organisation, pas de l'établissement :
-- c'est l'entité qui a un propriétaire et qui paie. La facturation reste
-- comptée par établissement côté Stripe (quantité de l'abonnement).
--
-- Choix important : à l'expiration on bloque **l'écriture**, jamais la lecture.
-- Un restaurateur qui n'a pas payé doit continuer à voir et à exporter son
-- stock — le lui cacher serait prendre ses données en otage, et l'app
-- deviendrait de toute façon inutilisable sans pouvoir rien y ajouter.
--
-- Le blocage est en base et non dans l'interface : la clé anon est publique,
-- un mur en React se contourne avec trois lignes de `curl`.
-- =============================================================================

alter table public.organizations
  add column if not exists trial_ends_at timestamptz not null
    default (now() + interval '14 days'),
  add column if not exists subscription_status text not null default 'trialing'
    check (subscription_status in (
      'trialing', 'active', 'past_due', 'canceled', 'incomplete'
    )),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz;

create unique index if not exists organizations_stripe_customer
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.organizations.trial_ends_at is
  'Fin de l''essai gratuit. Fait foi tant qu''aucun abonnement Stripe n''existe.';

-- Les organisations créées avant cette migration n'avaient pas de date : on
-- leur accorde l'essai à partir de leur création, pas à partir d'aujourd'hui,
-- pour ne pas offrir 14 jours de plus à quelqu'un qui teste depuis un mois.
update public.organizations
   set trial_ends_at = created_at + interval '14 days'
 where trial_ends_at > created_at + interval '14 days';

-- -----------------------------------------------------------------------------
-- Le droit d'écrire
-- -----------------------------------------------------------------------------

/*
 * Vrai tant que l'organisation a le droit de modifier ses données.
 *
 * `stable` et non `volatile` : la fonction est appelée à chaque ligne évaluée
 * par une policy, Postgres doit pouvoir mettre son résultat en cache le temps
 * de la requête.
 *
 * `past_due` reste autorisé : un prélèvement qui échoue le 3 du mois ne doit
 * pas fermer la cuisine le 3 au matin. Stripe relance pendant plusieurs jours,
 * et bascule lui-même en `canceled` s'il n'y arrive pas.
 */
create or replace function public.org_can_write(p_org uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.organizations o
     where o.id = p_org
       and (
         -- Abonnement en cours de validité.
         (o.subscription_status in ('active', 'past_due')
           and (o.current_period_end is null or o.current_period_end > now()))
         -- Ou essai gratuit non expiré.
         or (o.subscription_status = 'trialing' and o.trial_ends_at > now())
       )
  );
$$;

/** Même question, posée depuis un établissement. */
create or replace function public.establishment_can_write(p_establishment uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select public.org_can_write(
    (select org_id from public.establishments where id = p_establishment)
  );
$$;

grant execute on function public.org_can_write(uuid) to authenticated;
grant execute on function public.establishment_can_write(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Application aux tables de données
--
-- On ne touche ni aux `select`, ni aux tables de structure (organisations,
-- établissements, membres, profils) : couper l'accès aux réglages empêcherait
-- justement de s'abonner.
-- -----------------------------------------------------------------------------

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_can_write(org_id));

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id) and public.org_can_write(org_id));

drop policy if exists stock_items_insert on public.stock_items;
create policy stock_items_insert on public.stock_items
  for insert to authenticated
  with check (
    public.can_access_establishment(establishment_id)
    and public.establishment_can_write(establishment_id)
  );

drop policy if exists stock_items_update on public.stock_items;
create policy stock_items_update on public.stock_items
  for update to authenticated
  using (public.can_access_establishment(establishment_id))
  with check (
    public.can_access_establishment(establishment_id)
    and public.establishment_can_write(establishment_id)
  );

drop policy if exists stock_batches_insert on public.stock_batches;
create policy stock_batches_insert on public.stock_batches
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.stock_items si
       where si.id = stock_item_id
         and public.can_access_establishment(si.establishment_id)
         and public.establishment_can_write(si.establishment_id)
    )
  );

drop policy if exists stock_batches_update on public.stock_batches;
create policy stock_batches_update on public.stock_batches
  for update to authenticated
  using (
    exists (
      select 1
        from public.stock_items si
       where si.id = stock_item_id
         and public.can_access_establishment(si.establishment_id)
    )
  )
  with check (
    exists (
      select 1
        from public.stock_items si
       where si.id = stock_item_id
         and public.can_access_establishment(si.establishment_id)
         and public.establishment_can_write(si.establishment_id)
    )
  );

-- Les commandes et les présets utilisent des policies `for all` : le `with
-- check` ne s'applique qu'aux écritures, la lecture reste donc ouverte.
drop policy if exists order_lists_all on public.order_lists;
create policy order_lists_all on public.order_lists
  for all to authenticated
  using (public.can_access_establishment(establishment_id))
  with check (
    public.can_access_establishment(establishment_id)
    and public.establishment_can_write(establishment_id)
  );

drop policy if exists stock_presets_all on public.stock_presets;
create policy stock_presets_all on public.stock_presets
  for all to authenticated
  using (public.can_access_establishment(establishment_id))
  with check (
    public.can_access_establishment(establishment_id)
    and public.establishment_can_write(establishment_id)
  );

-- -----------------------------------------------------------------------------
-- add_to_stock est SECURITY DEFINER : elle contourne la RLS, donc elle doit
-- refaire la vérification elle-même. Sans ça, tout le blocage ci-dessus se
-- contourne en appelant la fonction.
-- -----------------------------------------------------------------------------

create or replace function public.assert_can_write(p_establishment uuid)
  returns void
  language plpgsql
  stable
  security definer
  set search_path = public, pg_temp
as $$
begin
  if not public.establishment_can_write(p_establishment) then
    raise exception 'Abonnement expiré' using errcode = '42501';
  end if;
end;
$$;

grant execute on function public.assert_can_write(uuid) to authenticated;

comment on function public.assert_can_write(uuid) is
  'À appeler au début de toute fonction SECURITY DEFINER qui écrit du stock.';

-- -----------------------------------------------------------------------------
-- Redéfinition des fonctions SECURITY DEFINER avec la vérification d'abonnement
--
-- Corps identiques à leur dernière version (0007 et 0010), à l'appel de
-- `assert_can_write` près. Les droits d'exécution sont réaffirmés : `create or
-- replace` les conserve, mais les réécrire coûte une ligne et rend la migration
-- lisible seule.
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

  -- Abonnement : la fonction est SECURITY DEFINER, elle contourne la RLS.
  -- Sans cette ligne, tout le blocage des policies se contourne en l'appelant.
  perform public.assert_can_write(p_establishment_id);

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

  -- Abonnement : la fonction est SECURITY DEFINER, elle contourne la RLS.
  -- Sans cette ligne, tout le blocage des policies se contourne en l'appelant.
  perform public.assert_can_write(v_establishment);

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
  v_location      text;
begin
  select establishment_id into v_establishment
    from public.order_lists where id = p_order_list_id;

  if v_establishment is null then
    raise exception 'Liste introuvable' using errcode = 'P0002';
  end if;

  if not public.can_access_establishment(v_establishment) then
    raise exception 'Accès refusé à cet établissement' using errcode = '42501';
  end if;

  -- Abonnement : la fonction est SECURITY DEFINER, elle contourne la RLS.
  -- Sans cette ligne, tout le blocage des policies se contourne en l'appelant.
  perform public.assert_can_write(v_establishment);

  for v_row in
    select product_id, unit, coalesce(received_quantity, quantity) as qty
      from public.order_list_items
     where order_list_id = p_order_list_id
       and is_checked
  loop
    -- Où ranger la marchandise reçue : là où ce produit est déjà, s'il n'est
    -- présent qu'à un seul endroit.
    select si.location into v_location
      from public.stock_items si
     where si.establishment_id = v_establishment
       and si.product_id = v_row.product_id
     group by si.location
     having count(*) = 1
     limit 1;

    if (select count(distinct location) from public.stock_items
         where establishment_id = v_establishment
           and product_id = v_row.product_id) > 1 then
      v_location := '';
    end if;

    insert into public.stock_items as si (
      establishment_id, product_id, quantity, unit, location, updated_by
    )
    values (v_establishment, v_row.product_id, v_row.qty, v_row.unit,
            coalesce(v_location, ''), v_user)
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

revoke all on function public.add_to_stock(uuid, uuid, numeric, public.product_unit, text, numeric, date, numeric, smallint) from public, anon;
grant execute on function public.add_to_stock(uuid, uuid, numeric, public.product_unit, text, numeric, date, numeric, smallint) to authenticated;

revoke all on function public.fill_order_from_low_stock(uuid) from public, anon;
grant execute on function public.fill_order_from_low_stock(uuid) to authenticated;

revoke all on function public.receive_order_list(uuid) from public, anon;
grant execute on function public.receive_order_list(uuid) to authenticated;

-- =============================================================================
-- 0010 — La réception d'une commande vise le bon emplacement
--
-- BUG CORRIGÉ : `receive_order_list` insérait sans préciser d'emplacement.
-- La colonne prenant '' par défaut, un produit déjà stocké en « Frigo cuisine »
-- se voyait créer une SECONDE ligne, sans emplacement, au lieu d'incrémenter
-- l'existante. Le stock semblait donc ne pas se mettre à jour.
--
-- Désormais on réutilise l'emplacement de la ligne existante quand il n'y en a
-- qu'une. Si le produit est réparti sur plusieurs zones, on ne devine pas : la
-- réception va dans « sans emplacement », et l'utilisateur répartit lui-même.
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

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

revoke all on function public.receive_order_list(uuid) from public, anon;
grant execute on function public.receive_order_list(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Nettoyage : fusionne les emplacements en double dus à l'encodage Unicode
--
-- « Réserve sèche » s'écrit de deux façons (« è » précomposé, ou « e » + accent
-- combinant). Visuellement identiques, différents pour Postgres. Certaines
-- saisies sur Mac et iOS produisent la seconde forme.
-- -----------------------------------------------------------------------------
update public.stock_items
   set location = normalize(location, NFC)
 where location <> normalize(location, NFC);

update public.establishments e
   set locations = sub.cleaned
  from (
    select e2.id,
           array_agg(distinct normalize(l, NFC) order by normalize(l, NFC)) as cleaned
      from public.establishments e2, unnest(e2.locations) as l
     group by e2.id
  ) sub
 where e.id = sub.id
   and e.locations is distinct from sub.cleaned;

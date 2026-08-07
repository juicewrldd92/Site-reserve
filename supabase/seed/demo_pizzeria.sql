-- =============================================================================
-- Jeu de démonstration — pizzeria
--
-- 14 produits : 9 scannés (vrais codes-barres et vraies photos issues d'Open
-- Food Facts) et 5 sans code-barre, parce que c'est la réalité d'une cuisine
-- et que c'est ce qui distingue Réserve.
--
-- Les quantités sont choisies pour qu'un service normal ait déjà entamé le
-- stock : quelques produits sous leur seuil, quelques DLC proches, un périmé.
-- L'app a donc quelque chose à montrer dès l'ouverture.
--
-- EXCEPTION ASSUMÉE : les photos pointent ici directement vers Open Food Facts,
-- alors que l'app les recopie normalement dans son propre Storage. Un script
-- SQL ne peut pas téléverser d'images. Pour une démo c'est sans conséquence ;
-- ne pas s'en inspirer pour du code applicatif.
--
-- Rejouable : relancer le script remet les quantités aux valeurs de démo.
-- =============================================================================

do $$
declare
  v_est   uuid;
  v_org   uuid;
  v_row   record;
  v_prod  uuid;
  v_item  uuid;
begin
  -- Cible : l'établissement le plus récemment créé. Pour en viser un autre,
  -- remplacer par son identifiant.
  select e.id, e.org_id into v_est, v_org
    from public.establishments e
   order by e.created_at desc
   limit 1;

  if v_est is null then
    raise exception 'Aucun établissement : termine l''inscription avant de charger la démo.';
  end if;

  -- Les emplacements utilisés par la démo doivent exister dans l'établissement.
  update public.establishments
     set locations = (
       select array_agg(distinct l)
         from unnest(locations || array['Frigo cuisine', 'Réserve sèche']) as l
     )
   where id = v_est;

  for v_row in
    select * from (values
    ('3564700004623', 'Tomates entières pelées au jus', 'Marque Repère', 'https://images.openfoodfacts.org/images/products/356/470/000/4623/front_fr.65.400.jpg', 'Épicerie', 'boite'::public.product_unit, 'openfoodfacts'::public.product_source, 18, 12, 36, 'Réserve sèche', null),
    ('8000430138719', 'Mozzarella', 'Galbani', 'https://images.openfoodfacts.org/images/products/800/043/013/8719/front_en.91.400.jpg', 'Crèmerie', 'piece'::public.product_unit, 'openfoodfacts'::public.product_source, 6, 8, 24, 'Frigo cuisine', 2),
    ('3245414662926', 'Farine de blé type 55', 'Carrefour', 'https://images.openfoodfacts.org/images/products/324/541/466/2926/front_fr.95.400.jpg', 'Épicerie', 'sac'::public.product_unit, 'openfoodfacts'::public.product_source, 4, 3, 10, 'Réserve sèche', null),
    ('3250392334352', 'Parmigiano reggiano aop rape 12 mois lc 60g', 'Itinéraire des Saveurs', 'https://images.openfoodfacts.org/images/products/325/039/233/4352/front_fr.45.400.jpg', 'Crèmerie', 'piece'::public.product_unit, 'openfoodfacts'::public.product_source, 2, 3, 8, 'Frigo cuisine', 25),
    ('3155250001554', 'Crème fraîche épaisse', 'Bridélice', 'https://images.openfoodfacts.org/images/products/315/525/000/1554/front_fr.138.400.jpg', 'Crèmerie', 'brique'::public.product_unit, 'openfoodfacts'::public.product_source, 3, 4, 12, 'Frigo cuisine', 6),
    ('3302740047367', 'Le Supérieur - à l''Etouffée - Conservation sans Nitrite', 'Fleury Michon', 'https://images.openfoodfacts.org/images/products/330/274/004/7367/front_fr.304.400.jpg', 'Viande', 'barquette'::public.product_unit, 'openfoodfacts'::public.product_source, 2, 3, 9, 'Frigo cuisine', 1),
    ('3083681120578', 'Champignon émincé sans sulfite 1/2', 'Bonduelle', 'https://images.openfoodfacts.org/images/products/308/368/112/0578/front_fr.39.400.jpg', 'Épicerie', 'boite'::public.product_unit, 'openfoodfacts'::public.product_source, 9, 6, 18, 'Réserve sèche', null),
    ('3017230000059', 'Olives noires confites dénoyautées bocal 150g', 'Tramier', 'https://images.openfoodfacts.org/images/products/301/723/000/0059/front_fr.71.400.jpg', 'Épicerie', 'boite'::public.product_unit, 'openfoodfacts'::public.product_source, 5, 4, 12, 'Réserve sèche', null),
    ('3068111752222', 'Ma levure boulangère', 'Francine', 'https://images.openfoodfacts.org/images/products/306/811/175/2222/front_en.104.400.jpg', 'Épicerie', 'sachet'::public.product_unit, 'openfoodfacts'::public.product_source, 7, 4, 12, 'Réserve sèche', null),
    (null, 'Pâte à pizza maison', null, null, 'Mise en place', 'piece'::public.product_unit, 'manual'::public.product_source, 24, 10, 40, 'Frigo cuisine', 2),
    (null, 'Basilic frais', null, null, 'Fruits & légumes', 'botte'::public.product_unit, 'manual'::public.product_source, 3, 4, 10, 'Frigo cuisine', 3),
    (null, 'Roquette', null, null, 'Fruits & légumes', 'sachet'::public.product_unit, 'manual'::public.product_source, 1, 3, 8, 'Frigo cuisine', 4),
    (null, 'Origan sec', null, null, 'Épicerie', 'sachet'::public.product_unit, 'manual'::public.product_source, 2, 2, 6, 'Réserve sèche', null),
    (null, 'Sauce tomate maison', null, null, 'Mise en place', 'l'::public.product_unit, 'manual'::public.product_source, 4, 3, 10, 'Frigo cuisine', 4)
    ) as t(barcode, name, brand, image_url, category, unit, source,
           qty, mini, opti, location, dlc_days)
  loop
    -- Produit : on réutilise celui qui existe déjà pour rester rejouable.
    select p.id into v_prod
      from public.products p
     where p.org_id = v_org
       and (
         (v_row.barcode is not null and p.barcode = v_row.barcode)
         or (v_row.barcode is null and p.name = v_row.name)
       )
     limit 1;

    if v_prod is null then
      insert into public.products (org_id, barcode, name, brand, image_url,
                                   category, default_unit, source)
      values (v_org, v_row.barcode, v_row.name, v_row.brand, v_row.image_url,
              v_row.category, v_row.unit, v_row.source)
      returning id into v_prod;
    end if;

    insert into public.stock_items as si (
      establishment_id, product_id, quantity, unit,
      min_threshold, target_quantity, location
    )
    values (v_est, v_prod, v_row.qty, v_row.unit,
            v_row.mini, v_row.opti, v_row.location)
    on conflict (establishment_id, product_id, location) do update
      set quantity        = excluded.quantity,
          min_threshold   = excluded.min_threshold,
          target_quantity = excluded.target_quantity
    returning si.id into v_item;

    -- Lot daté, quand le produit est périssable.
    if v_row.dlc_days is not null then
      delete from public.stock_batches where stock_item_id = v_item;
      insert into public.stock_batches (stock_item_id, quantity, expiry_date)
      values (v_item, v_row.qty, current_date + v_row.dlc_days);
    end if;
  end loop;

  -- Un produit périmé : sans lui, l'écran d'alertes ne montre pas son cas le
  -- plus rouge, celui qui accroche l'œil en démonstration.
  update public.stock_batches
     set expiry_date = current_date - 1
   where stock_item_id = (
     select si.id from public.stock_items si
     join public.products p on p.id = si.product_id
     where si.establishment_id = v_est and p.name ilike 'crème fraîche%'
     limit 1
   );

  raise notice 'Démo pizzeria chargée sur l''établissement %', v_est;
end
$$;

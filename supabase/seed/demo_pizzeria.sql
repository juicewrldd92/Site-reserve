-- =============================================================================
-- Jeu de démonstration — pizzeria complète (45 produits)
--
-- 25 produits scannés (vrais codes-barres et photos vérifiés sur Open Food
-- Facts) et 20 sans code-barre : le frais, la mise en place, les consommables.
-- C'est la répartition réelle d'une cuisine, et ce qui distingue Réserve.
--
-- Les quantités placent d'emblée quelques produits sous leur seuil, plusieurs
-- DLC proches et un périmé : l'app a quelque chose à montrer dès l'ouverture.
--
-- EXCEPTION ASSUMÉE : les photos pointent directement vers Open Food Facts,
-- alors que l'app les recopie normalement dans son Storage. Un script SQL ne
-- peut pas téléverser d'images. Sans conséquence pour une démo.
--
-- Rejouable : relancer remet les quantités aux valeurs de démo.
-- =============================================================================

do $$
declare
  -- ┌─────────────────────────────────────────────────────────────────────┐
  -- │ CHOISIS TON ÉTABLISSEMENT ICI.                                      │
  -- │ Laisse NULL pour prendre le seul que tu as, ou écris son nom exact  │
  -- │ entre apostrophes, par exemple : 'Le Castello'                      │
  -- └─────────────────────────────────────────────────────────────────────┘
  c_etablissement constant text := null;

  v_est   uuid;
  v_org   uuid;
  v_nom   text;
  v_n     integer;
  v_row   record;
  v_prod  uuid;
  v_item  uuid;
begin
  if c_etablissement is null then
    select count(*) into v_n from public.establishments;
    if v_n > 1 then
      raise exception
        'Tu as % établissements. Écris lequel viser dans c_etablissement en haut du script. Disponibles : %',
        v_n, (select string_agg(name, ' / ') from public.establishments);
    end if;
    select e.id, e.org_id, e.name into v_est, v_org, v_nom
      from public.establishments e limit 1;
  else
    select e.id, e.org_id, e.name into v_est, v_org, v_nom
      from public.establishments e
     where e.name = c_etablissement
     limit 1;
    if v_est is null then
      raise exception 'Aucun établissement nommé « % ». Disponibles : %',
        c_etablissement, (select string_agg(name, ' / ') from public.establishments);
    end if;
  end if;

  -- Les emplacements de la démo doivent exister, sans créer de doublon
  -- d'encodage : on compare et on stocke en forme normalisée.
  update public.establishments
     set locations = (
       select array_agg(distinct normalize(l, NFC) order by normalize(l, NFC))
         from unnest(locations || array['Frigo cuisine', 'Réserve sèche', 'Frigo bar']) as l
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
    ('6111162001201', 'Delicia double concentre de tomates', 'Delicia', 'https://images.openfoodfacts.org/images/products/611/116/200/1201/front_en.19.400.jpg', 'Épicerie', 'boite'::public.product_unit, 'openfoodfacts'::public.product_source, 14, 8, 24, 'Réserve sèche', null),
    ('8029689026066', 'PASSATA', 'Bio organica', 'https://images.openfoodfacts.org/images/products/802/968/902/6066/front_fr.3.400.jpg', 'Épicerie', 'bouteille'::public.product_unit, 'openfoodfacts'::public.product_source, 11, 8, 24, 'Réserve sèche', null),
    ('8422767123211', 'El nuestro aceite de oliva virgen extra bidón', 'Hojiblanca', 'https://images.openfoodfacts.org/images/products/842/276/712/3211/front_fr.19.400.jpg', 'Épicerie', 'bidon'::public.product_unit, 'openfoodfacts'::public.product_source, 3, 2, 6, 'Réserve sèche', null),
    ('3523230028431', 'La bûche Sainte-Maure (Poitou-Charentes', 'Soignon', 'https://images.openfoodfacts.org/images/products/352/323/002/8431/front_en.175.400.jpg', 'Crèmerie', 'piece'::public.product_unit, 'openfoodfacts'::public.product_source, 4, 3, 8, 'Frigo cuisine', 9),
    ('3228021170046', 'Emmental râpé', 'PRÉSIDENT', 'https://images.openfoodfacts.org/images/products/322/802/117/0046/front_fr.154.400.jpg', 'Crèmerie', 'sachet'::public.product_unit, 'openfoodfacts'::public.product_source, 5, 4, 12, 'Frigo cuisine', 14),
    ('3181450100599', 'CHORIZO Doux', 'Cesar Moroni', 'https://images.openfoodfacts.org/images/products/318/145/010/0599/front_fr.55.400.jpg', 'Viande', 'piece'::public.product_unit, 'openfoodfacts'::public.product_source, 3, 2, 6, 'Frigo cuisine', 18),
    ('20437022', 'Salami', 'Dulano', 'https://images.openfoodfacts.org/images/products/000/002/043/7022/front_en.36.400.jpg', 'Viande', 'piece'::public.product_unit, 'openfoodfacts'::public.product_source, 2, 2, 6, 'Frigo cuisine', 21),
    ('3154230050667', 'HERTA allumettes de Bacon 2x100g - 200g', 'Herta', 'https://images.openfoodfacts.org/images/products/315/423/005/0667/front_fr.152.400.jpg', 'Viande', 'barquette'::public.product_unit, 'openfoodfacts'::public.product_source, 4, 3, 9, 'Frigo cuisine', 5),
    ('3256224375104', 'Thon blanc entier huile d''olive boîte de 160g', 'U', 'https://images.openfoodfacts.org/images/products/325/622/437/5104/front_fr.41.400.jpg', 'Épicerie', 'boite'::public.product_unit, 'openfoodfacts'::public.product_source, 8, 6, 16, 'Réserve sèche', null),
    ('3218370011114', 'Filets d''anchois allongés à l''huile d''olive', 'Micéli', 'https://images.openfoodfacts.org/images/products/321/837/001/1114/front_fr.30.400.jpg', 'Épicerie', 'boite'::public.product_unit, 'openfoodfacts'::public.product_source, 3, 3, 8, 'Réserve sèche', null),
    ('3250391531349', 'Bocal 280 g Poivrons grillés', 'Bouton d''or', 'https://images.openfoodfacts.org/images/products/325/039/153/1349/front_fr.16.400.jpg', 'Épicerie', 'bouteille'::public.product_unit, 'openfoodfacts'::public.product_source, 4, 3, 8, 'Réserve sèche', null),
    ('3038354199603', 'Panzani sauce pesto basilic 200g', 'Panzani', 'https://images.openfoodfacts.org/images/products/303/835/419/9603/front_en.221.400.jpg', 'Épicerie', 'bouteille'::public.product_unit, 'openfoodfacts'::public.product_source, 2, 2, 6, 'Réserve sèche', null),
    ('5449000054227', 'Coca-Cola Original Taste', 'Coca Cola Life', 'https://images.openfoodfacts.org/images/products/544/900/005/4227/front_en.543.400.jpg', 'Boisson', 'bouteille'::public.product_unit, 'openfoodfacts'::public.product_source, 28, 24, 72, 'Réserve sèche', null),
    ('6111035000058', 'Eau minérale naturelle', 'sidi ali', 'https://images.openfoodfacts.org/images/products/611/103/500/0058/front_en.134.400.jpg', 'Boisson', 'bouteille'::public.product_unit, 'openfoodfacts'::public.product_source, 35, 24, 72, 'Réserve sèche', null),
    ('3080216049632', 'Grimbergen Blonde', 'GRIMBERGEN', 'https://images.openfoodfacts.org/images/products/308/021/604/9632/front_fr.276.400.jpg', 'Boisson', 'bouteille'::public.product_unit, 'openfoodfacts'::public.product_source, 18, 24, 60, 'Frigo bar', null),
    ('3564700004524', 'Farine de blé T45', 'Marque Repère', 'https://images.openfoodfacts.org/images/products/356/470/000/4524/front_fr.64.400.jpg', 'Épicerie', 'sac'::public.product_unit, 'openfoodfacts'::public.product_source, 6, 4, 12, 'Réserve sèche', null),
    (null, 'Pâte à pizza (pâtons)', null, null, 'Mise en place', 'piece'::public.product_unit, 'manual'::public.product_source, 36, 20, 60, 'Frigo cuisine', 2),
    (null, 'Sauce tomate maison', null, null, 'Mise en place', 'l'::public.product_unit, 'manual'::public.product_source, 5, 4, 12, 'Frigo cuisine', 4),
    (null, 'Mozzarella fior di latte', null, null, 'Crèmerie', 'kg'::public.product_unit, 'manual'::public.product_source, 4, 5, 12, 'Frigo cuisine', 3),
    (null, 'Basilic frais', null, null, 'Fruits & légumes', 'botte'::public.product_unit, 'manual'::public.product_source, 3, 4, 10, 'Frigo cuisine', 3),
    (null, 'Roquette', null, null, 'Fruits & légumes', 'sachet'::public.product_unit, 'manual'::public.product_source, 1, 3, 8, 'Frigo cuisine', 4),
    (null, 'Tomates cerises', null, null, 'Fruits & légumes', 'barquette'::public.product_unit, 'manual'::public.product_source, 6, 4, 12, 'Frigo cuisine', 5),
    (null, 'Oignons rouges', null, null, 'Fruits & légumes', 'kg'::public.product_unit, 'manual'::public.product_source, 4, 3, 8, 'Réserve sèche', null),
    (null, 'Ail', null, null, 'Fruits & légumes', 'kg'::public.product_unit, 'manual'::public.product_source, 1, 1, 3, 'Réserve sèche', null),
    (null, 'Courgettes', null, null, 'Fruits & légumes', 'kg'::public.product_unit, 'manual'::public.product_source, 3, 2, 6, 'Frigo cuisine', 6),
    (null, 'Aubergines', null, null, 'Fruits & légumes', 'kg'::public.product_unit, 'manual'::public.product_source, 2, 2, 6, 'Frigo cuisine', 6),
    (null, 'Pommes de terre', null, null, 'Fruits & légumes', 'kg'::public.product_unit, 'manual'::public.product_source, 12, 8, 25, 'Réserve sèche', null),
    (null, 'Œufs', null, null, 'Crèmerie', 'piece'::public.product_unit, 'manual'::public.product_source, 30, 24, 60, 'Frigo cuisine', 12),
    (null, 'Origan sec', null, null, 'Épicerie', 'sachet'::public.product_unit, 'manual'::public.product_source, 2, 2, 6, 'Réserve sèche', null),
    (null, 'Sel fin', null, null, 'Épicerie', 'kg'::public.product_unit, 'manual'::public.product_source, 5, 3, 10, 'Réserve sèche', null),
    (null, 'Semoule de blé dur', null, null, 'Épicerie', 'kg'::public.product_unit, 'manual'::public.product_source, 3, 2, 8, 'Réserve sèche', null),
    (null, 'Miel', null, null, 'Épicerie', 'bouteille'::public.product_unit, 'manual'::public.product_source, 2, 1, 4, 'Réserve sèche', null),
    (null, 'Speck', null, null, 'Viande', 'kg'::public.product_unit, 'manual'::public.product_source, 1, 1, 3, 'Frigo cuisine', 11),
    (null, 'Tiramisu maison', null, null, 'Mise en place', 'piece'::public.product_unit, 'manual'::public.product_source, 12, 8, 24, 'Frigo cuisine', 2),
    (null, 'Cartons à pizza 33 cm', null, null, 'Consommable', 'piece'::public.product_unit, 'manual'::public.product_source, 140, 80, 300, 'Réserve sèche', null),
    (null, 'Film alimentaire', null, null, 'Consommable', 'piece'::public.product_unit, 'manual'::public.product_source, 3, 2, 6, 'Réserve sèche', null)
    ) as t(barcode, name, brand, image_url, category, unit, source,
           qty, mini, opti, location, dlc_days)
  loop
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
            v_row.mini, v_row.opti, normalize(v_row.location, NFC))
    on conflict (establishment_id, product_id, location) do update
      set quantity        = excluded.quantity,
          min_threshold   = excluded.min_threshold,
          target_quantity = excluded.target_quantity
    returning si.id into v_item;

    if v_row.dlc_days is not null then
      delete from public.stock_batches where stock_item_id = v_item;
      insert into public.stock_batches (stock_item_id, quantity, expiry_date)
      values (v_item, v_row.qty, current_date + v_row.dlc_days);
    end if;
  end loop;

  -- Un périmé : sans lui, l'écran d'alertes ne montre pas son cas le plus
  -- rouge, celui qui accroche l'œil en démonstration.
  update public.stock_batches
     set expiry_date = current_date - 1
   where stock_item_id = (
     select si.id from public.stock_items si
     join public.products p on p.id = si.product_id
     where si.establishment_id = v_est and p.name ilike 'crème fraîche%'
     limit 1
   );

  select count(*) into v_n from public.stock_items where establishment_id = v_est;
  raise notice 'Démo chargée sur « % » — % lignes de stock au total.', v_nom, v_n;
end
$$;

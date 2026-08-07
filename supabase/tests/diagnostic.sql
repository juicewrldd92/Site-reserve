-- =============================================================================
-- Diagnostic — où sont réellement les produits ?
--
-- Lecture seule. À coller dans le SQL editor et à relancer autant que besoin.
-- =============================================================================

select
  e.name                                             as etablissement,
  left(e.id::text, 8)                                as id_court,
  o.name                                             as organisation,
  (select count(*) from public.stock_items si
    where si.establishment_id = e.id)                as lignes_de_stock,
  (select count(*) from public.products p
    where p.org_id = e.org_id)                       as produits_au_catalogue,
  (select count(*) from public.stock_batches sb
     join public.stock_items si2 on si2.id = sb.stock_item_id
    where si2.establishment_id = e.id)               as lots_dates,
  array_to_string(e.locations, ' | ')                as emplacements,
  (select string_agg(pr.name, ', ')
     from (
       select p2.name
         from public.stock_items si3
         join public.products p2 on p2.id = si3.product_id
        where si3.establishment_id = e.id
        order by p2.name
        limit 4
     ) pr)                                           as apercu_produits
from public.establishments e
join public.organizations o on o.id = e.org_id
order by lignes_de_stock desc, e.created_at desc;

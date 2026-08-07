-- =============================================================================
-- Diagnostic — que contient réellement la base ?
--
-- Lecture seule : ne modifie rien. À coller dans le SQL editor.
-- =============================================================================

with cible as (
  select id, name, locations
    from public.establishments
   order by created_at desc
   limit 1
)
select 1 as ordre, 'organisations' as objet, count(*)::text as nombre,
       coalesce(string_agg(name, ' | '), '—') as detail
  from public.organizations

union all
select 2, 'établissements', count(*)::text,
       coalesce(string_agg(name || ' [' || left(id::text, 8) || ']', ' | '), '—')
  from public.establishments

union all
select 3, '  → ciblé par la démo', '1',
       coalesce((select name || ' [' || left(id::text, 8) || ']' from cible), '— aucun')

union all
select 4, '  → ses emplacements',
       coalesce((select array_length(locations, 1)::text from cible), '0'),
       coalesce((select array_to_string(locations, ' | ') from cible), '—')

union all
select 5, 'produits au catalogue', (select count(*)::text from public.products),
       coalesce((select string_agg(name, ' | ') from (
         select name from public.products order by created_at desc limit 6
       ) p), '— aucun produit')

union all
select 6, 'lignes de stock', count(*)::text,
       coalesce(string_agg(distinct left(establishment_id::text, 8), ' | '),
                '— aucune, la démo n''a pas été chargée')
  from public.stock_items

union all
select 7, 'lots datés', count(*)::text,
       coalesce(min(expiry_date)::text || ' → ' || max(expiry_date)::text, '—')
  from public.stock_batches

order by ordre;

-- =============================================================================
-- 0012 — Répare les textes abîmés par une conversion d'encodage
--
-- Les scripts de démonstration ont transité par un presse-papier macOS sans
-- locale UTF-8 : les octets UTF-8 ont été relus comme du Mac OS Roman.
-- « Œufs » est devenu « ≈íufs », « Crèmerie » est devenu « Cr√®merie ».
--
-- Réparation : on ré-encode le texte abîmé en octets Mac OS Roman — ce qui
-- redonne les octets UTF-8 d'origine — puis on les relit en UTF-8.
--
-- Garde-fou : seules les lignes portant une signature de mojibake (√ ≈ ¬ Â Ã)
-- sont touchées. Un texte sain n'est jamais converti, sinon on l'abîmerait.
--
-- Migration idempotente : après réparation, plus aucune ligne ne correspond.
-- =============================================================================

create or replace function public.repair_mojibake(p_text text)
  returns text
  language plpgsql
  immutable
as $$
begin
  return convert_from(convert_to(p_text, 'MACINTOSH'), 'UTF8');
exception
  -- Un caractère hors du jeu Mac OS Roman : le texte n'était pas abîmé de
  -- cette façon, on le laisse tel quel.
  when others then
    return p_text;
end;
$$;

do $$
declare
  v_prod integer;
  v_cat  integer;
  v_loc  integer;
  v_est  integer;
begin
  select count(*) into v_prod from public.products where name ~ '[√≈¬ÂÃ]';
  select count(*) into v_cat  from public.products where category ~ '[√≈¬ÂÃ]';
  select count(*) into v_loc  from public.stock_items where location ~ '[√≈¬ÂÃ]';
  select count(*) into v_est
    from public.establishments e, unnest(e.locations) l where l ~ '[√≈¬ÂÃ]';

  raise notice 'À réparer : % nom(s) de produit, % catégorie(s), % emplacement(s) de stock, % dans les établissements',
    v_prod, v_cat, v_loc, v_est;
end
$$;

update public.products
   set name = public.repair_mojibake(name)
 where name ~ '[√≈¬ÂÃ]';

update public.products
   set category = public.repair_mojibake(category)
 where category ~ '[√≈¬ÂÃ]';

update public.products
   set brand = public.repair_mojibake(brand)
 where brand ~ '[√≈¬ÂÃ]';

update public.stock_items
   set location = public.repair_mojibake(location)
 where location ~ '[√≈¬ÂÃ]';

update public.establishments e
   set locations = sub.fixed
  from (
    select e2.id,
           array_agg(distinct normalize(public.repair_mojibake(l), NFC)
                     order by normalize(public.repair_mojibake(l), NFC)) as fixed
      from public.establishments e2, unnest(e2.locations) as l
     group by e2.id
  ) sub
 where e.id = sub.id
   and e.locations is distinct from sub.fixed;

update public.establishments
   set name = public.repair_mojibake(name)
 where name ~ '[√≈¬ÂÃ]';

update public.organizations
   set name = public.repair_mojibake(name)
 where name ~ '[√≈¬ÂÃ]';

-- La faute d'accent d'origine, une fois le texte relisible.
update public.products set category = 'Crémerie' where category = 'Crèmerie';

do $$
declare v_reste integer;
begin
  select count(*) into v_reste from public.products where name ~ '[√≈¬ÂÃ]';
  raise notice 'Terminé. Restant : % produit(s) encore abîmé(s).', v_reste;
end
$$;

-- =============================================================================
-- 0011 — Corrige « Crèmerie » en « Crémerie »
--
-- Le mot français prend un accent aigu : crémerie, comme crémier. J'avais
-- écrit un accent grave dans la liste des catégories, et la faute s'est
-- propagée aux produits déjà enregistrés.
--
-- Migration idempotente.
-- =============================================================================

update public.products
   set category = 'Crémerie'
 where category = 'Crèmerie';

-- Tant qu'on y est : on normalise toutes les catégories et tous les
-- emplacements en forme NFC, pour qu'aucun accent saisi en forme décomposée
-- (fréquent sur Mac et iOS) ne crée de doublon invisible.
update public.products
   set category = normalize(category, NFC)
 where category is not null
   and category <> normalize(category, NFC);

update public.products
   set name = normalize(name, NFC)
 where name <> normalize(name, NFC);

update public.stock_items
   set location = normalize(location, NFC)
 where location <> normalize(location, NFC);

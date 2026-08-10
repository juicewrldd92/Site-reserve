-- =============================================================================
-- Nettoyage des comptes de test + accès permanent pour le compte propriétaire
--
-- ⚠️  DESTRUCTIF ET IRRÉVERSIBLE. Lis-le en entier avant de lancer quoi que ce
--     soit. Il s'exécute en trois temps : on regarde, on vérifie, on supprime.
--
-- Renseigne ton adresse ci-dessous, c'est la seule chose à modifier.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ÉTAPE 1 — Regarder ce qui existe. Ne supprime rien.
-- -----------------------------------------------------------------------------

select
  u.email,
  o.name                    as organisation,
  o.subscription_status     as abonnement,
  o.trial_ends_at::date     as fin_essai,
  (select count(*) from public.establishments e where e.org_id = o.id)  as etablissements,
  (select count(*) from public.stock_items si
     join public.establishments e on e.id = si.establishment_id
    where e.org_id = o.id)                                              as lignes_de_stock,
  o.created_at::date        as creee_le
from public.organizations o
join auth.users u on u.id = o.owner_id
order by o.created_at;

-- -----------------------------------------------------------------------------
-- ÉTAPE 2 — Ton compte : accès permanent, sans paiement.
--
-- On ne triche pas avec Stripe : on prolonge l'essai de dix ans. Le statut
-- reste `trialing`, donc si tu t'abonnes un jour le webhook prendra le relais
-- proprement, sans état incohérent à démêler.
-- -----------------------------------------------------------------------------

update public.organizations o
   set trial_ends_at = now() + interval '10 years'
  from auth.users u
 where u.id = o.owner_id
   and u.email = 'matthieu.bensemhoun@gmail.com';   -- ← ton adresse

-- Vérifie que la ligne ci-dessus a bien touché tes organisations avant de
-- passer à l'étape 3 : `UPDATE 0` voudrait dire que l'adresse ne correspond à
-- rien, et l'étape suivante effacerait alors absolument tout.

-- -----------------------------------------------------------------------------
-- ÉTAPE 3 — Supprimer les autres comptes.
--
-- Décommente le bloc quand l'étape 1 t'a montré exactement ce qui va partir.
-- Les établissements, produits, stocks et commandes suivent par cascade.
-- -----------------------------------------------------------------------------

-- do $$
-- declare
--   v_garde text := 'matthieu.bensemhoun@gmail.com';   -- ← ton adresse
--   v_orgs  integer;
--   v_users integer;
-- begin
--   -- Garde-fou : si l'adresse ne correspond à aucun compte, on s'arrête.
--   -- Sans ça, une faute de frappe effacerait la base entière.
--   if not exists (select 1 from auth.users where email = v_garde) then
--     raise exception 'Adresse % introuvable — rien n''a été supprimé.', v_garde;
--   end if;
--
--   delete from public.organizations o
--    where o.owner_id not in (select id from auth.users where email = v_garde);
--   get diagnostics v_orgs = row_count;
--
--   -- Les comptes sans organisation : inscriptions abandonnées en cours de route.
--   delete from auth.users u
--    where u.email <> v_garde
--      and not exists (select 1 from public.organizations o where o.owner_id = u.id);
--   get diagnostics v_users = row_count;
--
--   raise notice '% organisation(s) et % compte(s) supprimés.', v_orgs, v_users;
-- end $$;

-- -----------------------------------------------------------------------------
-- ÉTAPE 4 — Contrôle final.
-- -----------------------------------------------------------------------------

select u.email, o.name, o.trial_ends_at::date as acces_jusqu_au
  from public.organizations o
  join auth.users u on u.id = o.owner_id;

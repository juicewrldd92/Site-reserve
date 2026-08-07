-- =============================================================================
-- Suppression de « Le Castello » et « Chez marco »
--
-- ⚠️  IRRÉVERSIBLE. Emporte, pour ces deux organisations uniquement :
--     établissements, produits, lignes de stock, lots datés, commandes,
--     fournisseurs, invitations et adhésions.
--
-- « Chez marcoo » n'est pas concernée : les noms sont écrits en dur, le script
-- ne peut pas déborder sur autre chose.
--
-- Ton compte utilisateur n'est pas supprimé — seulement ces organisations.
-- =============================================================================

do $$
declare
  c_a_supprimer constant text[] := array['Le Castello', 'Chez marco'];

  v_orgs   uuid[];
  v_noms   text;
  v_est    integer;
  v_prod   integer;
  v_stock  integer;
begin
  select array_agg(id), string_agg(name, ' / ')
    into v_orgs, v_noms
    from public.organizations
   where name = any(c_a_supprimer);

  if v_orgs is null then
    raise notice 'Aucune organisation à ce nom. Rien à faire.';
    return;
  end if;

  -- On mesure avant de couper, pour que la trace dise ce qui a disparu.
  select count(*) into v_est
    from public.establishments where org_id = any(v_orgs);

  select count(*) into v_prod
    from public.products where org_id = any(v_orgs);

  select count(*) into v_stock
    from public.stock_items si
    join public.establishments e on e.id = si.establishment_id
   where e.org_id = any(v_orgs);

  raise notice 'Suppression de : %', v_noms;
  raise notice '  % établissement(s), % produit(s), % ligne(s) de stock',
    v_est, v_prod, v_stock;

  -- Les clés étrangères sont en ON DELETE CASCADE : une seule suppression
  -- suffit, le reste suit.
  delete from public.organizations where id = any(v_orgs);

  raise notice 'Terminé. Organisations restantes : %',
    (select string_agg(name, ' / ') from public.organizations);
end
$$;

-- =============================================================================
-- 0003 — Lecture explicite du bucket product-images
--
-- Sans policy `select`, la RLS refuse le listing par défaut : le comportement
-- est correct, mais implicite. On l'écrit noir sur blanc, et on en profite
-- pour rendre le listing utilisable par les membres de l'organisation.
--
-- Note : la lecture d'une photo par son URL publique
-- (/storage/v1/object/public/…) ne passe pas par cette policy — c'est voulu,
-- pour que le service worker puisse mettre les images en cache hors-ligne.
-- Seul l'inventaire des chemins est cloisonné.
-- =============================================================================

drop policy if exists product_images_select on storage.objects;
create policy product_images_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'product-images'
    and public.owns_product_image_path(name)
  );

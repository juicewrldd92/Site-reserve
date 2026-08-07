-- =============================================================================
-- 0009 — Photo d'établissement
--
-- Une photo d'établissement appartient à l'organisation, pas à une personne :
-- le cloisonnement se fait donc sur `org_id`, comme pour les photos produit,
-- et non sur l'identifiant de l'utilisateur comme pour les avatars.
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

alter table public.establishments
  add column if not exists image_url text;

-- -----------------------------------------------------------------------------
-- Bucket dédié
--
-- On aurait pu réutiliser `product-images`, dont la règle d'accès est
-- identique — mais y ranger des devantures de restaurant rendrait le nom
-- menteur, et le jour où l'on voudra purger les photos produit, on emporterait
-- les autres avec.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'establishment-images', 'establishment-images', true, 2097152,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Le premier segment du chemin doit être une organisation dont je suis membre.
-- Même garde que pour les autres buckets : un chemin malformé renvoie `false`
-- au lieu de faire échouer la policy sur un cast invalide.
create or replace function public.owns_org_storage_path(p_name text)
  returns boolean
  language plpgsql
  stable
  security definer
  set search_path = public, pg_temp
as $$
begin
  return public.is_org_member((storage.foldername(p_name))[1]::uuid);
exception
  when others then
    return false;
end;
$$;

drop policy if exists establishment_images_select on storage.objects;
create policy establishment_images_select on storage.objects
  for select to authenticated
  using (bucket_id = 'establishment-images' and public.owns_org_storage_path(name));

drop policy if exists establishment_images_insert on storage.objects;
create policy establishment_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'establishment-images' and public.owns_org_storage_path(name));

drop policy if exists establishment_images_update on storage.objects;
create policy establishment_images_update on storage.objects
  for update to authenticated
  using (bucket_id = 'establishment-images' and public.owns_org_storage_path(name))
  with check (bucket_id = 'establishment-images' and public.owns_org_storage_path(name));

drop policy if exists establishment_images_delete on storage.objects;
create policy establishment_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'establishment-images' and public.owns_org_storage_path(name));

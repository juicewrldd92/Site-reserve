-- =============================================================================
-- 0008 — Photos de profil
--
-- Bucket séparé de `product-images` : une photo de profil appartient à une
-- personne, pas à une organisation. Le cloisonnement ne se fait donc pas sur
-- le même critère.
--
-- Chemins en `<user_id>/<uuid>.webp`. Bucket public en lecture, comme les
-- photos produit, pour que le service worker puisse les mettre en cache — une
-- URL signée expirerait et laisserait des ronds vides hors-ligne.
--
-- Migration idempotente : ré-exécutable sans effet de bord.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 1048576,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 1 Mo de limite : les photos sont redimensionnées à 256 px côté client et
-- pèsent quelques dizaines de kilo-octets. La limite est là pour empêcher
-- qu'une photo brute de 12 Mo passe si le redimensionnement échoue.

-- Le premier segment du chemin doit être l'identifiant de la personne connectée.
-- En plpgsql avec garde : un chemin malformé renvoie `false` au lieu de faire
-- échouer la policy sur un cast invalide.
create or replace function public.owns_avatar_path(p_name text)
  returns boolean
  language plpgsql
  stable
  security definer
  set search_path = public, pg_temp
as $$
begin
  return (storage.foldername(p_name))[1]::uuid = auth.uid();
exception
  when others then
    return false;
end;
$$;

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.owns_avatar_path(name));

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.owns_avatar_path(name))
  with check (bucket_id = 'avatars' and public.owns_avatar_path(name));

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.owns_avatar_path(name));

-- Lecture explicite, comme pour les photos produit : on ne dépend pas de
-- l'absence de policy pour refuser le listing.
drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.owns_avatar_path(name));

import { prepareImage } from '@/features/products/image'
import type { ProfileRow } from '@/lib/database.types'
import { getSupabase } from '@/lib/supabase'

export const profileQueryKey = ['profile'] as const

const BUCKET = 'avatars'

/**
 * 256 px suffit largement : l'avatar s'affiche entre 32 et 56 px, donc au
 * maximum ~168 px sur un écran très dense. À cette taille en WebP, une photo
 * pèse quelques dizaines de kilo-octets — mille utilisateurs tiennent dans
 * quelques dizaines de mégaoctets de Storage.
 */
const AVATAR_EDGE = 256
const AVATAR_QUALITY = 0.85

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/** @returns l'URL publique de la photo envoyée. */
export async function uploadAvatar(userId: string, source: Blob): Promise<string> {
  const { blob, extension, contentType } = await prepareImage(source, {
    maxEdge: AVATAR_EDGE,
    quality: AVATAR_QUALITY,
    square: true,
  })

  // Chemin `<user_id>/<uuid>` : la policy Storage vérifie le premier segment.
  const path = `${userId}/${crypto.randomUUID()}.${extension}`

  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, cacheControl: '31536000', upsert: false })
  if (error) throw new Error(error.message)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function updateProfile(
  userId: string,
  patch: { full_name?: string | null; avatar_url?: string | null },
): Promise<void> {
  const supabase = getSupabase()

  // Le profil est créé par un trigger à l'inscription, mais on ne veut pas en
  // dépendre : un upsert évite l'échec silencieux si la ligne manque.
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch }, { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/useAuth'

import { getProfile, profileQueryKey } from './profileRepository'

/**
 * Le profil de la personne connectée.
 *
 * `displayName` retombe sur l'adresse e-mail tant que rien n'est renseigné :
 * mieux vaut « Salut Marco » que « Salut null ».
 */
export function useProfile() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: [...profileQueryKey, user?.id],
    queryFn: () => getProfile(user?.id as string),
    enabled: Boolean(user?.id),
  })

  const stored = query.data?.full_name?.trim()
  const metadata = user?.user_metadata?.full_name
  const fromMetadata = typeof metadata === 'string' ? metadata.trim() : ''
  const fallback = user?.email?.split('@')[0] ?? ''

  const displayName = stored || fromMetadata || capitalize(fallback) || 'toi'

  return {
    profile: query.data ?? null,
    displayName,
    avatarUrl: query.data?.avatar_url ?? null,
    /** `true` tant qu'on ne sait pas encore comment appeler la personne. */
    needsName: query.isSuccess && !stored && !fromMetadata,
    isLoading: query.isPending,
  }
}

function capitalize(value: string): string {
  const cleaned = value.split(/[._-]/)[0] ?? value
  return cleaned.length > 0 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : ''
}

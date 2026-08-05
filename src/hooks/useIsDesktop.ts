import { useSyncExternalStore } from 'react'

/** Au-delà de cette largeur, on bascule sur la mise en page bureau. */
const QUERY = '(min-width: 1024px)'

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

/**
 * `true` sur écran large.
 *
 * Une seule application, deux habillages : les écrans partagent exactement les
 * mêmes données et les mêmes hooks. Maintenir deux apps séparées les ferait
 * diverger au bout de trois semaines.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

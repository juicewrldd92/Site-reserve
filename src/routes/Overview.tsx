import { useIsDesktop } from '@/hooks/useIsDesktop'

import { Dashboard } from './Dashboard'
import { Home } from './Home'

/**
 * Écran d'accueil.
 *
 * Même route, même données : seule la densité change. Sur téléphone on veut
 * une action évidente, sur ordinateur une vue d'ensemble.
 */
export function Overview() {
  return useIsDesktop() ? <Dashboard /> : <Home />
}

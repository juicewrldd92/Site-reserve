import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useTenancy } from '@/features/tenancy/useTenancy'
import { SetupNeeded } from '@/routes/SetupNeeded'
import { Splash } from '@/routes/Splash'

import { useAuth } from './useAuth'

/** Écrans d'accueil / connexion : inaccessibles une fois connecté. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'unconfigured') return <SetupNeeded />
  if (status === 'loading') return <Splash />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return children
}

/** Session obligatoire, organisation pas encore nécessaire. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'unconfigured') return <SetupNeeded />
  if (status === 'loading') return <Splash />
  if (status === 'anonymous') return <Navigate to="/bienvenue" replace state={{ from: location }} />
  return children
}

/**
 * L'onboarding, et lui seul.
 *
 * Quiconque a déjà un établissement est renvoyé vers l'app : sans ce garde, on
 * peut rester bloqué sur le formulaire et créer une organisation à chaque clic.
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const { isLoading, establishments, error } = useTenancy()

  if (status === 'unconfigured') return <SetupNeeded />
  if (status === 'loading') return <Splash />
  if (status === 'anonymous') return <Navigate to="/bienvenue" replace />
  if (isLoading) return <Splash />
  if (!error && establishments.length > 0) return <Navigate to="/" replace />
  return children
}

/** Session + au moins un établissement accessible. Le reste de l'app. */
export function RequireEstablishment() {
  const { status } = useAuth()
  const { isLoading, needsOnboarding, error } = useTenancy()

  if (status === 'unconfigured') return <SetupNeeded />
  if (status === 'loading') return <Splash />
  if (status === 'anonymous') return <Navigate to="/bienvenue" replace />
  if (isLoading) return <Splash />
  if (error) return <TenancyError message={error.message} />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function TenancyError({ message }: { message: string }) {
  return (
    <div className="bg-canvas flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="text-[22px] font-extrabold tracking-[-0.025em]">Ça coince</span>
      <p className="text-ink-muted text-[15px] leading-[1.5]">
        Impossible de charger tes établissements.
      </p>
      <p className="text-ink-faint font-mono text-[12px]">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="bg-corail shadow-corail mt-2 h-13 rounded-full px-7 text-[15px] font-bold text-white"
      >
        Réessayer
      </button>
    </div>
  )
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import {
  BellIcon,
  BoxIcon,
  BrandMark,
  CartIcon,
  HomeIcon,
  PlusIcon,
  ScanIcon,
  SlidersIcon,
} from '@/components/icons'
import { OfflineBanner } from '@/components/pwa/OfflineBanner'
import { UpdateToast } from '@/components/pwa/UpdateToast'
import { cn } from '@/components/ui/cn'
import { useAlerts } from '@/features/alerts/useAlerts'
import { useAuth } from '@/features/auth/useAuth'
import { EstablishmentSwitcher } from '@/features/tenancy/EstablishmentSwitcher'
import { useStockRealtime } from '@/features/stock/useStockRealtime'

type NavEntry = {
  to: string
  label: string
  Icon: typeof HomeIcon
}

const NAV: readonly NavEntry[] = [
  { to: '/', label: 'Dashboard', Icon: HomeIcon },
  { to: '/stock', label: 'Stock', Icon: BoxIcon },
  { to: '/alertes', label: 'Alertes', Icon: BellIcon },
  { to: '/commandes', label: 'Commandes', Icon: CartIcon },
  { to: '/reglages', label: 'Réglages', Icon: SlidersIcon },
]

/**
 * Mise en page bureau : barre latérale fixe, en-tête, contenu large.
 *
 * Le web pilote, le mobile scanne. On garde donc la même identité visuelle,
 * mais avec plus de densité : on voit l'état du stock d'un seul coup d'œil au
 * lieu de faire défiler.
 */
export function DesktopShell() {
  const navigate = useNavigate()
  const { groups } = useAlerts()
  const { user } = useAuth()
  useStockRealtime()

  const initial = (user?.email ?? '?').slice(0, 1).toUpperCase()

  return (
    <div className="bg-canvas flex h-dvh overflow-hidden">
      <aside className="border-line/60 bg-surface flex w-62 flex-none flex-col gap-6 border-r px-4.5 py-6">
        <div className="flex items-center gap-2.5 px-1.5">
          <BrandMark size={32} />
          <span className="text-[17px] font-extrabold tracking-[-0.02em]">Réserve</span>
        </div>

        <EstablishmentSwitcher />

        <nav className="flex flex-col gap-1" aria-label="Navigation principale">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-[13px] px-3 py-2.5 text-[14.5px] transition-colors',
                  isActive
                    ? 'bg-corail-tint text-corail font-bold'
                    : 'text-ink-muted hover:bg-canvas font-semibold',
                )
              }
            >
              <Icon size={19} />
              {label}
              {to === '/alertes' && groups.total > 0 && (
                <span className="bg-alert ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white">
                  {groups.total}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="bg-canvas mt-auto flex flex-col gap-2.5 rounded-[18px] p-4">
          <span className="text-[14px] leading-tight font-bold">Scanne depuis ton tel</span>
          <span className="text-ink-muted text-[12.5px] leading-snug">
            Le web sert à piloter, le mobile à scanner.
          </span>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="bg-corail flex h-9.5 items-center justify-center gap-2 rounded-full text-[13px] font-bold text-white"
          >
            <ScanIcon size={16} />
            Ouvrir le scanner
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />

        <header className="border-line/60 bg-surface flex h-[74px] flex-none items-center gap-5 border-b px-8">
          <span className="text-ink-muted text-[14.5px]">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="bg-corail shadow-corail ml-auto flex h-[42px] items-center gap-2 rounded-full px-5 text-[14.5px] font-bold text-white"
          >
            <PlusIcon size={18} strokeWidth={2} />
            Ajouter un produit
          </button>

          <span className="bg-corail-tint text-corail-ink flex h-[42px] w-[42px] items-center justify-center rounded-full text-[14.5px] font-bold">
            {initial}
          </span>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
          <Outlet />
        </main>
      </div>

      <UpdateToast />
    </div>
  )
}

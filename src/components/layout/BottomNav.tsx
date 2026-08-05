import { NavLink, useNavigate } from 'react-router-dom'

import { BellIcon, BoxIcon, CartIcon, HomeIcon, ScanIcon } from '@/components/icons'
import { cn } from '@/components/ui/cn'

type Tab = {
  to: string
  label: string
  Icon: typeof HomeIcon
  badge?: number
}

const TABS: readonly Tab[] = [
  { to: '/', label: 'Accueil', Icon: HomeIcon },
  { to: '/stock', label: 'Stock', Icon: BoxIcon },
  { to: '/alertes', label: 'Alertes', Icon: BellIcon },
  { to: '/commandes', label: 'Commandes', Icon: CartIcon },
]

/**
 * Barre de navigation basse + bouton scan flottant.
 * Le scan est accessible depuis n'importe quel écran : c'est le geste n°1.
 */
export function BottomNav({ alertCount = 0 }: { alertCount?: number }) {
  const navigate = useNavigate()
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)]

  return (
    <nav
      className="bg-surface relative flex items-start justify-between border-t border-[rgb(26_26_26/0.06)] px-6 pt-[11px]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}
      aria-label="Navigation principale"
    >
      {left.map((tab) => (
        <TabLink key={tab.to} {...tab} />
      ))}

      {/* Réserve la place du FAB */}
      <span className="w-14" aria-hidden="true" />

      {right.map((tab) => (
        <TabLink
          key={tab.to}
          {...tab}
          badge={tab.to === '/alertes' ? alertCount : undefined}
        />
      ))}

      <button
        type="button"
        onClick={() => navigate('/scan')}
        aria-label="Scanner un produit"
        className="bg-corail shadow-fab border-canvas absolute -top-6 left-1/2 flex h-17 w-17 -translate-x-1/2 items-center justify-center rounded-full border-[5px] text-white transition-transform active:scale-95"
      >
        <ScanIcon size={27} />
      </button>
    </nav>
  )
}

function TabLink({ to, label, Icon, badge }: Tab) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'relative flex w-14 flex-col items-center gap-1',
          isActive ? 'text-corail' : 'text-ink-faint',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 1.8 : 1.6} />
          <span className={cn('text-[10.5px]', isActive ? 'font-bold' : 'font-semibold')}>
            {label}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-alert absolute -top-[3px] right-[11px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold text-white">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

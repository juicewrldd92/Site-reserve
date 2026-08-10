import { Outlet } from 'react-router-dom'

import { TrialBanner } from '@/features/billing/TrialBanner'

import { OfflineBanner } from '@/components/pwa/OfflineBanner'
import { UpdateToast } from '@/components/pwa/UpdateToast'
import { Toaster } from '@/components/ui/Toaster'
import { useAlerts } from '@/features/alerts/useAlerts'
import { useStockRealtime } from '@/features/stock/useStockRealtime'
import { useIsDesktop } from '@/hooks/useIsDesktop'

import { BottomNav } from './BottomNav'
import { DesktopShell } from './DesktopShell'

/**
 * Une seule application, deux habillages.
 *
 * Sur téléphone : colonne pleine largeur, barre basse, bouton scan au pouce.
 * Sur ordinateur : barre latérale et contenu dense. Mêmes routes, mêmes
 * données, mêmes hooks — rien ne peut diverger entre les deux.
 */
export function AppShell() {
  const isDesktop = useIsDesktop()
  if (isDesktop) return <DesktopShell />
  return <MobileShell />
}

function MobileShell() {
  const { groups, isLoading: alertsLoading } = useAlerts()
  useStockRealtime()

  return (
    <div className="bg-canvas flex h-dvh justify-center overflow-hidden">
      <div className="bg-canvas relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden sm:shadow-[0_26px_60px_rgb(26_26_26/0.13)]">
        <OfflineBanner />

        {/* `min-h-0` : c'est `main` qui scrolle, jamais la page — la barre
            du bas et le bouton scan restent atteignables au pouce. */}
        <main
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 pb-4"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
        >
          {/* Au-dessus du contenu et non en bandeau fixe : il doit se lire
              une fois, pas coller à l'écran toute la journée. */}
          <div className="pb-3 empty:hidden">
            <TrialBanner />
          </div>
          <Outlet />
        </main>

        <BottomNav alertCount={alertsLoading ? 0 : groups.total} />
        <UpdateToast />
        <Toaster />
      </div>
    </div>
  )
}

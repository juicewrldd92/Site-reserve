import { Outlet } from 'react-router-dom'

import { OfflineBanner } from '@/components/pwa/OfflineBanner'
import { UpdateToast } from '@/components/pwa/UpdateToast'
import { useAlerts } from '@/features/alerts/useAlerts'
import { useStockRealtime } from '@/features/stock/useStockRealtime'

import { BottomNav } from './BottomNav'

/**
 * Coquille mobile-first : colonne pleine largeur sur téléphone, recentrée
 * sur grand écran (la déclinaison web dense viendra plus tard).
 */
export function AppShell() {
  const { groups } = useAlerts()
  useStockRealtime()

  return (
    <div className="bg-canvas flex h-dvh justify-center overflow-hidden">
      <div className="bg-canvas relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden sm:shadow-[0_26px_60px_rgb(26_26_26/0.13)]">
        <OfflineBanner />

        {/* `min-h-0` : c'est `main` qui scrolle, jamais la page — la barre
            du bas et le bouton scan restent atteignables au pouce. */}
        <main
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-4"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
        >
          <Outlet />
        </main>

        <BottomNav alertCount={groups.total} />
        <UpdateToast />
      </div>
    </div>
  )
}

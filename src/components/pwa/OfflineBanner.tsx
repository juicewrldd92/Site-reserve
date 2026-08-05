import { OfflineIcon } from '@/components/icons'
import { usePendingSync } from '@/features/offline/usePendingSync'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Bandeau d'état réseau et de synchro.
 *
 * En réserve, savoir qu'on est hors-ligne rassure ; savoir que rien n'est perdu
 * rassure davantage.
 */
export function OfflineBanner() {
  const online = useOnlineStatus()
  const pending = usePendingSync()

  if (online && pending === 0) return null

  if (!online) {
    return (
      <div
        role="status"
        className="bg-ink flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold text-white"
      >
        <OfflineIcon size={16} />
        Hors-ligne
        {pending > 0 && ` — ${pending} modif${pending > 1 ? 's' : ''} en attente`}
      </div>
    )
  }

  return (
    <div
      role="status"
      className="bg-warn-bg text-warn-ink flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold"
    >
      Synchronisation… {pending} modif{pending > 1 ? 's' : ''} en attente
    </div>
  )
}

import { useEffect, useState } from 'react'

import { onPendingChange, startSyncOnReconnect } from './syncQueue'

/** Nombre d'ajustements en attente de synchronisation. */
export function usePendingSync(): number {
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const stopListening = onPendingChange(setPending)
    const stopSyncing = startSyncOnReconnect()
    return () => {
      stopListening()
      stopSyncing()
    }
  }, [])

  return pending
}

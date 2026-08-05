import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { stockStatus } from '@/features/stock/status'
import { listStock, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { StockOverviewRow } from '@/lib/database.types'

export type AlertGroups = {
  /** À jeter ou cuisiner tout de suite. */
  expired: StockOverviewRow[]
  /** DLC dans le délai d'alerte de l'établissement. */
  expiring: StockOverviewRow[]
  /** Sous le seuil, ou en rupture. */
  low: StockOverviewRow[]
  total: number
}

const EMPTY: AlertGroups = { expired: [], expiring: [], low: [], total: 0 }

/**
 * Source unique des alertes : dashboard, badge de navigation et écran dédié
 * lisent la même chose, donc ne peuvent pas se contredire.
 *
 * Même clé de requête que le stock : TanStack Query dédoublonne, il n'y a
 * qu'un seul appel réseau.
 */
export function useAlerts(): { groups: AlertGroups; isLoading: boolean } {
  const { current } = useTenancy()
  const alertDays = current?.dlc_alert_days ?? 5

  const stock = useQuery({
    queryKey: [...stockQueryKey, current?.id],
    queryFn: () => listStock(current?.id as string),
    enabled: Boolean(current?.id),
  })

  const groups = useMemo(() => {
    if (!stock.data) return EMPTY

    const result: AlertGroups = { expired: [], expiring: [], low: [], total: 0 }
    for (const item of stock.data) {
      switch (stockStatus(item, alertDays)) {
        case 'expired':
          result.expired.push(item)
          break
        case 'expiring':
          result.expiring.push(item)
          break
        case 'out':
        case 'low':
          result.low.push(item)
          break
        case 'ok':
          break
      }
    }

    // Le plus urgent d'abord dans chaque groupe.
    result.expired.sort(byExpiry)
    result.expiring.sort(byExpiry)
    result.low.sort((a, b) => a.quantity - b.quantity)
    result.total = result.expired.length + result.expiring.length + result.low.length

    return result
  }, [stock.data, alertDays])

  return { groups, isLoading: stock.isPending }
}

function byExpiry(a: StockOverviewRow, b: StockOverviewRow): number {
  return (a.next_expiry ?? '9999').localeCompare(b.next_expiry ?? '9999')
}

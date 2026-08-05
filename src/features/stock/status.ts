import type { StatusTone } from '@/components/ui/StatusBadge'
import type { StockOverviewRow } from '@/lib/database.types'

/**
 * Le statut d'une ligne de stock, calculé et jamais stocké.
 *
 * Ordre de priorité : ce qui est perdu ou bloquant passe devant ce qui est
 * seulement à surveiller. Un produit périmé ET en stock bas s'affiche
 * « Périmé » — c'est l'info qui demande une action tout de suite.
 */
export type StockStatus = 'expired' | 'out' | 'expiring' | 'low' | 'ok'

export type StockBadge = { tone: StatusTone; label: string }

/** Jours calendaires entre aujourd'hui et une date ISO, en heure locale. */
export function daysUntil(isoDate: string, today = new Date()): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return Number.POSITIVE_INFINITY
  const target = new Date(year, month - 1, day)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - start.getTime()) / 86_400_000)
}

export function stockStatus(
  item: Pick<StockOverviewRow, 'quantity' | 'min_threshold' | 'next_expiry'>,
  alertDays: number,
  today = new Date(),
): StockStatus {
  const days = item.next_expiry ? daysUntil(item.next_expiry, today) : null

  if (days !== null && days < 0) return 'expired'
  if (item.quantity <= 0) return 'out'
  if (days !== null && days <= alertDays) return 'expiring'
  if (item.min_threshold !== null && item.quantity <= item.min_threshold) return 'low'
  return 'ok'
}

export function stockBadge(
  item: Pick<StockOverviewRow, 'quantity' | 'min_threshold' | 'next_expiry'>,
  alertDays: number,
  today = new Date(),
): StockBadge {
  const status = stockStatus(item, alertDays, today)
  const days = item.next_expiry ? daysUntil(item.next_expiry, today) : null

  switch (status) {
    case 'expired':
      return { tone: 'alert', label: 'Périmé' }
    case 'out':
      return { tone: 'alert', label: 'Rupture' }
    case 'expiring':
      // Demain ou aujourd'hui, c'est rouge : ça se cuisine maintenant.
      return {
        tone: days !== null && days <= 1 ? 'alert' : 'warn',
        label: days === 0 ? "DLC aujourd'hui" : `DLC J-${days}`,
      }
    case 'low':
      return { tone: 'warn', label: 'Stock bas' }
    case 'ok':
      return { tone: 'ok', label: 'En stock' }
  }
}

/** « Périmée depuis hier », « Demain », « Dans 3 jours ». */
export function expiryPhrase(isoDate: string, today = new Date()): string {
  const days = daysUntil(isoDate, today)
  if (days < -1) return `Périmé depuis ${Math.abs(days)} jours`
  if (days === -1) return 'Périmé depuis hier'
  if (days === 0) return "Périme aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} jours`
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

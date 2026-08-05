import Dexie, { type EntityTable } from 'dexie'

import type { StockOverviewRow } from '@/lib/database.types'

/**
 * Base locale (IndexedDB).
 *
 * Deux rôles :
 *   · `stockCache` — le stock lisible hors-ligne, une entrée par établissement.
 *   · `syncQueue`  — les ajustements faits sans réseau, à pousser au retour.
 *
 * Les réserves, chambres froides et caves n'ont souvent aucun réseau : compter
 * son stock ne doit jamais dépendre d'une barre de signal.
 */

export type StockCacheEntry = {
  establishmentId: string
  rows: StockOverviewRow[]
  cachedAt: number
}

/** Une seule opération pour l'instant : l'ajustement de quantité. */
export type SyncOperation = {
  id?: number
  kind: 'set_quantity'
  stockItemId: string
  quantity: number
  /** Horodatage client — sert d'arbitre au last-write-wins. */
  at: number
}

const db = new Dexie('reserve') as Dexie & {
  stockCache: EntityTable<StockCacheEntry, 'establishmentId'>
  syncQueue: EntityTable<SyncOperation, 'id'>
}

db.version(1).stores({
  stockCache: 'establishmentId',
  syncQueue: '++id, stockItemId',
})

export { db }

/**
 * IndexedDB peut être indisponible : navigation privée, quota plein, réglages
 * restrictifs. Le cache est un confort, jamais une dépendance — en cas d'échec
 * on dégrade en silence plutôt que de casser l'écran.
 */
async function safely<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation()
  } catch (cause) {
    console.warn('Cache local indisponible :', cause)
    return fallback
  }
}

export async function cacheStock(
  establishmentId: string,
  rows: StockOverviewRow[],
): Promise<void> {
  await safely(
    () => db.stockCache.put({ establishmentId, rows, cachedAt: Date.now() }),
    undefined as unknown as string,
  )
}

export async function readCachedStock(
  establishmentId: string,
): Promise<StockOverviewRow[] | null> {
  return safely(async () => {
    const entry = await db.stockCache.get(establishmentId)
    return entry?.rows ?? null
  }, null)
}

/**
 * Applique une opération au cache local immédiatement.
 *
 * Sans ça, quelqu'un qui compte hors-ligne verrait ses ajustements disparaître
 * au changement d'écran.
 */
export async function applyToCache(
  establishmentId: string,
  operation: SyncOperation,
): Promise<void> {
  await safely(async () => {
    const entry = await db.stockCache.get(establishmentId)
    if (!entry) return

    const rows = entry.rows.map((row) =>
      row.id === operation.stockItemId
        ? {
            ...row,
            quantity: operation.quantity,
            updated_at: new Date(operation.at).toISOString(),
          }
        : row,
    )
    await db.stockCache.put({ ...entry, rows })
  }, undefined)
}

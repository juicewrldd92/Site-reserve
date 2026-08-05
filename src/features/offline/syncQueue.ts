import { getSupabase } from '@/lib/supabase'

import { applyToCache, db, type SyncOperation } from './db'

/**
 * File de synchronisation.
 *
 * Toutes les écritures du mode inventaire passent par ici, en ligne comme
 * hors-ligne : un seul chemin de code, donc un seul comportement à comprendre.
 * Quand le réseau est là, la file se vide immédiatement.
 *
 * Résolution de conflits : last-write-wins au niveau de la ligne. Deux personnes
 * qui comptent la même étagère en même temps, c'est la dernière qui a raison.
 * Suffisant pour le MVP, et prévisible.
 */

type Listener = (pending: number) => void

const listeners = new Set<Listener>()
let flushing = false

export function onPendingChange(listener: Listener): () => void {
  listeners.add(listener)
  void countPending().then(listener)
  return () => listeners.delete(listener)
}

export async function countPending(): Promise<number> {
  try {
    return await db.syncQueue.count()
  } catch {
    return 0
  }
}

async function notify(): Promise<void> {
  const pending = await countPending()
  for (const listener of listeners) listener(pending)
}

/** Enregistre l'opération, l'applique au cache local, puis tente de la pousser. */
export async function enqueue(
  establishmentId: string,
  operation: Omit<SyncOperation, 'id'>,
): Promise<void> {
  try {
    await db.syncQueue.add(operation)
    await applyToCache(establishmentId, operation)
    await notify()
    void flush()
  } catch (cause) {
    // Pas de file locale disponible : on écrit en direct plutôt que de perdre
    // le comptage. Sans réseau non plus, l'erreur remonte à l'appelant.
    console.warn('File locale indisponible, écriture directe :', cause)
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('stock_items')
      .update({ quantity: operation.quantity, updated_by: auth.user?.id ?? null })
      .eq('id', operation.stockItemId)
    if (error) throw new Error(error.message)
  }
}

/**
 * Vide la file. Sans effet si on est hors-ligne ou si un flush tourne déjà.
 *
 * Une opération qui échoue reste en file ; on s'arrête à la première erreur
 * pour ne pas marteler un serveur qui ne répond pas.
 */
export async function flush(): Promise<void> {
  if (flushing || !navigator.onLine) return
  flushing = true

  try {
    const supabase = getSupabase()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    const pending = await db.syncQueue.orderBy('id').toArray()

    for (const operation of pending) {
      const { error } = await supabase
        .from('stock_items')
        .update({ quantity: operation.quantity, updated_by: auth.user.id })
        .eq('id', operation.stockItemId)

      if (error) {
        console.warn('Synchro interrompue :', error.message)
        break
      }
      if (operation.id !== undefined) await db.syncQueue.delete(operation.id)
    }
  } catch (cause) {
    console.warn('Synchro impossible :', cause)
  } finally {
    flushing = false
    await notify()
  }
}

/** Rebranche la synchro dès que le réseau revient (sortie de réserve, typiquement). */
export function startSyncOnReconnect(): () => void {
  const onOnline = () => void flush()
  window.addEventListener('online', onOnline)
  void flush()
  return () => window.removeEventListener('online', onOnline)
}

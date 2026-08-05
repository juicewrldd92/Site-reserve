import { cacheStock, readCachedStock } from '@/features/offline/db'
import { enqueue } from '@/features/offline/syncQueue'
import type {
  ProductUnit,
  StockBatchRow,
  StockOverviewRow,
} from '@/lib/database.types'
import { getSupabase } from '@/lib/supabase'

export const stockQueryKey = ['stock'] as const

/**
 * Le stock, réseau d'abord, cache local en secours.
 *
 * En chambre froide il n'y a pas de réseau : plutôt que d'afficher une erreur,
 * on sert la dernière version connue. Mieux vaut un stock d'hier qu'un écran
 * vide au moment de compter.
 */
export async function listStock(establishmentId: string): Promise<StockOverviewRow[]> {
  try {
    const { data, error } = await getSupabase()
      .from('stock_overview')
      .select('*')
      .eq('establishment_id', establishmentId)
      .order('name')
    if (error) throw new Error(error.message)

    void cacheStock(establishmentId, data)
    return data
  } catch (cause) {
    const cached = await readCachedStock(establishmentId)
    if (cached) return cached
    throw cause instanceof Error ? cause : new Error('Stock indisponible')
  }
}

export async function listBatches(stockItemId: string): Promise<StockBatchRow[]> {
  const { data, error } = await getSupabase()
    .from('stock_batches')
    .select('*')
    .eq('stock_item_id', stockItemId)
    .order('expiry_date')
  if (error) throw new Error(error.message)
  return data
}

export type AddToStockInput = {
  establishmentId: string
  productId: string
  quantity: number
  unit: ProductUnit
  location?: string
  minThreshold?: number | null
  expiryDate?: string | null
}

/** Un seul aller-retour : c'est ce qui tient la promesse du « ≤ 3 taps ». */
export async function addToStock(input: AddToStockInput): Promise<string> {
  const { data, error } = await getSupabase().rpc('add_to_stock', {
    p_establishment_id: input.establishmentId,
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_unit: input.unit,
    p_location: input.location ?? '',
    p_min_threshold: input.minThreshold ?? null,
    p_expiry_date: input.expiryDate ?? null,
  })
  if (error) throw new Error(error.message)
  return data
}

/**
 * Ajustement de quantité (mode inventaire).
 *
 * Passe systématiquement par la file de synchro, en ligne comme hors-ligne :
 * un seul chemin de code, donc un seul comportement à comprendre. Quand le
 * réseau est là, la file se vide dans la foulée.
 */
export async function setQuantity(
  establishmentId: string,
  stockItemId: string,
  quantity: number,
): Promise<void> {
  await enqueue(establishmentId, {
    kind: 'set_quantity',
    stockItemId,
    quantity: Math.max(0, quantity),
    at: Date.now(),
  })
}

export async function updateStockItem(
  stockItemId: string,
  patch: { quantity?: number; min_threshold?: number | null; location?: string; unit?: ProductUnit },
): Promise<void> {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('stock_items')
    .update({ ...patch, updated_by: auth.user?.id ?? null })
    .eq('id', stockItemId)
  if (error) throw new Error(error.message)
}

export async function removeStockItem(stockItemId: string): Promise<void> {
  const { error } = await getSupabase().from('stock_items').delete().eq('id', stockItemId)
  if (error) throw new Error(error.message)
}

export async function addBatch(
  stockItemId: string,
  quantity: number,
  expiryDate: string,
): Promise<void> {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getUser()

  const { error } = await supabase.from('stock_batches').insert({
    stock_item_id: stockItemId,
    quantity,
    expiry_date: expiryDate,
    created_by: auth.user?.id ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function removeBatch(batchId: string): Promise<void> {
  const { error } = await getSupabase().from('stock_batches').delete().eq('id', batchId)
  if (error) throw new Error(error.message)
}

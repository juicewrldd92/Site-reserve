import type { OrderListItemView, OrderListRow } from '@/lib/database.types'
import { getSupabase } from '@/lib/supabase'

export const ordersQueryKey = ['orders'] as const

export async function listOrderLists(establishmentId: string): Promise<OrderListRow[]> {
  const { data, error } = await getSupabase()
    .from('order_lists')
    .select('*')
    .eq('establishment_id', establishmentId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getOrderList(id: string): Promise<OrderListRow> {
  const { data, error } = await getSupabase()
    .from('order_lists')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function listOrderItems(orderListId: string): Promise<OrderListItemView[]> {
  const { data, error } = await getSupabase()
    .from('order_list_items_view')
    .select('*')
    .eq('order_list_id', orderListId)
    .order('created_at')
  if (error) throw new Error(error.message)
  return data
}

export async function createOrderList(
  establishmentId: string,
  name: string,
): Promise<OrderListRow> {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('order_lists')
    .insert({
      establishment_id: establishmentId,
      name: name.trim(),
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

/** Remplit la liste avec tout ce qui est sous son seuil. Relançable sans doublon. */
export async function fillFromLowStock(orderListId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('fill_order_from_low_stock', {
    p_order_list_id: orderListId,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function updateOrderItem(
  itemId: string,
  patch: { quantity?: number; is_checked?: boolean; note?: string | null },
): Promise<void> {
  const { error } = await getSupabase().from('order_list_items').update(patch).eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function removeOrderItem(itemId: string): Promise<void> {
  const { error } = await getSupabase().from('order_list_items').delete().eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function removeOrderList(id: string): Promise<void> {
  const { error } = await getSupabase().from('order_lists').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Marquée comme passée au fournisseur. */
export async function markAsOrdered(id: string): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await getSupabase()
    .from('order_lists')
    .update({ status: 'ordered', ordered_at: now, sent_at: now })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Réception : les lignes cochées remontent dans le stock, en une transaction
 * côté base. C'est ce qui referme la boucle stock → commande → stock.
 *
 * @returns le nombre de lignes rentrées en stock.
 */
export async function receiveOrderList(id: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('receive_order_list', {
    p_order_list_id: id,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function reopenOrderList(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('order_lists')
    .update({ status: 'draft', ordered_at: null, received_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

import { createProduct, resolveBarcode } from '@/features/products/productRepository'
import type {
  ProductUnit,
  StockPresetItemRow,
  StockPresetRow,
} from '@/lib/database.types'
import { getSupabase } from '@/lib/supabase'

import { addToStock } from './stockRepository'

export const presetQueryKey = ['stock-presets'] as const

export type PresetWithItems = StockPresetRow & { items: StockPresetItemRow[] }

export async function listPresets(establishmentId: string): Promise<PresetWithItems[]> {
  const supabase = getSupabase()

  const { data: presets, error } = await supabase
    .from('stock_presets')
    .select('*')
    .eq('establishment_id', establishmentId)
    .order('name')
  if (error) throw new Error(error.message)
  if (presets.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from('stock_preset_items')
    .select('*')
    .in(
      'preset_id',
      presets.map((p) => p.id),
    )
    .order('position')
  if (itemsError) throw new Error(itemsError.message)

  return presets.map((preset) => ({
    ...preset,
    items: items.filter((item) => item.preset_id === preset.id),
  }))
}

export async function createPreset(
  establishmentId: string,
  name: string,
): Promise<StockPresetRow> {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('stock_presets')
    .insert({
      establishment_id: establishmentId,
      name: name.trim(),
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) {
    // 23505 : l'index unique sur le nom. Le message brut de Postgres ne dirait
    // rien à un restaurateur.
    if (error.code === '23505') throw new Error('Tu as déjà un préset de ce nom.')
    throw new Error(error.message)
  }
  return data
}

export async function renamePreset(presetId: string, name: string): Promise<void> {
  const { error } = await getSupabase()
    .from('stock_presets')
    .update({ name: name.trim() })
    .eq('id', presetId)
  if (error) throw new Error(error.message)
}

export async function deletePreset(presetId: string): Promise<void> {
  const { error } = await getSupabase().from('stock_presets').delete().eq('id', presetId)
  if (error) throw new Error(error.message)
}

export type PresetItemDraft = {
  presetId: string
  productId?: string | null
  label?: string | null
  barcode?: string | null
  quantity: number
  unit: ProductUnit
  location?: string
}

export async function addPresetItem(draft: PresetItemDraft): Promise<void> {
  const { error } = await getSupabase()
    .from('stock_preset_items')
    .insert({
      preset_id: draft.presetId,
      product_id: draft.productId ?? null,
      label: draft.label?.trim() || null,
      barcode: draft.barcode?.trim() || null,
      quantity: draft.quantity,
      unit: draft.unit,
      location: draft.location ?? '',
    })
  if (error) throw new Error(error.message)
}

export async function updatePresetItem(
  itemId: string,
  patch: { quantity?: number; unit?: ProductUnit; location?: string },
): Promise<void> {
  const { error } = await getSupabase()
    .from('stock_preset_items')
    .update(patch)
    .eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function removePresetItem(itemId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('stock_preset_items')
    .delete()
    .eq('id', itemId)
  if (error) throw new Error(error.message)
}

export type ApplyReport = {
  /** Lignes effectivement entrées en stock. */
  added: number
  /** Libellés qu'on n'a pas su rattacher, listés pour que rien ne disparaisse en silence. */
  failed: string[]
}

/**
 * Applique un préset au stock.
 *
 * Chaque ligne est traitée indépendamment : une référence introuvable ne doit
 * pas faire échouer les dix-neuf autres. Ce qui n'a pas pu être ajouté est
 * rendu à l'appelant, pour être montré plutôt que perdu.
 *
 * Les lignes sans produit connu créent une fiche à la volée — un préset écrit
 * de tête reste utilisable dès la première application.
 */
export async function applyPreset(
  preset: PresetWithItems,
  context: { establishmentId: string; orgId: string },
): Promise<ApplyReport> {
  const report: ApplyReport = { added: 0, failed: [] }

  for (const item of preset.items) {
    const name = item.label ?? item.barcode ?? 'Ligne sans nom'
    try {
      let productId = item.product_id

      if (!productId && item.barcode) {
        // Le code-barres passe par le même chemin que le scan : catalogue local
        // d'abord, Open Food Facts ensuite.
        const resolution = await resolveBarcode(item.barcode, context.orgId)
        if (resolution.kind !== 'unknown') productId = resolution.product.id
      }

      if (!productId) {
        const created = await createProduct({
          orgId: context.orgId,
          name: item.label ?? `Réf. ${item.barcode ?? ''}`.trim(),
          barcode: item.barcode,
          defaultUnit: item.unit,
          source: 'manual',
        })
        productId = created.id
      }

      await addToStock({
        establishmentId: context.establishmentId,
        productId,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
      })
      report.added += 1
    } catch {
      report.failed.push(name)
    }
  }

  return report
}

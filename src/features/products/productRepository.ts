import type { ProductRow, ProductUnit } from '@/lib/database.types'
import { getSupabase } from '@/lib/supabase'

import { prepareImage } from './image'
import { lookupBarcode, type OpenFoodFactsProduct } from './openFoodFacts'

const BUCKET = 'product-images'

export async function listProducts(orgId: string): Promise<ProductRow[]> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function findByBarcode(
  orgId: string,
  barcode: string,
): Promise<ProductRow | null> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('*')
    .eq('org_id', orgId)
    .eq('barcode', barcode)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Copie une image dans NOTRE Storage.
 *
 * On ne pointe jamais une URL Open Food Facts en direct : elles bougent, et
 * une photo qui disparaît casse l'écran signature de l'app.
 */
export async function uploadProductImage(orgId: string, source: Blob): Promise<string> {
  // 640 px : la vignette fait 132 px dans la grille, la fiche 150 px. Au-delà
  // on téléchargerait des pixels que personne ne voit, sur le réseau d'une
  // réserve. 1024 px pesait deux fois et demie plus lourd.
  const { blob, extension, contentType } = await prepareImage(source, { maxEdge: 640 })
  // Chemin `<org_id>/<uuid>` : la policy Storage vérifie le premier segment.
  const path = `${orgId}/${crypto.randomUUID()}.${extension}`

  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, cacheControl: '31536000', upsert: false })
  if (error) throw new Error(error.message)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Récupère l'image distante et la re-héberge. Échec toléré : la photo est un bonus. */
async function mirrorRemoteImage(orgId: string, remoteUrl: string): Promise<string | null> {
  try {
    const response = await fetch(remoteUrl, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    return await uploadProductImage(orgId, await response.blob())
  } catch {
    return null
  }
}

export type ProductDraft = {
  orgId: string
  name: string
  brand?: string | null
  category?: string | null
  barcode?: string | null
  defaultUnit: ProductUnit
  source: 'openfoodfacts' | 'manual'
  imageUrl?: string | null
}

export async function createProduct(draft: ProductDraft): Promise<ProductRow> {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('products')
    .insert({
      org_id: draft.orgId,
      name: draft.name.trim(),
      brand: draft.brand ?? null,
      category: draft.category ?? null,
      barcode: draft.barcode ?? null,
      default_unit: draft.defaultUnit,
      source: draft.source,
      image_url: draft.imageUrl ?? null,
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export type BarcodeResolution =
  | { kind: 'known'; product: ProductRow }
  | { kind: 'imported'; product: ProductRow }
  | { kind: 'unknown'; barcode: string; offline: boolean }

/**
 * Le parcours complet d'un code-barre scanné :
 *   1. déjà dans le catalogue de l'org → on le rend tel quel ;
 *   2. trouvé chez Open Food Facts → on l'importe, image comprise ;
 *   3. inconnu (ou OFF injoignable) → au formulaire manuel de jouer.
 */
export async function resolveBarcode(
  orgId: string,
  barcode: string,
): Promise<BarcodeResolution> {
  const known = await findByBarcode(orgId, barcode)
  if (known) return { kind: 'known', product: known }

  let off: OpenFoodFactsProduct | null
  try {
    off = await lookupBarcode(barcode)
  } catch {
    return { kind: 'unknown', barcode, offline: true }
  }
  if (!off) return { kind: 'unknown', barcode, offline: false }

  const imageUrl = off.imageUrl ? await mirrorRemoteImage(orgId, off.imageUrl) : null

  const product = await createProduct({
    orgId,
    name: off.name,
    brand: off.brand,
    category: off.category,
    barcode: off.barcode,
    defaultUnit: guessUnit(off.quantity),
    source: 'openfoodfacts',
    imageUrl,
  })

  return { kind: 'imported', product }
}

/** « boîte 400 g », « bidon 5 L » — on devine, l'utilisateur corrige d'un tap. */
function guessUnit(quantity: string | null): ProductUnit {
  const text = quantity?.toLowerCase() ?? ''
  if (/\bbidon\b/.test(text)) return 'bidon'
  if (/\bbrique\b/.test(text)) return 'brique'
  if (/\bboîte|\bboite\b|\bconserve\b/.test(text)) return 'boite'
  if (/\bsachet\b/.test(text)) return 'sachet'
  if (/\bbouteille\b/.test(text)) return 'bouteille'
  if (/\d\s*(l|litre)s?\b/.test(text)) return 'l'
  if (/\d\s*ml\b/.test(text)) return 'ml'
  if (/\d\s*kg\b/.test(text)) return 'kg'
  if (/\d\s*g\b/.test(text)) return 'g'
  return 'piece'
}

/**
 * Remplace la photo d'un produit.
 *
 * Utile quand Open Food Facts renvoie une photo floue, une autre déclinaison,
 * ou rien du tout — ce qui arrive souvent sur les formats professionnels.
 * L'ancienne image reste dans le Storage : la supprimer ferait disparaître la
 * photo de tous les écrans encore ouverts ailleurs.
 */
export async function replaceProductImage(
  orgId: string,
  productId: string,
  source: Blob,
): Promise<string> {
  const imageUrl = await uploadProductImage(orgId, source)
  const { error } = await getSupabase()
    .from('products')
    .update({ image_url: imageUrl })
    .eq('id', productId)
  if (error) throw new Error(error.message)
  return imageUrl
}

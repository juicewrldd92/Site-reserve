/**
 * Client Open Food Facts (API v2, gratuit).
 *
 * Encapsulé derrière `lookupBarcode()` : si la source change un jour, le reste
 * de l'app ne bouge pas.
 *
 * OFF est orienté grande conso — beaucoup de produits pro ou bulk n'y sont
 * pas. Un `null` n'est donc pas une erreur : c'est le cas courant en resto, et
 * il bascule vers le formulaire manuel.
 */

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product'

const FIELDS = [
  'product_name',
  'product_name_fr',
  'brands',
  'image_url',
  'image_front_url',
  'quantity',
  'categories',
].join(',')

/**
 * OFF demande un User-Agent identifiant l'application. Un navigateur interdit
 * de le définir (en-tête protégé), mais leur CORS autorise `X-User-Agent`,
 * qu'ils acceptent comme équivalent.
 */
const USER_AGENT = 'Reserve/0.1 (PWA inventaire restaurateurs)'

export type OpenFoodFactsProduct = {
  barcode: string
  name: string
  brand: string | null
  category: string | null
  quantity: string | null
  imageUrl: string | null
}

type OffResponse = {
  status?: number
  product?: {
    product_name?: string
    product_name_fr?: string
    brands?: string
    image_url?: string
    image_front_url?: string
    quantity?: string
    categories?: string
  }
}

export class OpenFoodFactsUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Open Food Facts est injoignable')
    this.name = 'OpenFoodFactsUnavailableError'
    this.cause = cause
  }
}

/**
 * @returns le produit, ou `null` s'il est inconnu d'OFF.
 * @throws {OpenFoodFactsUnavailableError} si le réseau ou l'API lâche —
 *         distinct de « produit inconnu », qui n'est pas une erreur.
 */
export async function lookupBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<OpenFoodFactsProduct | null> {
  const url = `${ENDPOINT}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'X-User-Agent': USER_AGENT },
      signal: signal ?? AbortSignal.timeout(6000),
    })
  } catch (cause) {
    throw new OpenFoodFactsUnavailableError(cause)
  }

  // OFF répond 404 avec un corps JSON pour un produit inconnu.
  if (response.status === 404) return null
  if (!response.ok) throw new OpenFoodFactsUnavailableError(response.status)

  let payload: OffResponse
  try {
    payload = (await response.json()) as OffResponse
  } catch (cause) {
    throw new OpenFoodFactsUnavailableError(cause)
  }

  if (payload.status !== 1 || !payload.product) return null
  const p = payload.product

  const name = clean(p.product_name_fr) ?? clean(p.product_name)
  if (!name) return null // Une fiche sans nom ne sert à rien : on passe en manuel.

  return {
    barcode,
    name,
    // OFF concatène les marques : « Nutella, Ferrero » → on garde la première.
    brand: clean(p.brands)?.split(',')[0]?.trim() ?? null,
    category: clean(p.categories)?.split(',')[0]?.trim() ?? null,
    quantity: clean(p.quantity) ?? null,
    imageUrl: clean(p.image_front_url) ?? clean(p.image_url) ?? null,
  }
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

import type { ProductUnit } from '@/lib/database.types'

/**
 * Catalogue des unités.
 *
 * Une seule source de vérité : libellés, familles et ordre d'affichage vivent
 * ici. Pour en ajouter une, il suffit d'ajouter la valeur à l'enum
 * `product_unit` en base et une entrée dans cette table — aucun écran à
 * retoucher.
 */
export type UnitFamily = 'poids' | 'volume' | 'comptage' | 'conditionnement'

type UnitDefinition = {
  one: string
  many: string
  family: UnitFamily
  /** Ordre d'apparition dans les menus. Les plus courantes en premier. */
  rank: number
}

const UNITS: Record<ProductUnit, UnitDefinition> = {
  piece: { one: 'unité', many: 'unités', family: 'comptage', rank: 0 },
  kg: { one: 'kg', many: 'kg', family: 'poids', rank: 1 },
  g: { one: 'g', many: 'g', family: 'poids', rank: 2 },
  l: { one: 'L', many: 'L', family: 'volume', rank: 3 },
  ml: { one: 'mL', many: 'mL', family: 'volume', rank: 4 },
  boite: { one: 'boîte', many: 'boîtes', family: 'conditionnement', rank: 5 },
  bouteille: { one: 'bouteille', many: 'bouteilles', family: 'conditionnement', rank: 6 },
  sac: { one: 'sac', many: 'sacs', family: 'conditionnement', rank: 7 },
  sachet: { one: 'sachet', many: 'sachets', family: 'conditionnement', rank: 8 },
  botte: { one: 'botte', many: 'bottes', family: 'comptage', rank: 9 },
  bidon: { one: 'bidon', many: 'bidons', family: 'conditionnement', rank: 10 },
  brique: { one: 'brique', many: 'briques', family: 'conditionnement', rank: 11 },
  barquette: { one: 'barquette', many: 'barquettes', family: 'conditionnement', rank: 12 },
}

export const FAMILY_LABELS: Record<UnitFamily, string> = {
  comptage: 'À l’unité',
  poids: 'Poids',
  volume: 'Volume',
  conditionnement: 'Conditionnement',
}

export const PRODUCT_UNITS = (Object.keys(UNITS) as ProductUnit[]).sort(
  (a, b) => UNITS[a].rank - UNITS[b].rank,
)

/** Les unités groupées par famille, pour les `<optgroup>` du menu déroulant. */
export const UNITS_BY_FAMILY: Array<{ family: UnitFamily; units: ProductUnit[] }> = (
  ['comptage', 'poids', 'volume', 'conditionnement'] as UnitFamily[]
).map((family) => ({
  family,
  units: PRODUCT_UNITS.filter((unit) => UNITS[unit].family === family),
}))

export function unitLabel(unit: ProductUnit, quantity = 2): string {
  const definition = UNITS[unit]
  return Math.abs(quantity) < 2 ? definition.one : definition.many
}

export function unitFamily(unit: ProductUnit): UnitFamily {
  return UNITS[unit].family
}

/** « 1,8 kg », « 12 boîtes ». Virgule décimale, comme sur une étiquette. */
export function formatQuantity(quantity: number, unit: ProductUnit): string {
  const rounded = Math.round(quantity * 100) / 100
  const number = rounded.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  return `${number} ${unitLabel(unit, rounded)}`
}

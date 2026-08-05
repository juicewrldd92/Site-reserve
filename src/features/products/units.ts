import type { ProductUnit } from '@/lib/database.types'

/**
 * Vocabulaire de cuisine, pas de jargon logistique. On dit « 4 bottes »,
 * jamais « 4 UVC ».
 */
const LABELS: Record<ProductUnit, { one: string; many: string }> = {
  piece: { one: 'pièce', many: 'pièces' },
  kg: { one: 'kg', many: 'kg' },
  g: { one: 'g', many: 'g' },
  l: { one: 'L', many: 'L' },
  ml: { one: 'mL', many: 'mL' },
  boite: { one: 'boîte', many: 'boîtes' },
  bouteille: { one: 'bouteille', many: 'bouteilles' },
  sac: { one: 'sac', many: 'sacs' },
  sachet: { one: 'sachet', many: 'sachets' },
  botte: { one: 'botte', many: 'bottes' },
  bidon: { one: 'bidon', many: 'bidons' },
  brique: { one: 'brique', many: 'briques' },
  barquette: { one: 'barquette', many: 'barquettes' },
}

export const PRODUCT_UNITS = Object.keys(LABELS) as ProductUnit[]

export function unitLabel(unit: ProductUnit, quantity = 2): string {
  const label = LABELS[unit]
  return Math.abs(quantity) < 2 ? label.one : label.many
}

/** « 1,8 kg », « 12 boîtes ». Virgule décimale, comme sur une étiquette. */
export function formatQuantity(quantity: number, unit: ProductUnit): string {
  const rounded = Math.round(quantity * 100) / 100
  const number = rounded.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  return `${number} ${unitLabel(unit, rounded)}`
}

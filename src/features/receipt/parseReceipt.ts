/**
 * Lecture d'un ticket de caisse.
 *
 * Un ticket n'est pas une facture structurée : c'est du texte en vrac, avec des
 * abréviations (« BQT BASILIC »), des lignes de TVA, des codes promo et de
 * l'encre pâle. On ne cherche donc pas à tout comprendre — on extrait des
 * candidats plausibles, et l'utilisateur corrige à l'écran suivant.
 *
 * Aucune ligne n'est ajoutée au stock sans validation humaine.
 */

export type ReceiptLine = {
  /** Libellé nettoyé, tel qu'il apparaît sur le ticket. */
  label: string
  /** Quantité lue (« 2 x 1,25 » → 2), 1 par défaut. */
  quantity: number
  /** Prix unitaire ou total de ligne, en euros. Indicatif seulement. */
  price: number | null
}

/**
 * Mots qui trahissent une ligne administrative plutôt qu'un produit.
 * Comparés sans accents ni casse.
 */
const NOISE = [
  'total',
  'sous-total',
  'sous total',
  'tva',
  'ht',
  'ttc',
  'carte',
  'cb',
  'especes',
  'espece',
  'monnaie',
  'rendu',
  'remise',
  'reduction',
  'avoir',
  'ticket',
  'caisse',
  'merci',
  'bienvenue',
  'siret',
  'tel',
  'facture',
  'client',
  'fidelite',
  'points',
  'article',
  'articles',
  'nombre',
  'paiement',
  'a payer',
  'net a payer',
  'eur',
  'euro',
  'euros',
  'date',
  'heure',
  'vendeur',
  'magasin',
  'adresse',
  'code postal',
  'www',
]

/** Prix en fin de ligne : « 2,49 », « 2.49 € », « 12,00€ ». */
const PRICE_AT_END = /(\d{1,4})[.,](\d{2})\s*(?:€|eur)?\s*[a-z]?\s*$/i

/** Quantité en tête : « 2 x », « 3X », « 2 » suivi d'un mot. */
const LEADING_QUANTITY = /^(\d{1,3})\s*[x×]?\s+(?=\S)/i

/** Poids au kilo : « 0,850 kg x 8,90 ». */
const WEIGHT_LINE = /(\d+[.,]\d{1,3})\s*kg/i

/** Reste de calcul en fin de libellé : « x 8,90 », « × 1,25 ». */
const UNIT_PRICE_TAIL = /[x×]\s*\d+[.,]\d{1,2}\s*$/i

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function isNoise(label: string): boolean {
  const flat = normalize(label)
  if (flat.length < 3) return true
  // Une ligne sans aucune lettre n'est jamais un produit.
  if (!/[a-z]/.test(flat)) return true
  return NOISE.some(
    (word) => flat === word || flat.startsWith(`${word} `) || flat.endsWith(` ${word}`),
  )
}

/** « BQT BASILIC » → « Bqt basilic ». Le ticket crie, pas nous. */
function tidyLabel(raw: string): string {
  const cleaned = raw
    .replace(/[*#•|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[^A-Za-zÀ-ÿ]+/, '')
    .replace(/[^A-Za-zÀ-ÿ0-9%.\s-]+$/, '')
    .trim()

  if (cleaned.length === 0) return ''
  // Tout en majuscules sur un ticket : on repasse en casse de phrase.
  const isShouting = cleaned === cleaned.toUpperCase()
  const base = isShouting ? cleaned.toLowerCase() : cleaned
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/**
 * Extrait les lignes candidates d'un texte reconnu.
 *
 * Le prix sert uniquement d'indice qu'on est bien sur une ligne d'achat : on ne
 * l'enregistre nulle part, le food cost est hors périmètre.
 */
export function parseReceipt(text: string): ReceiptLine[] {
  const lines: ReceiptLine[] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.length === 0) continue

    const priceMatch = PRICE_AT_END.exec(line)
    if (!priceMatch) continue

    const price = Number(`${priceMatch[1]}.${priceMatch[2]}`)
    let rest = line.slice(0, priceMatch.index)

    // Un poids au kilo signale un produit pesé : la quantité utile est le poids.
    const weight = WEIGHT_LINE.exec(rest)
    let quantity = 1
    if (weight?.[1]) {
      quantity = Number(weight[1].replace(',', '.'))
      rest = rest.replace(WEIGHT_LINE, ' ')
    } else {
      const leading = LEADING_QUANTITY.exec(rest)
      if (leading?.[1]) {
        quantity = Number(leading[1])
        rest = rest.slice(leading[0].length)
      }
    }

    // « POMMES 0,850 kg x 8,90 » : une fois le poids retiré, il reste le prix
    // unitaire, qui n'appartient pas au nom du produit.
    rest = rest.replace(UNIT_PRICE_TAIL, ' ')

    const label = tidyLabel(rest)
    if (label.length === 0 || isNoise(label)) continue

    lines.push({
      label,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      price: Number.isFinite(price) ? price : null,
    })
  }

  return lines
}

/**
 * Rapproche un libellé de ticket d'un produit déjà au catalogue.
 *
 * Volontairement prudent : mieux vaut proposer une création que rattacher au
 * mauvais produit et fausser un stock. On n'accepte qu'une inclusion nette d'un
 * mot significatif.
 */
export function matchProduct<T extends { id: string; name: string }>(
  label: string,
  products: readonly T[],
): T | null {
  const needle = normalize(label)
  if (needle.length < 3) return null

  const exact = products.find((p) => normalize(p.name) === needle)
  if (exact) return exact

  // Les mots courts (« de », « le », « bio ») ne discriminent rien.
  const words = needle.split(/\s+/).filter((w) => w.length >= 4)
  if (words.length === 0) return null

  let best: { product: T; score: number } | null = null
  for (const product of products) {
    const haystack = normalize(product.name)
    const hits = words.filter((word) => haystack.includes(word)).length
    if (hits === 0) continue
    const score = hits / words.length
    if (score >= 0.6 && (best === null || score > best.score)) {
      best = { product, score }
    }
  }

  return best?.product ?? null
}

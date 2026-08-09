/**
 * Estimation des pertes liées au gaspillage alimentaire.
 *
 * Le calcul est volontairement transparent et grossier : on part des achats
 * alimentaires (déduits du nombre de couverts et du ticket moyen du type de
 * restaurant), auxquels on applique un taux de gaspillage assemblé à partir des
 * réponses. Le résultat est un ordre de grandeur, pas une comptabilité — c'est
 * dit à l'écran, et c'est pour ça qu'on arrondit franchement.
 *
 * Les bornes du taux (2 % à ~19 %) encadrent la fourchette de 15–20 % que
 * l'ADEME donne pour la restauration commerciale : une réponse « je ne jette
 * presque rien » ne doit pas produire un chiffre alarmiste, et l'inverse ne doit
 * pas dépasser ce que le secteur observe.
 */

export type Staple = {
  /** Nom tel qu'il apparaît dans la question, à la deuxième personne. */
  label: string
}

export type RestaurantType = {
  id: string
  label: string
  emoji: string
  /** Ticket moyen TTC, en euros. */
  ticket: number
  /** Part des achats alimentaires dans le chiffre d'affaires. */
  foodCost: number
  /** Les deux produits sur lesquels on interroge : ceux qui pèsent vraiment. */
  staples: [Staple, Staple]
}

export const RESTAURANT_TYPES: RestaurantType[] = [
  {
    id: 'pizzeria',
    label: 'Pizzeria',
    emoji: '🍕',
    ticket: 18,
    foodCost: 0.3,
    staples: [{ label: 'la mozzarella et les fromages' }, { label: 'les tomates et la charcuterie' }],
  },
  {
    id: 'creperie',
    label: 'Crêperie',
    emoji: '🥞',
    ticket: 16,
    foodCost: 0.28,
    staples: [{ label: 'le lait, la crème et le beurre' }, { label: 'les œufs et les garnitures' }],
  },
  {
    id: 'bistrot',
    label: 'Bistrot, brasserie',
    emoji: '🍷',
    ticket: 25,
    foodCost: 0.31,
    staples: [{ label: 'la viande et le poisson' }, { label: 'les légumes frais et les herbes' }],
  },
  {
    id: 'burger',
    label: 'Burger, snack',
    emoji: '🍔',
    ticket: 14,
    foodCost: 0.32,
    staples: [{ label: 'la viande et le pain' }, { label: 'la salade, la tomate, les sauces' }],
  },
  {
    id: 'asiatique',
    label: 'Asiatique, sushi',
    emoji: '🍜',
    ticket: 19,
    foodCost: 0.33,
    staples: [{ label: 'le poisson cru et la viande' }, { label: 'les légumes et les herbes fraîches' }],
  },
  {
    id: 'boulangerie',
    label: 'Boulangerie, pâtisserie',
    emoji: '🥐',
    ticket: 9,
    foodCost: 0.29,
    staples: [{ label: 'le beurre, la crème et les œufs' }, { label: 'les fruits et les garnitures' }],
  },
  {
    id: 'traiteur',
    label: 'Traiteur, food truck',
    emoji: '🚚',
    ticket: 15,
    foodCost: 0.32,
    staples: [{ label: 'les produits frais préparés' }, { label: 'les légumes et les féculents' }],
  },
  {
    id: 'autre',
    label: 'Autre',
    emoji: '🍽️',
    ticket: 20,
    foodCost: 0.3,
    staples: [{ label: 'les produits frais' }, { label: 'les légumes et les herbes' }],
  },
]

export type Answers = {
  type: string
  covers: number
  staple1: number
  staple2: number
  expiry: number
  /** Heures passées par semaine à gérer le stock. */
  hours: number
}

export const COVER_OPTIONS = [
  { label: 'Moins de 30', value: 22 },
  { label: '30 à 60', value: 45 },
  { label: '60 à 100', value: 80 },
  { label: 'Plus de 100', value: 130 },
]

/** Poids ajouté au taux de gaspillage, par niveau de réponse. */
export const WASTE_OPTIONS = [
  { label: 'Presque rien', value: 0 },
  { label: 'Un peu', value: 0.015 },
  { label: 'Pas mal', value: 0.035 },
  { label: 'Trop', value: 0.06 },
]

export const EXPIRY_OPTIONS = [
  { label: 'Jamais', value: 0 },
  { label: '1 ou 2 fois', value: 0.015 },
  { label: '3 à 5 fois', value: 0.03 },
  { label: 'Tous les jours', value: 0.05 },
]

export const HOURS_OPTIONS = [
  { label: 'Moins d’1 h', value: 0.7 },
  { label: '1 à 3 h', value: 2 },
  { label: '3 à 6 h', value: 4.5 },
  { label: 'Plus de 6 h', value: 8 },
]

export type Estimate = {
  /** Euros de nourriture jetés par an. */
  wastedPerYear: number
  /** Heures passées à gérer le stock par an. */
  hoursPerYear: number
  /** Fourchette basse et haute de ce qui est récupérable. */
  recoverable: [number, number]
  /** Heures récupérables par an. */
  hoursSaved: number
  /** Taux de gaspillage retenu, pour l'afficher honnêtement. */
  wasteRate: number
  /** Achats alimentaires annuels estimés. */
  purchasesPerYear: number
}

/** 6 jours d'ouverture par semaine : la moyenne d'un indépendant. */
const DAYS_OPEN = 6

export function estimate(answers: Answers): Estimate {
  const type =
    RESTAURANT_TYPES.find((t) => t.id === answers.type) ??
    (RESTAURANT_TYPES.at(-1) as RestaurantType)

  const purchasesPerYear =
    answers.covers * type.ticket * type.foodCost * DAYS_OPEN * 52

  // 2 % de base : même une cuisine irréprochable perd des parures et des fonds
  // de bac. Le reste vient des réponses.
  const wasteRate = Math.min(
    0.19,
    0.02 + answers.staple1 + answers.staple2 + answers.expiry,
  )

  const wastedPerYear = purchasesPerYear * wasteRate
  const hoursPerYear = answers.hours * 52

  return {
    purchasesPerYear: round(purchasesPerYear),
    wasteRate,
    wastedPerYear: round(wastedPerYear),
    hoursPerYear: Math.round(hoursPerYear),
    // Suivre ses dates et ses quantités ne supprime pas le gaspillage : la
    // littérature sur le sujet observe des baisses d'un tiers à la moitié.
    recoverable: [round(wastedPerYear * 0.3), round(wastedPerYear * 0.5)],
    hoursSaved: Math.round(hoursPerYear * 0.6),
  }
}

/** Arrondi à la dizaine : afficher « 4 137 € » donnerait une fausse précision. */
function round(value: number): number {
  return Math.round(value / 10) * 10
}

export function euros(value: number): string {
  // `toLocaleString` sépare les milliers par une espace fine insécable (U+202F).
  // Plus Jakarta Sans n'en a pas le glyphe en graisse extrabold : le séparateur
  // disparaît et « 5 730 » s'affiche « 5730 ». On repasse en insécable normale.
  return `${value.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0')}\u00a0€`
}

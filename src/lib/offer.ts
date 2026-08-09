/**
 * L'offre commerciale, en un seul endroit.
 *
 * Le prix et la durée d'essai apparaissent sur la vitrine, dans le simulateur,
 * dans les réglages et dans la fonction Stripe. Les laisser en dur à sept
 * endroits, c'est garantir qu'un jour l'un d'eux annoncera un autre tarif que
 * celui qui sera prélevé.
 */

/** Prix mensuel TTC par établissement, en euros. */
export const PRICE_PER_MONTH = 6.99

/** Durée de l'essai gratuit, en jours. */
export const TRIAL_DAYS = 14

export const PRICE_LABEL = '6,99 €'
export const TRIAL_LABEL = '14 jours'

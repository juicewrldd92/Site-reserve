/**
 * Normalisation des noms d'emplacement.
 *
 * « Réserve sèche » peut s'écrire de deux façons en Unicode : avec un « è »
 * précomposé, ou avec un « e » suivi d'un accent combinant. Les deux sont
 * visuellement identiques mais différents pour Postgres — et sur Mac comme sur
 * iOS, certaines saisies produisent la seconde forme.
 *
 * Sans normalisation, on se retrouve avec deux emplacements « Réserve sèche »
 * dans la liste, et le stock réparti entre les deux.
 */

/** Forme canonique stockée en base. */
export function normalizeLocation(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim()
}

/** Clé de comparaison : ignore la casse et les accents. */
export function locationKey(value: string): string {
  return normalizeLocation(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Ajoute un emplacement s'il n'existe pas déjà, à la casse et aux accents près.
 * @returns la liste inchangée si l'emplacement est un doublon.
 */
export function addLocation(locations: readonly string[], value: string): string[] {
  const clean = normalizeLocation(value)
  if (clean.length === 0) return [...locations]
  const key = locationKey(clean)
  if (locations.some((l) => locationKey(l) === key)) return [...locations]
  return [...locations, clean]
}

/** Fusionne les doublons d'une liste existante, en gardant la première forme vue. */
export function dedupeLocations(locations: readonly string[]): string[] {
  const seen = new Map<string, string>()
  for (const location of locations) {
    const clean = normalizeLocation(location)
    if (clean.length === 0) continue
    const key = locationKey(clean)
    if (!seen.has(key)) seen.set(key, clean)
  }
  return [...seen.values()]
}

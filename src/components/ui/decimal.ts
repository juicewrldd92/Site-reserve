/**
 * Lecture et écriture d'un nombre décimal saisi à la main.
 *
 * Séparé du composant pour rester testable : Node sait exécuter du TypeScript,
 * pas du JSX.
 */

/** Ne garde que des chiffres et un seul séparateur décimal. */
export function clean(raw: string): string {
  const kept = raw.replace(/[^\d.,]/g, '')
  const first = kept.search(/[.,]/)
  if (first === -1) return kept
  return kept.slice(0, first + 1) + kept.slice(first + 1).replace(/[.,]/g, '')
}

export function parse(draft: string): number | null {
  if (draft.trim() === '') return null
  const value = Number(draft.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

/** Affiche à la française : 1.5 se lit « 1,5 » dans une cuisine. */
export function format(value: number): string {
  return String(value).replace('.', ',')
}

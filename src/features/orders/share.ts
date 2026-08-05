import { formatQuantity } from '@/features/products/units'
import type { OrderListItemView } from '@/lib/database.types'

/**
 * Partage d'une liste à commander.
 *
 * Le format est du texte brut : c'est ce qui se colle dans WhatsApp, un SMS ou
 * un mail sans rien casser, et ce que le fournisseur lit le plus vite.
 * Pas de PDF pour l'instant — ça coûterait ~300 Ko de dépendance pour un gain
 * douteux face à un message WhatsApp.
 */
export function formatOrderText(
  listName: string,
  establishmentName: string,
  items: OrderListItemView[],
): string {
  const lines = items
    .filter((item) => item.is_checked)
    .map((item) => `• ${item.name} — ${formatQuantity(item.quantity, item.unit)}`)

  return [
    `${listName} — ${establishmentName}`,
    '',
    ...(lines.length > 0 ? lines : ['(aucun article coché)']),
    '',
    `Envoyé depuis Réserve le ${new Date().toLocaleDateString('fr-FR')}`,
  ].join('\n')
}

export type ShareOutcome = 'shared' | 'copied' | 'failed'

/** Feuille de partage native si dispo, presse-papier sinon. */
export async function shareText(title: string, text: string): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (cause) {
      // L'utilisateur a fermé la feuille : ce n'est pas une erreur.
      if (cause instanceof DOMException && cause.name === 'AbortError') return 'failed'
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function mailtoUrl(subject: string, text: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
}

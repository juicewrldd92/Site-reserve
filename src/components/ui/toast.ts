/**
 * Petits messages de confirmation.
 *
 * Quand une feuille se ferme après un ajout, rien ne dit que ça a marché : on
 * revient au stock et il faut chercher le produit des yeux pour en être sûr.
 * Une ligne qui passe suffit à lever le doute.
 *
 * Émetteur volontairement minimal, hors React : les appels viennent de
 * `onSuccess` de mutations, où l'on n'a pas toujours un contexte sous la main.
 */

export type Toast = { id: number; message: string }

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
let listeners: Listener[] = []
let nextId = 1

/** Durée d'affichage : assez pour lire une phrase courte, pas plus. */
const DURATION = 2600

export function toast(message: string): void {
  const entry = { id: nextId++, message }
  toasts = [...toasts, entry]
  emit()

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== entry.id)
    emit()
  }, DURATION)
}

function emit(): void {
  for (const listener of listeners) listener(toasts)
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners = [...listeners, listener]
  listener(toasts)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

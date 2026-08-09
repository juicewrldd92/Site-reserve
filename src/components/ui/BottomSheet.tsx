import { useEffect, type ReactNode } from 'react'

/**
 * Feuille qui remonte du bas — le patron d'interaction principal de l'app
 * (fiche produit, switcher, filtres). Rayon 32 px, poignée centrée.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /*
   * Fige la page derrière la feuille.
   *
   * Sans ça, un glissement dans la feuille fait défiler le contenu du dessous :
   * deux couches bougent en même temps, et on perd sa place dans le stock en
   * réglant un seuil. On restaure la valeur précédente plutôt que de forcer
   * `visible`, pour ne rien casser si deux feuilles se superposent.
   */
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-canvas relative flex max-h-[85%] flex-col rounded-t-[32px] px-6 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 28px)' }}
      >
        <span className="bg-line mb-4 h-[5px] w-11 self-center rounded-full" />
        {title && (
          <h2 className="mb-3 text-[21px] font-extrabold tracking-[-0.025em]">{title}</h2>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'

import { CloseIcon, ScanIcon } from '@/components/icons'
import { isInstalled } from '@/features/install/platform'

const CLE = 'reserve.invitation-installation'

/**
 * Invitation discrète à installer l'app, sur mobile uniquement.
 *
 * Trois garde-fous, parce qu'une bannière d'installation est vite pénible :
 *
 * 1. **Mobile seulement** — proposer d'installer sur un écran d'accueil depuis
 *    un ordinateur n'a pas de sens.
 * 2. **Pas si c'est déjà fait** — l'app lancée depuis l'icône ne doit pas
 *    proposer de l'y remettre.
 * 3. **Refusée une fois, refusée pour de bon** — le choix est mémorisé. Une
 *    bannière qui revient à chaque visite se ferme sans être lue.
 *
 * Elle arrive après quelques secondes plutôt qu'à l'ouverture : recouvrir la
 * page avant même qu'on l'ait lue est le meilleur moyen de la faire fermer.
 */
export function InstallPrompt({ onOpenGuide }: { onOpenGuide: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isInstalled()) return
    if (localStorage.getItem(CLE) === 'refusee') return
    // `pointer: coarse` plutôt que la largeur : c'est le doigt qui compte, pas
    // la taille de la fenêtre.
    if (!window.matchMedia('(pointer: coarse)').matches) return

    const timer = window.setTimeout(() => setVisible(true), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  function fermer() {
    localStorage.setItem(CLE, 'refusee')
    setVisible(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3">
      {/* Bouton sous le texte plutôt qu'à côté : en 375 px, la mise côte à
          côte laissait trois mots par ligne au titre. */}
      <div className="bg-night animate-pop rounded-sheet mx-auto flex max-w-md flex-col gap-3 p-4 shadow-[0_18px_44px_rgb(0_0_0/0.42)]">
        <div className="flex items-start gap-3">
          <span className="bg-corail flex h-10 w-10 flex-none items-center justify-center rounded-[13px] text-white">
            <ScanIcon size={20} />
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[14.5px] leading-snug font-bold text-white">
              Mets Réserve sur ton écran d’accueil
            </span>
            <span className="text-[12.5px] leading-snug text-white/60">
              Une minute, et ça marche comme une vraie app.
            </span>
          </span>

          <button
            type="button"
            aria-label="Ne plus proposer"
            onClick={fermer}
            className="-mt-1 -mr-1 flex-none p-1 text-white/40"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setVisible(false)
            onOpenGuide()
          }}
          className="bg-corail h-11 w-full rounded-full text-[14px] font-bold text-white"
        >
          Voir comment faire
        </button>
      </div>
    </div>
  )
}

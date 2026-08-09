import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '@/components/ui/cn'

import { PhoneFrame } from './PhoneFrame'
import { AlertScreen, OrderScreen, ScanScreen, StockScreen } from './screens'

type Chapter = {
  id: string
  tab: string
  title: string
  text: string
  screen: ReactNode
}

const CHAPTERS: Chapter[] = [
  {
    id: 'scan',
    tab: 'Scanner',
    title: 'Le produit entre en trois secondes',
    text: "Vise le code-barres : nom, marque et photo arrivent d'Open Food Facts. Pas de code-barres — une burrata, un bac de sauce, un sac de farine en vrac ? Tu prends la photo et tu tapes le nom. C'est 70 % d'une cuisine, et chez nous ce n'est pas le cas particulier.",
    screen: <ScanScreen />,
  },
  {
    id: 'stock',
    tab: 'Stock',
    title: 'Ton stock se lit sans le lire',
    text: "Une grille de photos, une pastille de couleur par produit. Vert : ça va. Orange : la date approche. Rouge : il faut agir. Filtre par frigo, par catégorie, par urgence — et le mode inventaire ajuste les quantités au pouce, étagère par étagère.",
    screen: <StockScreen />,
  },
  {
    id: 'alertes',
    tab: 'Dates',
    title: 'Prévenu pendant que c’est encore cuisinable',
    text: "Chaque lot porte sa date. Tu choisis le délai d'alerte, produit par produit : un yaourt et un sac de farine ne se surveillent pas au même rythme. Et si tu installes Réserve sur ton écran d'accueil, le rappel arrive le matin, même app fermée.",
    screen: <AlertScreen />,
  },
  {
    id: 'commandes',
    tab: 'Commandes',
    title: 'La liste se remplit toute seule',
    text: "Stock mini, stock optimal : dès qu'un produit passe dessous, l'app calcule ce qu'il faut recommander pour revenir au bon niveau. Tu valides la commande, et le stock remonte tout seul à la réception.",
    screen: <OrderScreen />,
  },
]

/** Durée d'un chapitre avant passage au suivant, en millisecondes. */
const DWELL = 6500

/**
 * Démonstration animée de l'app.
 *
 * Le téléphone change d'écran tout seul, avec une barre qui montre où on en est
 * dans le chapitre — le visiteur voit l'app fonctionner sans avoir rien à
 * cliquer. Le premier clic sur un onglet arrête la rotation : à partir du moment
 * où quelqu'un pilote, changer d'écran sous ses yeux devient hostile.
 */
export function Showcase() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto) return

    // Respecte le réglage système : une animation en boucle peut être
    // douloureuse pour qui a désactivé les mouvements.
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches) {
      setAuto(false)
      return
    }

    const timer = window.setInterval(
      () => setActive((previous) => (previous + 1) % CHAPTERS.length),
      DWELL,
    )
    return () => window.clearInterval(timer)
  }, [auto])

  const chapter = CHAPTERS[active] ?? CHAPTERS[0]
  if (!chapter) return null

  return (
    <section id="app" className="bg-night scroll-mt-16 py-20 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-corail text-[13px] font-bold tracking-wide uppercase">
            L’app, écran par écran
          </span>
          <h2 className="font-display max-w-2xl text-[30px] leading-tight font-semibold tracking-[-0.015em] text-white sm:text-[38px]">
            Voilà exactement ce que tu auras
          </h2>
        </div>

        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
          <div className="order-2 flex flex-1 flex-col gap-6 lg:order-1">
            <div className="flex flex-wrap gap-2">
              {CHAPTERS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActive(index)
                    setAuto(false)
                  }}
                  className={cn(
                    'relative overflow-hidden rounded-full px-4 py-2 text-[13.5px] font-bold transition-colors',
                    index === active
                      ? 'bg-white text-night'
                      : 'bg-white/8 text-white/60 hover:bg-white/15',
                  )}
                >
                  {item.tab}
                  {index === active && auto && (
                    <span
                      key={`${item.id}-${active}`}
                      className="bg-corail absolute bottom-0 left-0 h-[3px] animate-[fill_6.5s_linear_forwards]"
                    />
                  )}
                </button>
              ))}
            </div>

            <div key={chapter.id} className="animate-pop flex flex-col gap-3">
              <h3 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.01em] text-white sm:text-[32px]">
                {chapter.title}
              </h3>
              <p className="max-w-xl text-[16px] leading-relaxed text-white/60">
                {chapter.text}
              </p>
            </div>

            {!auto && (
              <button
                type="button"
                onClick={() => setAuto(true)}
                className="self-start text-[13px] font-semibold text-white/40 underline"
              >
                Relancer la visite
              </button>
            )}
          </div>

          <div className="order-1 w-[270px] flex-none sm:w-[300px] lg:order-2">
            {/* La clé force le remontage : chaque écran arrive avec son
                animation d'apparition plutôt que de se substituer sèchement. */}
            <PhoneFrame key={chapter.id} dark className="animate-pop">
              {chapter.screen}
            </PhoneFrame>
          </div>
        </div>
      </div>
    </section>
  )
}

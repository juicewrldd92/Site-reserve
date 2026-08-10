import { useState } from 'react'

import { ChevronRightIcon } from '@/components/icons'
import { cn } from '@/components/ui/cn'
import { InstallGuide } from '@/features/install/InstallGuide'
import {
  PLATFORM_LABELS,
  REQUIRED_BROWSER,
  guessPlatform,
  type Platform,
} from '@/features/install/platform'

/**
 * « Mets-la sur ton écran d'accueil », sur la vitrine.
 *
 * Placée en fin de page, après le tarif : le visiteur qui arrive jusqu'ici est
 * intéressé, et c'est le bon moment pour lever la dernière inquiétude — « il
 * faut passer par un store ? ». Non, et voilà comment.
 *
 * Le même guide sert après l'inscription : une seule source de vérité pour les
 * gestes à décrire.
 */
export function InstallSection({ id = 'installer' }: { id?: string }) {
  const [platform, setPlatform] = useState<Platform | null>(null)
  const guessed = guessPlatform()

  return (
    <section id={id} className="bg-canvas-warm scroll-mt-16 py-20 sm:py-24">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-corail-tint text-corail-ink rounded-full px-3.5 py-1.5 text-[12.5px] font-bold">
            Aucun store, aucun téléchargement
          </span>
          <h2 className="font-display text-[30px] leading-tight font-semibold tracking-[-0.015em] sm:text-[38px]">
            Réserve s’installe
            <br />
            comme une vraie app
          </h2>
          <p className="text-ink-muted max-w-xl text-[16px] leading-relaxed">
            Une icône sur ton écran d’accueil, qui s’ouvre en plein écran, marche en
            chambre froide sans réseau et t’envoie les rappels de dates. Sans passer par
            l’App Store ni le Play Store.
          </p>
        </div>

        {platform ? (
          <div className="bg-surface rounded-sheet shadow-card-lg p-6 sm:p-9">
            <InstallGuide platform={platform} onBack={() => setPlatform(null)} />
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-lg gap-2.5 sm:grid-cols-2">
            {(['ios', 'android'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPlatform(option)}
                className={cn(
                  'bg-surface shadow-card flex items-center gap-3.5 rounded-2xl px-5 py-4 text-left transition-colors',
                  'border-[1.5px]',
                  guessed === option ? 'border-corail' : 'border-transparent',
                )}
              >
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[17px] font-bold">{PLATFORM_LABELS[option]}</span>
                  <span className="text-ink-muted text-[13px]">
                    {guessed === option
                      ? 'On dirait que c’est le tien'
                      : `Avec ${REQUIRED_BROWSER[option]}`}
                  </span>
                </span>
                <ChevronRightIcon size={19} className="text-ink-faint" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

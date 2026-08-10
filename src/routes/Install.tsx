import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BrandMark, CheckIcon, ChevronRightIcon, PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import {
  PLATFORM_LABELS,
  REQUIRED_BROWSER,
  guessPlatform,
  isInstalled,
  type Platform,
} from '@/features/install/platform'
import { InstallGuide } from '@/features/install/InstallGuide'

/**
 * Installation sur l'écran d'accueil, juste après la création du compte.
 *
 * C'est le moment où ça compte : une PWA rangée dans un onglet est une PWA
 * oubliée, et sur iPhone les notifications n'existent tout simplement pas tant
 * que l'app n'est pas installée. On profite donc du seul instant où l'on est
 * sûr d'avoir l'attention du restaurateur.
 *
 * On demande le système plutôt que de le deviner seul : la détection sert à
 * préselectionner, jamais à décider — un mauvais choix montrerait le mauvais
 * geste, et rien n'est plus décourageant qu'une consigne qui ne correspond pas
 * à ce qu'on a sous les yeux.
 */
export function Install() {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const guessed = guessPlatform()

  function finish() {
    navigate('/', { replace: true })
  }

  if (isInstalled()) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="bg-ok-bg text-ok flex h-16 w-16 items-center justify-center rounded-full">
            <CheckIcon size={30} strokeWidth={2.6} />
          </span>
          <h1 className="font-display text-[28px] leading-tight font-semibold">
            C’est déjà fait
          </h1>
          <p className="text-ink-muted text-[15px] leading-relaxed">
            Réserve tourne depuis ton écran d’accueil. Les rappels de dates peuvent
            arriver même quand l’app est fermée.
          </p>
          <Button onClick={finish}>Commencer mon inventaire</Button>
        </div>
      </Shell>
    )
  }

  if (!platform) {
    return (
      <Shell>
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.015em] sm:text-[34px]">
              Mets Réserve sur ton écran d’accueil
            </h1>
            <p className="text-ink-muted text-[15px] leading-relaxed">
              Une minute, une seule fois. Ensuite l’app s’ouvre d’un tap, fonctionne en
              chambre froide sans réseau, et peut te prévenir le matin quand une date
              approche.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-ink-muted text-[13px] font-bold">
              Tu es sur quel téléphone ?
            </span>
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
                      ? 'On dirait bien que c’est le tien'
                      : `Avec ${REQUIRED_BROWSER[option]}`}
                  </span>
                </span>
                <ChevronRightIcon size={19} className="text-ink-faint" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={finish}
            className="text-ink-muted self-center text-[14px] font-semibold underline"
          >
            Plus tard, je veux voir l’app
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <InstallGuide
        platform={platform}
        onBack={() => setPlatform(null)}
        onDone={finish}
      />
    </Shell>
  )
}

/* -------------------------------------------------------------------------- */

/** Cadre commun : reprend le fond crème et la respiration de la vitrine. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-canvas text-ink flex min-h-dvh flex-col">
      <header className="flex items-center gap-2.5 px-5 pt-6 sm:px-8">
        <BrandMark size={28} />
        <span className="text-[16px] font-extrabold tracking-[-0.02em]">Réserve</span>
        <span className="bg-ok-bg text-ok-ink ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold">
          <PlusIcon size={12} strokeWidth={2.6} />
          Compte créé
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10 sm:px-8">
        {children}
      </main>
    </div>
  )
}

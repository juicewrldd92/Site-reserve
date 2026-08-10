import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BrandMark, CheckIcon, ChevronRightIcon, PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import {
  PLATFORM_LABELS,
  REQUIRED_BROWSER,
  STEPS,
  guessPlatform,
  isInstalled,
  type Platform,
} from '@/features/install/platform'

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

  return <Guide platform={platform} onBack={() => setPlatform(null)} onDone={finish} />
}

/* -------------------------------------------------------------------------- */

function Guide({
  platform,
  onBack,
  onDone,
}: {
  platform: Platform
  onBack: () => void
  onDone: () => void
}) {
  const steps = STEPS[platform]

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-ink-muted self-start text-[13.5px] font-semibold underline"
          >
            ← Ce n’est pas mon téléphone
          </button>
          <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.015em] sm:text-[32px]">
            Trois gestes, depuis {REQUIRED_BROWSER[platform]}
          </h1>
          <p className="text-ink-muted text-[14.5px] leading-relaxed">
            {platform === 'ios'
              ? 'Sur iPhone, seul Safari sait installer une app depuis le web. Si tu lis ceci dans Chrome ou Instagram, rouvre la page dans Safari.'
              : 'Sur Android, c’est Chrome qui s’en charge. Le geste prend une dizaine de secondes.'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-start sm:gap-9">
          <Mock platform={platform} />

          <ol className="flex flex-1 flex-col gap-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="bg-corail-tint text-corail-ink flex h-8 w-8 flex-none items-center justify-center rounded-full text-[14px] font-extrabold">
                  {index + 1}
                </span>
                <span className="flex flex-col gap-1 pt-0.5">
                  <span className="text-[16px] leading-snug font-bold">{step.title}</span>
                  <span className="text-ink-muted text-[13.5px] leading-relaxed">
                    {step.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button onClick={onDone}>C’est installé, on continue</Button>
          <button
            type="button"
            onClick={onDone}
            className="text-ink-muted self-center py-1 text-[14px] font-semibold"
          >
            Je le ferai plus tard
          </button>
        </div>
      </div>
    </Shell>
  )
}

/**
 * Reconstitution de l'écran du téléphone au moment du geste.
 *
 * Dessiné en HTML plutôt que capturé : une capture d'écran d'iOS vieillit à
 * chaque mise à jour d'Apple, pèse lourd, et ne peut pas être traduite. Ici
 * l'illustration suit la charte du site et reste nette partout.
 */
function Mock({ platform }: { platform: Platform }) {
  return (
    <div
      aria-hidden
      className="relative w-[240px] flex-none overflow-hidden rounded-[34px] bg-white shadow-[0_26px_60px_rgb(26_26_26/0.18)]"
      style={{ aspectRatio: '390 / 620' }}
    >
      <div className="text-ink flex h-[34px] items-end justify-between px-5 pb-1.5 text-[10px] font-bold">
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span className="border-ink h-[7px] w-[12px] rounded-[2px] border" />
          <span className="bg-ink h-[7px] w-[11px] rounded-[2px]" />
        </span>
      </div>

      {/* Barre d'adresse : le repère qui permet de reconnaître son navigateur. */}
      <div className="px-3 pt-1">
        <div className="bg-canvas-warm text-ink-muted flex items-center justify-between rounded-full px-3 py-1.5 text-[9px] font-semibold">
          <span>reserveapp.online</span>
          <span>{platform === 'ios' ? 'aA' : '⋮'}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-5 pt-7">
        <BrandMark size={40} />
        <span className="text-[15px] font-extrabold tracking-[-0.02em]">Réserve</span>
        <span className="text-ink-muted text-center text-[10px] leading-snug">
          Ta réserve, dans ta poche
        </span>
      </div>

      {platform === 'ios' ? <IosSheet /> : <AndroidMenu />}
    </div>
  )
}

/** La feuille de partage de Safari, avec la ligne à trouver mise en avant. */
function IosSheet() {
  return (
    <>
      <div className="absolute right-0 bottom-[52px] left-0 px-2">
        <div className="rounded-t-[18px] bg-[#f2f1f6] px-3 pt-2.5 pb-3 shadow-[0_-8px_24px_rgb(26_26_26/0.14)]">
          <span className="mx-auto mb-2.5 block h-1 w-9 rounded-full bg-black/20" />

          <div className="flex flex-col gap-1.5">
            <Row label="Copier" icon="⧉" />
            <Row label="Ajouter aux favoris" icon="★" />
            {/* La ligne qu'on cherche : c'est tout l'objet de l'écran. */}
            <Row label="Sur l’écran d’accueil" icon="＋" highlight />
            <Row label="Marquer" icon="✎" />
          </div>
        </div>
      </div>

      {/* Barre de Safari : le bouton Partager est l'étape 1. */}
      <div className="absolute right-0 bottom-0 left-0 flex items-center justify-around bg-[#f2f1f6] px-4 py-3 text-[13px] text-[#8e8e93]">
        <span>‹</span>
        <span>›</span>
        <span className="ring-corail relative rounded-md px-1.5 text-[#007aff] ring-2">
          ↑
          <span className="bg-corail absolute -top-1.5 -right-1.5 h-2 w-2 rounded-full" />
        </span>
        <span>▢</span>
        <span>⧉</span>
      </div>
    </>
  )
}

/** Le menu de Chrome, avec l'entrée d'installation mise en avant. */
function AndroidMenu() {
  return (
    <>
      {/* Voile : Chrome assombrit la page quand le menu s'ouvre, et ça évite
          que le contenu du dessous ne dépasse bizarrement du panneau. */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute top-[62px] right-2 w-[168px]">
        <div className="rounded-[14px] bg-white px-1.5 py-2 shadow-[0_10px_30px_rgb(26_26_26/0.22)]">
          <div className="flex flex-col gap-1">
            <Row label="Nouvel onglet" icon="＋" compact />
            <Row label="Favoris" icon="★" compact />
            <Row label="Installer l’application" icon="⤓" highlight compact />
            <Row label="Historique" icon="↻" compact />
          </div>
        </div>
      </div>
    </>
  )
}

function Row({
  label,
  icon,
  highlight = false,
  compact = false,
}: {
  label: string
  icon: string
  highlight?: boolean
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        'flex items-center justify-between rounded-[9px] px-2.5 font-semibold',
        compact ? 'py-1.5 text-[9px]' : 'bg-white py-2 text-[9.5px]',
        highlight
          ? 'bg-corail-tint text-corail-ink ring-corail ring-2'
          : 'text-ink-muted',
      )}
    >
      {label}
      <span className={cn('text-[11px]', highlight && 'text-corail')}>{icon}</span>
    </span>
  )
}

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

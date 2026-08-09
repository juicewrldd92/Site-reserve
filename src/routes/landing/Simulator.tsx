import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CheckIcon, ChevronRightIcon, CloseIcon } from '@/components/icons'
import { cn } from '@/components/ui/cn'
import { TRIAL_LABEL } from '@/lib/offer'

import {
  COVER_OPTIONS,
  EXPIRY_OPTIONS,
  HOURS_OPTIONS,
  RESTAURANT_TYPES,
  WASTE_OPTIONS,
  estimate,
  euros,
  type Answers,
  type RestaurantType,
} from './wasteEstimate'

/**
 * Simulateur de pertes.
 *
 * Six questions, une réponse par écran, passage automatique à la suivante : on
 * vise quarante secondes montre en main. Rester sur un écran par question évite
 * la liste interminable qu'on abandonne à mi-parcours.
 *
 * Les deux questions du milieu s'adaptent au type de restaurant choisi — on
 * demande à une crêperie ce qu'elle jette en beurre, pas en mozzarella.
 */
export function Simulator() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<Answers>>({})
  const [showInvite, setShowInvite] = useState(false)

  const type = useMemo<RestaurantType | null>(
    () => RESTAURANT_TYPES.find((t) => t.id === answers.type) ?? null,
    [answers.type],
  )

  const questions: Array<{
    prompt: string
    hint?: string
    options: Array<{ label: string; value: string | number; emoji?: string }>
    key: keyof Answers
    columns?: 2 | 4
  }> = [
    {
      key: 'type',
      prompt: 'Ton resto, c’est plutôt…',
      options: RESTAURANT_TYPES.map((t) => ({
        label: t.label,
        value: t.id,
        emoji: t.emoji,
      })),
      columns: 2,
    },
    {
      key: 'covers',
      prompt: 'Combien de couverts par jour ?',
      options: COVER_OPTIONS,
    },
    {
      key: 'staple1',
      prompt: `Sur ${type?.staples[0].label ?? 'les produits frais'}, tu jettes…`,
      hint: 'Sur une semaine normale.',
      options: WASTE_OPTIONS,
    },
    {
      key: 'staple2',
      prompt: `Et sur ${type?.staples[1].label ?? 'les légumes'} ?`,
      options: WASTE_OPTIONS,
    },
    {
      key: 'expiry',
      prompt: 'Tu découvres un produit périmé…',
      hint: 'Par semaine.',
      options: EXPIRY_OPTIONS,
    },
    {
      key: 'hours',
      prompt: 'Tu passes combien de temps à gérer ton stock ?',
      hint: 'Compter, vérifier les dates, passer les commandes. Par semaine.',
      options: HOURS_OPTIONS,
    },
  ]

  const done = step >= questions.length
  const current = questions[step]

  function answer(key: keyof Answers, value: string | number) {
    setAnswers((previous) => ({ ...previous, [key]: value }))
    // Passage automatique : une question répondue est une question finie.
    setStep((previous) => previous + 1)
    if (step === questions.length - 1) {
      // Laisse le résultat s'afficher avant de le recouvrir d'une invitation.
      setTimeout(() => setShowInvite(true), 2200)
    }
  }

  function restart() {
    setAnswers({})
    setStep(0)
    setShowInvite(false)
  }

  const result = done ? estimate(answers as Answers) : null

  return (
    <section id="simulateur" className="bg-canvas-warm scroll-mt-16 py-20 sm:py-24">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-corail-tint text-corail-ink rounded-full px-3.5 py-1.5 text-[12.5px] font-bold">
            40 secondes
          </span>
          <h2 className="font-display text-[30px] leading-tight font-semibold tracking-[-0.015em] sm:text-[38px]">
            Combien te coûte
            <br />
            ce que tu jettes ?
          </h2>
          <p className="text-ink-muted max-w-lg text-[16px] leading-relaxed">
            Six questions courtes, adaptées à ta cuisine. À la fin, un ordre de grandeur de
            ce qui part à la poubelle — en euros et en heures.
          </p>
        </div>

        <div className="bg-surface rounded-card shadow-card-lg relative overflow-hidden">
          {!done && current ? (
            <div className="flex flex-col gap-6 p-6 sm:p-9">
              <div className="flex flex-col gap-3">
                <div className="bg-canvas-warm h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-corail h-full rounded-full transition-all duration-300"
                    style={{ width: `${(step / questions.length) * 100}%` }}
                  />
                </div>
                <span className="text-ink-faint text-[12.5px] font-bold">
                  Question {step + 1} sur {questions.length}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-[21px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[25px]">
                  {current.prompt}
                </h3>
                {current.hint && (
                  <span className="text-ink-muted text-[13.5px]">{current.hint}</span>
                )}
              </div>

              <div
                className={cn(
                  'grid gap-2.5',
                  current.columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2',
                )}
              >
                {current.options.map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => answer(current.key, option.value)}
                    className="border-line hover:border-corail hover:bg-corail-tint/40 flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left text-[15.5px] font-semibold transition-colors"
                  >
                    {option.emoji && <span className="text-[19px]">{option.emoji}</span>}
                    <span className="flex-1">{option.label}</span>
                    <ChevronRightIcon size={16} className="text-ink-faint" />
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((previous) => previous - 1)}
                  className="text-ink-muted self-start text-[13.5px] font-semibold underline"
                >
                  Revenir en arrière
                </button>
              )}
            </div>
          ) : (
            result && <Result result={result} onRestart={restart} />
          )}
        </div>

        <p className="text-ink-faint mx-auto max-w-xl text-center text-[12px] leading-relaxed">
          Estimation indicative, calculée à partir de tes réponses et du taux de gaspillage
          moyen de la restauration commerciale (15 à 20 % des achats, source ADEME). Ce
          n'est pas une comptabilité : c'est un ordre de grandeur.
        </p>
      </div>

      {showInvite && result && (
        <InviteModal result={result} onClose={() => setShowInvite(false)} />
      )}
    </section>
  )
}

function Result({
  result,
  onRestart,
}: {
  result: ReturnType<typeof estimate>
  onRestart: () => void
}) {
  return (
    <div className="flex flex-col">
      <div className="bg-night flex flex-col gap-2 px-6 py-9 text-center sm:px-9">
        <span className="text-[13px] font-bold tracking-wide text-white/50 uppercase">
          Tu jettes environ
        </span>
        <span className="font-display text-[44px] leading-none font-semibold text-white sm:text-[56px]">
          {euros(result.wastedPerYear)}
        </span>
        <span className="text-[15px] text-white/60">de nourriture par an</span>
      </div>

      <div className="flex flex-col gap-5 p-6 sm:p-9">
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat
            value={`${result.hoursPerYear} h`}
            label="passées à gérer ton stock chaque année"
          />
          <Stat
            value={`${result.wasteRate * 100 > 0 ? Math.round(result.wasteRate * 100) : 0} %`}
            label={`de tes achats alimentaires, estimés à ${euros(result.purchasesPerYear)} par an`}
          />
        </div>

        <div className="bg-fresh-bg rounded-card flex flex-col gap-2 px-5 py-5">
          <span className="text-fresh-ink text-[14px] font-bold">
            Ce qu’un suivi sérieux récupère
          </span>
          <span className="font-display text-fresh-ink text-[30px] leading-none font-semibold">
            {euros(result.recoverable[0])} à {euros(result.recoverable[1])}
          </span>
          <span className="text-fresh-ink/80 text-[13.5px] leading-relaxed">
            par an, plus environ {result.hoursSaved} h de ton temps. Suivre ses dates ne
            supprime pas le gaspillage — mais voir ce qui va tourner avant de le jeter
            change nettement l’ardoise.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/bienvenue"
            className="bg-corail shadow-corail flex h-12 items-center gap-2 rounded-full px-6 text-[15.5px] font-bold text-white"
          >
            Essayer {TRIAL_LABEL} gratuitement
            <ChevronRightIcon size={17} />
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="text-ink-muted text-[13.5px] font-semibold underline"
          >
            Refaire le test
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-canvas-warm rounded-card flex flex-col gap-1 px-5 py-4">
      <span className="font-display text-[26px] leading-none font-semibold">{value}</span>
      <span className="text-ink-muted text-[13px] leading-snug">{label}</span>
    </div>
  )
}

/**
 * L'invitation, une fois le résultat lu.
 *
 * Elle arrive après un délai plutôt qu'instantanément : recouvrir un chiffre au
 * moment où on le découvre, c'est le meilleur moyen de le faire fermer sans
 * l'avoir lu.
 */
function InviteModal({
  result,
  onClose,
}: {
  result: ReturnType<typeof estimate>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Essai gratuit"
        className="bg-surface rounded-card shadow-card-lg animate-pop relative flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto p-6 sm:p-8"
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="text-ink-faint absolute top-4 right-4"
        >
          <CloseIcon size={18} />
        </button>

        <span className="bg-corail-tint text-corail-ink self-start rounded-full px-3 py-1.5 text-[12px] font-bold">
          {TRIAL_LABEL} offerts
        </span>

        <h3 className="text-[23px] leading-tight font-extrabold tracking-[-0.02em]">
          Et si tu en récupérais
          <br />
          {euros(result.recoverable[1])} cette année ?
        </h3>

        <p className="text-ink-muted text-[14.5px] leading-relaxed">
          Réserve suit tes dates lot par lot, te prévient avant que ça tourne, et calcule
          tes commandes à ta place. Quatorze jours pour voir si ça change quelque chose chez
          toi.
        </p>

        <ul className="flex flex-col gap-2">
          {[
            'Sans carte bancaire',
            'Ton stock prêt en 10 minutes',
            'Rien à installer, ça marche sur ton téléphone',
          ].map((line) => (
            <li key={line} className="flex items-center gap-2.5 text-[14px] font-semibold">
              <span className="bg-fresh-bg text-fresh-ink flex h-6 w-6 flex-none items-center justify-center rounded-full">
                <CheckIcon size={14} />
              </span>
              {line}
            </li>
          ))}
        </ul>

        <Link
          to="/bienvenue"
          className="bg-corail shadow-corail flex h-13 items-center justify-center gap-2 rounded-full text-[16px] font-bold text-white"
        >
          Démarrer mon essai
          <ChevronRightIcon size={18} />
        </Link>

        <button
          type="button"
          onClick={onClose}
          className="text-ink-faint text-[13px] font-semibold"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}

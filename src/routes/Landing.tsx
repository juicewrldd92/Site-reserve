import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BrandMark, CheckIcon, ChevronRightIcon } from '@/components/icons'
import { cn } from '@/components/ui/cn'

import { PhoneFrame } from './landing/PhoneFrame'
import { AlertScreen, OrderScreen, ScanScreen, StockScreen } from './landing/screens'

/**
 * Vitrine publique.
 *
 * Structure calquée sur les landings SaaS restauration qui convertissent :
 * héros sombre, puis sections crème alternées, un module par promesse avec sa
 * capture, et un seul appel à l’action répété. L’identité, elle, reste celle de
 * l’app — corail, Plus Jakarta Sans, cartes à rayon 20.
 *
 * Le serif (Fraunces) n’apparaît que sur les titres de cette page : il donne le
 * ton éditorial d’une vitrine sans contaminer l’app, qui reste en sans-serif.
 */
export function Landing() {
  return (
    <div className="bg-canvas text-ink font-sans">
      <TopBar />
      <Hero />
      <Promises />
      <Proof />
      <Module
        eyebrow="Le scan"
        title={['Prends une photo,', 'oublie la saisie']}
        text="Vise un code-barres : le nom, la marque et la photo arrivent tout seuls. Pas de code-barres ? Une photo et trois taps. En cuisine, c’est 70 % du stock — chez nous ce n’est pas un cas particulier, c’est le cas normal."
        bullets={[
          'Fonctionne sur iPhone comme sur Android',
          'Photo prise sur place pour la mise en place et le frais',
          'Le produit scanné une fois est réutilisable partout',
        ]}
        screen={<ScanScreen />}
        dark
      />
      <Module
        eyebrow="Les dates"
        title={['Sois prévenu avant', 'que ça tourne']}
        text="Chaque lot porte sa date. L’app prévient au délai que tu choisis — un jour, une semaine, un mois — et le réglage se fait produit par produit. Un yaourt et un sac de farine ne se surveillent pas au même rythme."
        bullets={[
          'Alertes groupées par urgence, action directe sur chaque ligne',
          'Délai réglable par produit ou pour tout l’établissement',
          'Traçabilité des dates, utile le jour du contrôle',
        ]}
        screen={<AlertScreen />}
        reverse
      />
      <Module
        eyebrow="Les commandes"
        title={['Arrête de commander', 'au feeling']}
        text="Tu renseignes un stock mini et un stock optimal. Dès qu’un produit passe dessous, l’app calcule la quantité à commander pour revenir au bon niveau, et regroupe la liste par fournisseur."
        bullets={[
          'Liste générée en un tap depuis le stock bas',
          'Partage WhatsApp, mail ou copie directe',
          'Le stock remonte tout seul à la réception',
        ]}
        screen={<OrderScreen />}
        dark
      />
      <Selling />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function TopBar() {
  return (
    <header className="bg-night sticky top-0 z-50 border-b border-white/8">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <span className="flex items-center gap-2.5">
          <BrandMark size={28} />
          <span className="text-[17px] font-extrabold tracking-[-0.02em] text-white">
            Réserve
          </span>
        </span>
        <nav className="ml-auto flex items-center gap-6">
          <a href="#tarif" className="hidden text-[14px] font-semibold text-white/70 sm:block">
            Tarif
          </a>
          <Link to="/connexion" className="text-[14px] font-semibold text-white/70">
            Se connecter
          </Link>
          <Link
            to="/bienvenue"
            className="bg-corail rounded-full px-4 py-2 text-[14px] font-bold text-white"
          >
            Essayer
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="bg-night relative overflow-hidden">
      {/* Trame discrète, comme le fond du scanner. */}
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_20%_40%,rgb(255_90_60/0.14),transparent_70%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 py-20 lg:flex-row lg:py-28">
        <div className="flex flex-1 flex-col gap-6 xl:min-w-[38rem]">
          <h1 className="font-display text-[32px] leading-[1.08] font-semibold tracking-[-0.02em] text-white sm:text-[46px] xl:text-[56px]">
            Ta réserve mérite mieux
            <br />
            qu’un carnet à spirale
          </h1>
          <p className="text-[17px] leading-relaxed text-white/65">
            Pour les restaurants indépendants fatigués de commander au pif, de jeter ce
            qu’ils n’ont pas vu passer, et de compter leur stock sur un bout de papier.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/bienvenue"
              className="bg-corail shadow-corail flex h-13 items-center gap-2 rounded-full px-7 text-[16px] font-bold text-white"
            >
              Essayer gratuitement
              <ChevronRightIcon size={18} />
            </Link>
            <span className="text-[14px] text-white/45">30 jours, sans carte bancaire</span>
          </div>
        </div>

        {/* Deux écrans : le geste (scanner) et le résultat (le stock).
            Largeur fixée pour que le second téléphone reste dans le cadre. */}
        <div className="relative w-[300px] flex-none pb-6 sm:w-[350px] lg:ml-auto">
          <PhoneFrame dark className="rotate-[-4deg]">
            <ScanScreen />
          </PhoneFrame>
          <PhoneFrame className="absolute right-0 bottom-0 hidden w-[195px] rotate-[6deg] sm:block">
            <StockScreen />
          </PhoneFrame>
        </div>
      </div>
    </section>
  )
}

function Promises() {
  const promises = [
    {
      title: 'Toute la brigade sur le même stock',
      text: "Le commis ajuste en chambre froide, le chef le voit depuis son bureau. Plus de carnet que personne d’autre ne sait lire.",
    },
    {
      title: 'Rien ne périme en silence',
      text: "Les dates sont suivies lot par lot. Tu es prévenu au moment où tu peux encore cuisiner le produit, pas quand il faut le jeter.",
    },
    {
      title: 'Commande la bonne quantité',
      text: "Stock mini, stock optimal, et l’app calcule ce qu’il manque. Ta liste se génère en un tap et part sur WhatsApp.",
    },
  ]

  return (
    <Section>
      <div className="grid gap-10 md:grid-cols-3">
        {promises.map((promise) => (
          <div key={promise.title} className="flex flex-col gap-3">
            <span className="bg-corail h-1 w-10 rounded-full" />
            <h3 className="font-display text-[24px] leading-tight font-semibold tracking-[-0.01em]">
              {promise.title}
            </h3>
            <p className="text-ink-muted text-[15.5px] leading-relaxed">{promise.text}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Proof() {
  return (
    <Section warm>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        <h2 className="font-display text-[30px] leading-tight font-semibold tracking-[-0.015em] sm:text-[38px]">
          Un restaurant jette en moyenne
          <br />
          entre 15 et 20 % de ce qu’il achète
        </h2>
        <p className="text-ink-muted max-w-xl text-[16px] leading-relaxed">
          Une bonne partie part sans que personne ne l’ait vu venir : un bac oublié au fond,
          une date dépassée d’un jour, une commande passée deux fois. C’est exactement ce
          que Réserve rend visible.
        </p>
        <div className="grid w-full gap-4 sm:grid-cols-3">
          {[
            ['3 s', 'pour entrer un produit, photo comprise'],
            ['0', 'réseau nécessaire en chambre froide'],
            ['1 tap', 'pour générer la liste à commander'],
          ].map(([value, label]) => (
            <div
              key={label}
              className="bg-surface rounded-card shadow-card flex flex-col gap-1 px-5 py-6"
            >
              <span className="font-display text-corail text-[32px] leading-none font-semibold">
                {value}
              </span>
              <span className="text-ink-muted text-[13.5px] leading-snug">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-ink-faint text-[12.5px]">
          Chiffre de gaspillage : moyenne du secteur de la restauration commerciale (ADEME).
        </p>
      </div>
    </Section>
  )
}

function Module({
  eyebrow,
  title,
  text,
  bullets,
  screen,
  reverse = false,
  dark = false,
}: {
  eyebrow: string
  title: [string, string]
  text: string
  bullets: string[]
  screen: ReactNode
  reverse?: boolean
  dark?: boolean
}) {
  return (
    <Section warm={reverse}>
      <div
        className={cn(
          'flex flex-col items-center gap-12 lg:gap-20',
          reverse ? 'lg:flex-row-reverse' : 'lg:flex-row',
        )}
      >
        <div className="flex max-w-lg flex-col gap-5">
          <span className="text-corail-ink text-[13px] font-bold tracking-[0.06em] uppercase">
            {eyebrow}
          </span>
          <h2 className="font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.015em] sm:text-[40px]">
            {title[0]}
            <br />
            {title[1]}
          </h2>
          <p className="text-ink-muted text-[16px] leading-relaxed">{text}</p>
          <ul className="flex flex-col gap-2.5 pt-1">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-[15px]">
                <span className="bg-ok-bg text-ok mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full">
                  <CheckIcon size={11} strokeWidth={3} />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-none justify-center">
          <PhoneFrame dark={dark}>{screen}</PhoneFrame>
        </div>
      </div>
    </Section>
  )
}

function Selling() {
  const points = [
    ['Prêt en un après-midi', 'On charge ton stock de départ avec toi. Tu ne repars pas avec une page blanche.'],
    ['Sur le téléphone que tu as déjà', "Rien à installer depuis un magasin d’applications. Ça s’ajoute à l’écran d’accueil."],
    [
      'La brigade s’y met sans formation',
      'Scanner, +, −. Il n’y a rien d’autre à comprendre.',
    ],
    ['Sans engagement', 'Tu arrêtes quand tu veux, et tu repars avec tes données.'],
  ]

  return (
    <Section>
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {points.map(([title, text]) => (
          <div key={title} className="flex gap-3.5">
            <span className="bg-corail-tint text-corail mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full">
              <CheckIcon size={15} strokeWidth={2.6} />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-[16.5px] font-bold">{title}</h3>
              <p className="text-ink-muted text-[14.5px] leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Pricing() {
  return (
    <Section warm id="tarif">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-7 text-center">
        <h2 className="font-display text-[32px] leading-tight font-semibold tracking-[-0.015em] sm:text-[40px]">
          Moins cher qu’une cagette
          <br />
          de tomates oubliée
        </h2>

        <div className="bg-surface rounded-sheet shadow-card w-full max-w-sm px-8 py-9">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="font-display text-[52px] leading-none font-semibold">19 €</span>
            <span className="text-ink-muted text-[15px] font-semibold">/ mois</span>
          </div>
          <p className="text-ink-muted pt-1.5 text-[13.5px]">par établissement</p>

          <ul className="flex flex-col gap-2.5 pt-7 text-left">
            {[
              'Produits et utilisateurs illimités',
              'Alertes de dates et de stock bas',
              'Listes à commander et partage',
              'Fonctionne hors-ligne',
              'Inventaire de départ chargé avec toi',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[14.5px]">
                <span className="bg-ok-bg text-ok mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full">
                  <CheckIcon size={11} strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </ul>

          <Link
            to="/bienvenue"
            className="bg-corail shadow-corail mt-8 flex h-13 items-center justify-center rounded-full text-[15.5px] font-bold text-white"
          >
            Commencer les 30 jours
          </Link>
          <p className="text-ink-faint pt-3 text-[12.5px]">Sans carte bancaire, sans engagement</p>
        </div>
      </div>
    </Section>
  )
}

function FinalCta() {
  return (
    <section className="bg-night relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_100%,rgb(255_90_60/0.18),transparent_70%)]" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-7 px-6 py-24 text-center">
        <h2 className="font-display text-[34px] leading-tight font-semibold tracking-[-0.015em] text-white sm:text-[44px]">
          On regarde ton stock ensemble ?
        </h2>
        <p className="max-w-lg text-[16.5px] leading-relaxed text-white/65">
          Quinze minutes en visio, on charge ton inventaire pendant qu’on discute, et tu
          vois par toi-même. Si ça ne te sert pas, tu n’entends plus parler de moi.
        </p>
        <Link
          to="/bienvenue"
          className="bg-corail shadow-corail flex h-14 items-center gap-2 rounded-full px-8 text-[16.5px] font-bold text-white"
        >
          Essayer gratuitement
          <ChevronRightIcon size={18} />
        </Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-night border-t border-white/8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <span className="flex items-center gap-2.5">
          <BrandMark size={26} />
          <span className="text-[15.5px] font-extrabold tracking-[-0.02em] text-white">
            Réserve
          </span>
        </span>
        <nav className="flex flex-wrap gap-6 text-[14px] text-white/55 sm:ml-auto">
          <a href="#tarif">Tarif</a>
          <Link to="/connexion">Se connecter</Link>
          <a href="mailto:contact@reserve.app">Nous écrire</a>
        </nav>
      </div>
      <p className="text-[12.5px] text-white/30 mx-auto max-w-6xl px-6 pb-8">
        © {new Date().getFullYear()} Réserve — l’app de stock des restaurateurs.
      </p>
    </footer>
  )
}

function Section({
  children,
  warm = false,
  id,
}: {
  children: ReactNode
  warm?: boolean
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn('px-6 py-20 sm:py-24', warm ? 'bg-canvas-warm' : 'bg-canvas')}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

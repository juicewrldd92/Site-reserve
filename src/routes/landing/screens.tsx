import { CalendarIcon, CheckIcon, MinusIcon, PlusIcon, ScanIcon } from '@/components/icons'

/**
 * Vignette produit des écrans de démonstration.
 *
 * Les écrans sont dessinés en HTML, mais les produits, eux, méritent d'être
 * vus : un aplat rayé ne donne pas envie, et c'est précisément la grille de
 * photos qui fait l'écran signature de l'app.
 */
/**
 * Code-barres dessiné, posé sur le produit visé.
 *
 * Motif fixe et non aléatoire : un `Math.random()` ferait danser les barres à
 * chaque rendu de la démonstration, et rien n'a l'air plus faux qu'un
 * code-barres qui change tout seul.
 *
 * Ce n'est pas un EAN valide et ça n'a pas à l'être — c'est une illustration,
 * pas une étiquette à scanner.
 */
const BARRES = [
  2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1,
  2, 2, 1, 3, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2,
]

function Barcode() {
  return (
    <span
      // Légèrement de travers : une étiquette n'est jamais parfaitement
      // alignée avec l'objectif quand on scanne d'une main.
      className="flex flex-col items-center gap-[2px] rounded-[2px] bg-white px-1.5 py-1 shadow-[0_2px_8px_rgb(0_0_0/0.5)]"
      style={{
        // Une étiquette collée sur un flacon cylindrique s'incline avec lui et
        // s'enroule légèrement : d'où la rotation prononcée et la perspective.
        // Elle reste blanc franc — sur un fond sombre, un fondu grisait les
        // barres au point de les rendre illisibles.
        transform: 'rotate(-6deg) perspective(190px) rotateY(-13deg) scale(0.9)',
      }}
    >
      <span className="flex h-[30px] items-stretch gap-[1.5px]">
        {BARRES.map((largeur, index) => (
          <span
            key={index}
            className="bg-night"
            style={{ width: `${largeur}px` }}
          />
        ))}
      </span>
      <span className="text-night text-[6px] leading-none font-bold tracking-[0.18em]">
        3 256540 000178
      </span>
    </span>
  )
}

function Vignette({ photo, className }: { photo: string; className?: string }) {
  return (
    <img
      src={`/photos/${photo}.jpg`}
      alt=""
      width={420}
      height={420}
      loading="lazy"
      decoding="async"
      className={`photo-ph object-cover ${className ?? ''}`}
    />
  )
}

/**
 * Les trois écrans montrés sur la vitrine, reconstruits à partir du design
 * system de l’app. Données d’exemple assumées : ce sont des illustrations,
 * pas des captures d’un vrai compte.
 */

export function ScanScreen() {
  return (
    <div className="relative h-full overflow-hidden">
      {/* Vue caméra : ce que l'objectif voit quand on vise un produit dans
          un rayon crémerie, avec la profondeur d'un vrai magasin. */}
      <img
        src="/photos/scan.jpg"
        alt=""
        width={505}
        height={880}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* L'aperçu caméra d'un téléphone n'est jamais en pleine lumière, et le
          réticule doit rester lisible par-dessus. */}
      <div className="absolute inset-0 bg-[radial-gradient(115%_65%_at_50%_31%,rgb(0_0_0/0.04),rgb(0_0_0/0.58)_80%)]" />

      {/* Réticule et code-barres au même endroit : sur le corps de la boîte,
          là où l'étiquette se trouve réellement. Un code-barres flottant au
          centre de l'écran se voit tout de suite comme un collage. */}
      <div className="absolute top-[31%] left-1/2 h-[158px] w-[158px] -translate-x-1/2 -translate-y-1/2">
        <span className="border-corail absolute top-0 left-0 h-8 w-8 rounded-tl-[13px] border-t-[3px] border-l-[3px]" />
        <span className="border-corail absolute top-0 right-0 h-8 w-8 rounded-tr-[13px] border-t-[3px] border-r-[3px]" />
        <span className="border-corail absolute bottom-0 left-0 h-8 w-8 rounded-bl-[13px] border-b-[3px] border-l-[3px]" />
        <span className="border-corail absolute right-0 bottom-0 h-8 w-8 rounded-br-[13px] border-b-[3px] border-r-[3px]" />

        <span className="absolute top-1/2 right-2 left-2 h-px bg-[linear-gradient(90deg,transparent,#FF5A3C,transparent)] shadow-[0_0_14px_rgb(255_90_60/0.9)]" />
      </div>

      {/*
        Le code-barres appartient à la bouteille, pas au cadre de visée : il est
        donc posé sur elle, décentré et vers le bas comme sur un vrai flacon,
        et non calé au milieu du réticule. C'est ce décalage qui fait la
        différence entre une étiquette imprimée et un calque.
      */}
      <span className="absolute top-[35%] left-[27%] origin-left">
        <Barcode />
      </span>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3.5 px-6 pb-6">
        <p className="text-center text-[12px] leading-snug font-semibold text-white drop-shadow-[0_1px_6px_rgb(0_0_0/0.8)]">
          Vise le code-barres,
          <br />
          on s’occupe du reste.
        </p>

        <div className="flex h-10 w-full items-center justify-center gap-2 rounded-full border-[1.4px] border-white/50 bg-black/30 text-[11.5px] font-bold text-white backdrop-blur-sm">
          <PlusIcon size={14} strokeWidth={2} />
          Ajouter sans code-barre
        </div>
      </div>
    </div>
  )
}

export function StockScreen() {
  const items = [
    { name: 'Tomates San Marzano', meta: '12 boîtes · Réserve', tone: 'ok', badge: 'En stock', photo: 'tomates' },
    { name: 'Mozzarella di bufala', meta: '4 pièces · Frigo', tone: 'alert', badge: 'DLC J-1', photo: 'mozzarella' },
    { name: 'Farine T65', meta: '2 sacs · Réserve', tone: 'warn', badge: 'Stock bas', photo: 'farine' },
    { name: 'Basilic frais', meta: '3 bottes · Frigo', tone: 'warn', badge: 'DLC J-3', photo: 'basilic' },
  ] as const

  const tones = {
    ok: 'bg-ok-bg text-ok-ink',
    warn: 'bg-warn-bg text-warn-ink',
    alert: 'bg-alert-bg text-alert-ink',
  }

  return (
    <div className="flex h-full flex-col gap-2.5 px-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[18px] font-extrabold tracking-[-0.03em]">Mon stock</span>
        <span className="text-ink-muted text-[10px] font-semibold">128 produits</span>
      </div>

      <div className="bg-surface shadow-card flex items-center gap-2 rounded-full px-3 py-2">
        <span className="bg-ink-faint/40 h-2.5 w-2.5 rounded-full" />
        <span className="text-ink-faint text-[10.5px]">Cherche un produit…</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.name} className="bg-surface rounded-[13px] shadow-card overflow-hidden">
            <div className="relative h-16">
              <Vignette photo={item.photo} className="h-full w-full" />
              <span
                className={`absolute top-1.5 right-1.5 rounded-full px-1.5 py-[3px] text-[7.5px] font-bold ${tones[item.tone]}`}
              >
                {item.badge}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-2 pt-1.5 pb-2">
              <span className="text-[9.5px] leading-tight font-bold">{item.name}</span>
              <span className="text-ink-muted text-[8px]">{item.meta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AlertScreen() {
  return (
    <div className="flex h-full flex-col gap-3 px-4">
      <span className="text-[18px] font-extrabold tracking-[-0.03em]">Alertes</span>

      <div className="flex items-center gap-1.5">
        <span className="bg-alert h-1.5 w-1.5 rounded-full" />
        <span className="text-[10.5px] font-bold">À cuisiner vite · 1</span>
      </div>
      <div className="bg-surface shadow-card border-alert flex items-center gap-2 rounded-[13px] border-l-[3px] p-2">
        <Vignette photo="creme" className="h-8 w-8 flex-none rounded-[9px]" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[10px] font-bold">Crème liquide 35%</span>
          <span className="text-alert-ink text-[8.5px] font-semibold">
            Périmée depuis hier · 2 briques
          </span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <span className="bg-warn h-1.5 w-1.5 rounded-full" />
        <span className="text-[10.5px] font-bold">DLC proche · 2</span>
      </div>
      {[
        ['Mozzarella di bufala', 'Demain · 4 pièces', 'mozzarella'],
        ['Basilic frais', 'Dans 3 jours · 3 bottes', 'basilic'],
      ].map(([name, meta, photo]) => (
        <div
          key={name}
          className="bg-surface shadow-card border-warn flex items-center gap-2 rounded-[13px] border-l-[3px] p-2"
        >
          <Vignette photo={photo as string} className="h-8 w-8 flex-none rounded-[9px]" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[10px] font-bold">{name}</span>
            <span className="text-warn-ink text-[8.5px] font-semibold">{meta}</span>
          </span>
        </div>
      ))}

      <div className="bg-surface shadow-card mt-1 flex items-center gap-2 rounded-[13px] p-2">
        <CalendarIcon size={13} className="text-corail flex-none" />
        <span className="text-ink-muted text-[9px]">
          Prévenu 3 jours avant, réglable par produit
        </span>
      </div>
    </div>
  )
}

export function OrderScreen() {
  return (
    <div className="flex h-full flex-col gap-2.5 px-4">
      <span className="text-[18px] font-extrabold tracking-[-0.03em]">À commander</span>

      <div className="flex gap-1.5">
        <span className="bg-corail flex-1 rounded-full py-1.5 text-center text-[8.5px] font-bold text-white">
          À commander
        </span>
        <span className="bg-chip text-ink-faint flex-1 rounded-full py-1.5 text-center text-[8.5px] font-bold">
          Commandée
        </span>
        <span className="bg-chip text-ink-faint flex-1 rounded-full py-1.5 text-center text-[8.5px] font-bold">
          Reçue
        </span>
      </div>

      <div className="border-line-soft flex h-9 items-center justify-center gap-1.5 rounded-full border-[1.4px] border-dashed text-[10px] font-bold">
        <ScanIcon size={12} className="text-corail" />
        Générer depuis le stock bas
      </div>

      {[
        ['Farine T65', 'Metro · sac 25 kg', '9', true, 'farine'],
        ['Roquette', 'Primeur · sachet 500 g', '4', true, 'roquette'],
        ['Huile d’olive', 'Metro · bidon 5 L', '2', false, 'huile'],
      ].map(([name, meta, qty, checked, photo]) => (
        <div
          key={name as string}
          className={`bg-surface shadow-card flex items-center gap-2 rounded-[13px] p-2 ${checked ? '' : 'opacity-60'}`}
        >
          <span
            className={`flex h-4 w-4 flex-none items-center justify-center rounded-full ${
              checked ? 'bg-corail text-white' : 'border-[1.5px] border-[#DCD5CC]'
            }`}
          >
            {checked ? <CheckIcon size={9} strokeWidth={2.6} /> : null}
          </span>
          <Vignette photo={photo as string} className="h-7 w-7 flex-none rounded-[8px]" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[9.5px] font-bold">{name}</span>
            <span className="text-ink-muted text-[8px]">{meta}</span>
          </span>
          <span className="flex flex-none items-center gap-1">
            <span className="border-line flex h-4 w-4 items-center justify-center rounded-full border">
              <MinusIcon size={7} strokeWidth={2.4} />
            </span>
            <span className="min-w-2.5 text-center text-[10px] font-bold">{qty}</span>
            <span className="border-line flex h-4 w-4 items-center justify-center rounded-full border">
              <PlusIcon size={7} strokeWidth={2.4} />
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

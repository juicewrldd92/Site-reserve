import { CalendarIcon, CheckIcon, MinusIcon, PlusIcon, ScanIcon } from '@/components/icons'

/**
 * Les trois écrans montrés sur la vitrine, reconstruits à partir du design
 * system de l’app. Données d’exemple assumées : ce sont des illustrations,
 * pas des captures d’un vrai compte.
 */

export function ScanScreen() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 px-6 pb-10">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#2A231E_0_10px,#241E1A_10px_20px)]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_42%,rgb(255_255_255/0.10),rgb(0_0_0/0.55)_70%)]" />

      <div className="relative h-[170px] w-[170px]">
        <span className="border-corail absolute top-0 left-0 h-9 w-9 rounded-tl-[15px] border-t-[3px] border-l-[3px]" />
        <span className="border-corail absolute top-0 right-0 h-9 w-9 rounded-tr-[15px] border-t-[3px] border-r-[3px]" />
        <span className="border-corail absolute bottom-0 left-0 h-9 w-9 rounded-bl-[15px] border-b-[3px] border-l-[3px]" />
        <span className="border-corail absolute right-0 bottom-0 h-9 w-9 rounded-br-[15px] border-b-[3px] border-r-[3px]" />
        <span className="absolute top-1/2 right-2.5 left-2.5 h-px bg-[linear-gradient(90deg,transparent,#FF5A3C,transparent)] shadow-[0_0_14px_rgb(255_90_60/0.9)]" />
      </div>

      <p className="relative text-center text-[12px] leading-snug font-semibold text-white/85">
        Vise le code-barres,
        <br />
        on s’occupe du reste.
      </p>

      <div className="relative flex h-10 w-full items-center justify-center gap-2 rounded-full border-[1.4px] border-white/50 bg-white/10 text-[11.5px] font-bold text-white">
        <PlusIcon size={14} strokeWidth={2} />
        Ajouter sans code-barre
      </div>
    </div>
  )
}

export function StockScreen() {
  const items = [
    { name: 'Tomates San Marzano', meta: '12 boîtes · Réserve', tone: 'ok', badge: 'En stock' },
    { name: 'Mozzarella di bufala', meta: '4 pièces · Frigo', tone: 'alert', badge: 'DLC J-1' },
    { name: 'Farine T65', meta: '2 sacs · Réserve', tone: 'warn', badge: 'Stock bas' },
    { name: 'Basilic frais', meta: '3 bottes · Frigo', tone: 'warn', badge: 'DLC J-3' },
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
            <div className="photo-ph relative h-16">
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
        <span className="photo-ph h-8 w-8 flex-none rounded-[9px]" />
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
        ['Mozzarella di bufala', 'Demain · 4 pièces'],
        ['Basilic frais', 'Dans 3 jours · 3 bottes'],
      ].map(([name, meta]) => (
        <div
          key={name}
          className="bg-surface shadow-card border-warn flex items-center gap-2 rounded-[13px] border-l-[3px] p-2"
        >
          <span className="photo-ph h-8 w-8 flex-none rounded-[9px]" />
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
        ['Farine T65', 'Metro · sac 25 kg', '9', true],
        ['Roquette', 'Primeur · sachet 500 g', '4', true],
        ['Huile d’olive', 'Metro · bidon 5 L', '2', false],
      ].map(([name, meta, qty, checked]) => (
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
          <span className="photo-ph h-7 w-7 flex-none rounded-[8px]" />
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

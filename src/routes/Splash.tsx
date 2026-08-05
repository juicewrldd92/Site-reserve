import { BrandMark } from '@/components/icons'

/** Écran d'attente — le temps de récupérer la session et les établissements. */
export function Splash() {
  return (
    <div className="bg-canvas flex min-h-dvh flex-col items-center justify-center gap-4">
      <BrandMark size={54} />
      <span className="text-ink-faint text-[13.5px] font-semibold">On ouvre la réserve…</span>
    </div>
  )
}

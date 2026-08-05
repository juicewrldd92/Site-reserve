import { useRegisterSW } from 'virtual:pwa-register/react'

import { Card } from '@/components/ui/Card'

/**
 * Nouvelle version dispo : on propose, on n'impose pas.
 * Recharger de force pendant un inventaire ferait perdre le comptage.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <Card
      role="status"
      className="fixed bottom-28 left-1/2 z-50 flex w-[min(94%,390px)] -translate-x-1/2 items-center gap-3 p-3.5 shadow-[0_16px_40px_rgb(26_26_26/0.18)]"
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[14.5px] font-bold">Nouvelle version dispo</span>
        <span className="text-ink-muted text-[12.5px]">
          Recharge quand tu as une seconde.
        </span>
      </div>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="text-ink-muted rounded-full px-3 py-2 text-[13px] font-bold"
      >
        Plus tard
      </button>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="bg-corail rounded-full px-4 py-2.5 text-[13px] font-bold text-white"
      >
        Recharger
      </button>
    </Card>
  )
}

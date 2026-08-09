import { useEffect, useState } from 'react'

import { CheckIcon } from '@/components/icons'

import { subscribeToToasts, type Toast } from './toast'

/** Affiche les confirmations émises par `toast()`. Un seul par app. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => subscribeToToasts(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div
      // `pointer-events-none` : le message ne doit jamais intercepter un tap
      // destiné au bouton qu'il recouvre.
      className="pointer-events-none fixed inset-x-0 bottom-24 z-60 flex flex-col items-center gap-2 px-5"
      role="status"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <span
          key={item.id}
          className="bg-night animate-pop flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3.5 text-[14px] font-semibold text-white shadow-[0_12px_30px_rgb(26_26_26/0.28)]"
        >
          <span className="bg-ok flex h-6 w-6 flex-none items-center justify-center rounded-full">
            <CheckIcon size={14} strokeWidth={3} />
          </span>
          {item.message}
        </span>
      ))}
    </div>
  )
}

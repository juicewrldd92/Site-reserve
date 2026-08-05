import type { ReactNode } from 'react'

import { ScanIcon } from '@/components/icons'

/** Jamais d'écran blanc mort : illustration, phrase complice, une seule action. */
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-16 text-center">
      <div className="relative flex h-[190px] w-[190px] items-center justify-center rounded-full bg-[#F4EEE6]">
        <span className="photo-ph block h-[118px] w-[118px] rounded-[34px]" />
        <span className="bg-corail absolute top-6 right-[18px] flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgb(255_90_60/0.35)]">
          <ScanIcon size={21} />
        </span>
      </div>
      <div className="flex max-w-[290px] flex-col gap-2">
        <span className="text-[22px] font-extrabold tracking-[-0.025em]">{title}</span>
        <span className="text-ink-muted text-[15.5px] leading-[1.55]">{text}</span>
      </div>
      {action}
    </div>
  )
}

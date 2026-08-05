import type { ButtonHTMLAttributes } from 'react'

import { cn } from './cn'

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

/** Chip tappable — on préfère toujours ça à un menu déroulant. */
export function Chip({ active = false, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        'rounded-full px-[15px] py-[9px] text-[13.5px] whitespace-nowrap transition-colors',
        active ? 'bg-ink font-bold text-white' : 'bg-chip text-ink-muted font-semibold',
        className,
      )}
      {...props}
    />
  )
}

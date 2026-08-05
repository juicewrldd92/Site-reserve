import type { ReactNode } from 'react'

import { cn } from './cn'

/** Les 3 niveaux de statut du design system. Jamais utilisés en décor. */
export type StatusTone = 'ok' | 'warn' | 'alert' | 'neutral'

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  ok: { pill: 'bg-ok-bg text-ok-ink', dot: 'bg-ok' },
  warn: { pill: 'bg-warn-bg text-warn-ink', dot: 'bg-warn' },
  alert: { pill: 'bg-alert-bg text-alert-ink', dot: 'bg-alert' },
  neutral: { pill: 'bg-chip text-ink-muted', dot: 'bg-ink-faint' },
}

export function StatusBadge({
  tone,
  children,
  dot = false,
  size = 'md',
  className,
}: {
  tone: StatusTone
  children: ReactNode
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const t = TONES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[7px] rounded-full font-bold whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-[5px] text-[11px]' : 'px-[13px] py-[7px] text-[12.5px]',
        t.pill,
        className,
      )}
    >
      {dot && <span className={cn('h-[7px] w-[7px] rounded-full', t.dot)} />}
      {children}
    </span>
  )
}

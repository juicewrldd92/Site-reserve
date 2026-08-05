import type { ReactNode } from 'react'

import { cn } from '@/components/ui/cn'

/**
 * Cadre de téléphone pour les captures de la vitrine.
 *
 * On reconstruit les écrans en HTML plutôt que d'y coller des images : ils
 * restent nets sur tous les écrans, pèsent quelques kilo-octets, et suivent
 * automatiquement le design system quand il évolue.
 */
export function PhoneFrame({
  children,
  dark = false,
  className,
}: {
  children: ReactNode
  dark?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative w-[280px] flex-none overflow-hidden rounded-[34px] shadow-[0_26px_60px_rgb(26_26_26/0.18)]',
        dark ? 'bg-night' : 'bg-canvas',
        className,
      )}
      style={{ aspectRatio: '390 / 720' }}
      aria-hidden="true"
    >
      <div
        className={cn(
          'flex h-[38px] items-end justify-between px-5 pb-1.5 text-[10px] font-bold',
          dark ? 'text-white' : 'text-ink',
        )}
      >
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span
            className={cn(
              'h-[7px] w-[12px] rounded-[2px] border',
              dark ? 'border-white' : 'border-ink',
            )}
          />
          <span className={cn('h-[7px] w-[11px] rounded-[2px]', dark ? 'bg-white' : 'bg-ink')} />
        </span>
      </div>
      {children}
    </div>
  )
}

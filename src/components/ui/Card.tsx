import type { HTMLAttributes } from 'react'

import { cn } from './cn'

/** Surface blanche, rayon 20, ombre douce — la brique de base des écrans. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface rounded-card shadow-card', className)}
      {...props}
    />
  )
}

import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost'
type Size = 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  block?: boolean
  children?: ReactNode
}

/** Boutons du design system : toujours en pilule, jamais en ALL CAPS. */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-corail text-white shadow-corail active:bg-corail-dark',
  secondary: 'bg-surface text-ink border-[1.5px] border-line',
  tertiary: 'bg-surface text-ink border-[1.5px] border-dashed border-line-soft',
  ghost: 'bg-transparent text-ink-muted',
}

const SIZES: Record<Size, string> = {
  md: 'h-13 text-[15px] px-6',
  lg: 'h-14.5 text-[16.5px] px-7',
}

export function Button({
  variant = 'primary',
  size = 'lg',
  block = true,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold',
        'transition-transform duration-100 active:scale-[.98]',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
}

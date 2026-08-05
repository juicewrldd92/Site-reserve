import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'

import { ChevronDownIcon } from '@/components/icons'

import { cn } from './cn'

/**
 * Menu déroulant habillé aux couleurs de l'app.
 *
 * On garde le `<select>` natif : sur téléphone, il ouvre le sélecteur système
 * (roue iOS, liste Android), plus rapide et plus accessible à une main que
 * n'importe quel menu maison.
 */
export function Select({
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={cn(
        'bg-surface rounded-card shadow-card relative flex flex-col gap-1.5 px-[18px] py-4',
        'border-[1.5px] border-transparent focus-within:border-corail',
        className,
      )}
    >
      {label && (
        <span className="text-ink-muted text-[12.5px] font-semibold">{label}</span>
      )}
      <span className="flex items-center justify-between gap-2">
        <select
          id={id}
          className="text-ink w-full appearance-none border-0 bg-transparent text-[16px] font-semibold outline-none"
          {...props}
        >
          {children}
        </select>
        <ChevronDownIcon size={16} className="text-ink-muted pointer-events-none flex-none" />
      </span>
    </label>
  )
}

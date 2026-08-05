import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

import { cn } from './cn'

/**
 * Champ « carte » des maquettes : libellé discret au-dessus, valeur en gras,
 * bordure corail quand le champ a le focus.
 */
export function Field({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'bg-surface rounded-card shadow-card flex flex-col gap-1.5 px-[18px] py-4',
        'border-[1.5px] border-transparent focus-within:border-corail',
        className,
      )}
    >
      <span className="text-ink-muted text-[12.5px] font-semibold">{label}</span>
      <input
        id={id}
        className="placeholder:text-ink-faint w-full border-0 bg-transparent text-[17px] font-semibold outline-none"
        {...props}
      />
      {hint && <span className="text-ink-faint text-[12px]">{hint}</span>}
    </label>
  )
}

/** Même carte, mais pour un groupe de chips plutôt qu'un champ texte. */
export function FieldGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="bg-surface rounded-card shadow-card flex flex-col gap-2.5 px-[18px] py-4">
      <span className="text-ink-muted text-[12.5px] font-semibold">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

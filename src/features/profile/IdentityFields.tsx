import { useEffect, useRef, useState } from 'react'

import { CheckIcon, PlusIcon } from '@/components/icons'
import { Field } from '@/components/ui/Field'
import { cn } from '@/components/ui/cn'

/**
 * « Comment on t'appelle ? » et la photo.
 *
 * Même composant à l'inscription et dans les réglages : les deux écrans ne
 * peuvent pas diverger, et ce qu'on apprend à en faire profite aux deux.
 *
 * Le parent garde l'état — il sait, lui, quand enregistrer.
 */
export function IdentityFields({
  name,
  onNameChange,
  photo,
  onPhotoChange,
  currentAvatarUrl,
  size = 'md',
}: {
  name: string
  onNameChange: (value: string) => void
  photo: File | null
  onPhotoChange: (file: File | null) => void
  /** Photo déjà enregistrée, affichée tant qu'aucune nouvelle n'est choisie. */
  currentAvatarUrl?: string | null
  size?: 'md' | 'lg'
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const shown = preview ?? currentAvatarUrl ?? null
  const side = size === 'lg' ? 'h-28 w-28' : 'h-20 w-20'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-label={shown ? 'Changer la photo' : 'Ajouter une photo'}
          className={cn(
            'relative flex flex-none items-center justify-center overflow-hidden rounded-full',
            shown ? '' : 'border-line-soft border-[1.5px] border-dashed',
            side,
          )}
        >
          {shown ? (
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="bg-corail-tint text-corail flex h-9 w-9 items-center justify-center rounded-full">
              <PlusIcon size={18} strokeWidth={2} />
            </span>
          )}
          {preview && (
            <span className="bg-ok absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-white">
              <CheckIcon size={12} strokeWidth={3} />
            </span>
          )}
        </button>

        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-bold">
            {shown ? 'Ta photo' : 'Une photo ?'}
          </span>
          <span className="text-ink-muted text-[13px] leading-snug">
            {shown
              ? 'Touche-la pour en changer.'
              : 'Pas obligatoire, mais c’est plus sympa qu’une initiale dans un rond.'}
          </span>
          {shown && (
            <button
              type="button"
              onClick={() => onPhotoChange(null)}
              className="text-ink-faint self-start text-[12.5px] font-semibold"
            >
              {preview ? 'Annuler ce choix' : ''}
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
      />

      <Field
        label="Comment on t’appelle ?"
        hint="« Chef » est accepté. « Patron » aussi, on ne juge pas."
        maxLength={60}
        placeholder="Marco"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />
    </div>
  )
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { CheckIcon, PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { prepareImage } from '@/features/products/image'
import { getSupabase } from '@/lib/supabase'

import { tenancyQueryKey } from './tenancyContext'
import { useTenancy } from './useTenancy'

const BUCKET = 'establishment-images'

/**
 * Photo de l'établissement.
 *
 * Elle apparaît partout où l'on choisit son resto : la pilule d'en-tête, la
 * feuille de sélection, les réglages. Sur un groupe de trois établissements,
 * c'est ce qui permet de savoir où l'on est sans lire.
 *
 * 512 px : plus grande que les avatars, parce qu'elle s'affiche jusqu'à 56 px
 * et pourrait servir plus large un jour. Le poids reste sous les 60 Ko.
 */
export function EstablishmentPhoto() {
  const queryClient = useQueryClient()
  const { current, role } = useTenancy()
  const fileInput = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const canManage = role === 'owner' || role === 'manager'

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const save = useMutation({
    mutationFn: async () => {
      if (!current || !photo) throw new Error('Aucune photo à enregistrer.')

      const { blob, extension, contentType } = await prepareImage(photo, {
        maxEdge: 512,
        quality: 0.85,
        square: true,
      })

      // Chemin `<org_id>/…` : la policy Storage vérifie le premier segment.
      const path = `${current.org_id}/${crypto.randomUUID()}.${extension}`
      const supabase = getSupabase()

      const upload = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType, cacheControl: '31536000', upsert: false })
      if (upload.error) throw new Error(upload.error.message)

      const imageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
      const { error } = await supabase
        .from('establishments')
        .update({ image_url: imageUrl })
        .eq('id', current.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      setPhoto(null)
      await queryClient.invalidateQueries({ queryKey: tenancyQueryKey })
    },
  })

  const shown = preview ?? current?.image_url ?? null

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          disabled={!canManage}
          onClick={() => fileInput.current?.click()}
          aria-label={shown ? 'Changer la photo du restaurant' : 'Ajouter une photo'}
          className={cn(
            'relative flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-[18px]',
            shown ? '' : 'photo-ph border-line-soft border-[1.5px] border-dashed',
            !canManage && 'pointer-events-none',
          )}
        >
          {shown ? (
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            canManage && (
              <span className="bg-corail-tint text-corail flex h-8 w-8 items-center justify-center rounded-full">
                <PlusIcon size={16} strokeWidth={2} />
              </span>
            )
          )}
          {preview && (
            <span className="bg-ok absolute right-1 bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-white">
              <CheckIcon size={10} strokeWidth={3} />
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[17px] font-bold">{current?.name}</span>
          <span className="text-ink-muted text-[13px]">
            {[current?.cuisine_type, current?.address].filter(Boolean).join(' · ') ||
              'Établissement'}
          </span>
          {canManage && !shown && (
            <span className="text-ink-faint text-[12.5px]">
              Ajoute une photo — la devanture, la salle, ce que tu veux.
            </span>
          )}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
      />

      {save.isError && (
        <p className="bg-alert-bg text-alert-ink rounded-card px-3 py-2 text-[12.5px] font-semibold">
          {save.error.message}
        </p>
      )}

      {photo && (
        <div className="flex gap-2">
          <Button size="md" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'On enregistre…' : 'Enregistrer la photo'}
          </Button>
          <Button
            size="md"
            variant="secondary"
            block={false}
            className="px-5"
            onClick={() => setPhoto(null)}
          >
            Annuler
          </Button>
        </div>
      )}
    </Card>
  )
}

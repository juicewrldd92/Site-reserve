import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useTenancy } from '@/features/tenancy/useTenancy'
import { getSupabase } from '@/lib/supabase'

import { productsQueryKey } from './productKeys'
import { mirrorExternalImages } from './productRepository'

/**
 * Rapatriement des photos hébergées ailleurs.
 *
 * N'apparaît que s'il y en a : sur une installation normale, toutes les photos
 * sont déjà chez nous et cette carte reste invisible.
 */
export function MirrorPhotosCard() {
  const queryClient = useQueryClient()
  const { current } = useTenancy()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const external = useQuery({
    queryKey: [...productsQueryKey, 'externes', current?.org_id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('products')
        .select('id, image_url')
        .eq('org_id', current?.org_id as string)
        .not('image_url', 'is', null)
      if (error) throw new Error(error.message)
      return data.filter(
        (p) => p.image_url !== null && !p.image_url.includes('.supabase.co/storage/'),
      ).length
    },
    enabled: Boolean(current?.org_id),
  })

  const mirror = useMutation({
    mutationFn: () => {
      if (!current) throw new Error('Aucun établissement sélectionné.')
      return mirrorExternalImages(current.org_id, (done, total) =>
        setProgress({ done, total }),
      )
    },
    onSuccess: async () => {
      setProgress(null)
      await queryClient.invalidateQueries({ queryKey: productsQueryKey })
    },
  })

  const count = external.data ?? 0
  if (count === 0) return null

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[16px] font-bold">Photos</h2>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold">
            {count} photo{count > 1 ? 's' : ''} hébergée{count > 1 ? 's' : ''} ailleurs
          </span>
          <p className="text-ink-muted text-[13px] leading-relaxed">
            Elles viennent d'Open Food Facts et se chargent lentement. Les rapatrier
            les rend aussi rapides que le reste, et visibles hors-ligne.
          </p>
        </div>

        {progress && (
          <div className="flex flex-col gap-1.5">
            <div className="bg-chip h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-corail h-full rounded-full transition-[width]"
                style={{
                  width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`,
                }}
              />
            </div>
            <span className="text-ink-muted text-[12.5px]">
              {progress.done} sur {progress.total}
            </span>
          </div>
        )}

        {mirror.isError && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-3 py-2 text-[12.5px] font-semibold">
            {mirror.error.message}
          </p>
        )}

        <Button size="md" onClick={() => mirror.mutate()} disabled={mirror.isPending}>
          {mirror.isPending ? 'On rapatrie…' : 'Rapatrier les photos'}
        </Button>
      </Card>
    </section>
  )
}

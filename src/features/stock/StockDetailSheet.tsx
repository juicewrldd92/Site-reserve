import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { CalendarIcon, MinusIcon, PlusIcon } from '@/components/icons'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { unitLabel } from '@/features/products/units'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { StockOverviewRow } from '@/lib/database.types'

import { expiryPhrase, formatDate } from './status'
import {
  addBatch,
  listBatches,
  removeBatch,
  removeStockItem,
  stockQueryKey,
  updateStockItem,
} from './stockRepository'

/** Détail d'une ligne de stock : quantité, seuil, emplacement et lots datés. */
export function StockDetailSheet({
  item,
  open,
  onClose,
}: {
  item: StockOverviewRow
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { current } = useTenancy()

  const [quantity, setQuantity] = useState(item.quantity)
  const [threshold, setThreshold] = useState(item.min_threshold?.toString() ?? '')
  const [location, setLocation] = useState(item.location)
  const [newBatchDate, setNewBatchDate] = useState('')
  const [newBatchQty, setNewBatchQty] = useState('1')

  const batches = useQuery({
    queryKey: [...stockQueryKey, 'batches', item.id],
    queryFn: () => listBatches(item.id),
    enabled: open,
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: stockQueryKey })
  }

  const save = useMutation({
    mutationFn: () =>
      updateStockItem(item.id, {
        quantity,
        min_threshold: threshold.trim() === '' ? null : Number(threshold),
        location,
      }),
    onSuccess: async () => {
      await refresh()
      onClose()
    },
  })

  const createBatch = useMutation({
    mutationFn: () => addBatch(item.id, Number(newBatchQty) || 1, newBatchDate),
    onSuccess: async () => {
      setNewBatchDate('')
      setNewBatchQty('1')
      await refresh()
    },
  })

  const dropBatch = useMutation({
    mutationFn: (batchId: string) => removeBatch(batchId),
    onSuccess: refresh,
  })

  const drop = useMutation({
    mutationFn: () => removeStockItem(item.id),
    onSuccess: async () => {
      await refresh()
      onClose()
    },
  })

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex items-center gap-4">
          <span className="photo-ph h-20 w-20 flex-none overflow-hidden rounded-[20px]">
            {item.image_url && (
              <img src={item.image_url} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[20px] leading-tight font-extrabold tracking-[-0.025em]">
              {item.name}
            </span>
            <span className="text-ink-muted text-[13.5px]">
              {[item.brand, item.category].filter(Boolean).join(' · ') || 'Produit maison'}
            </span>
          </div>
        </div>

        <Card className="flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">Quantité</span>
            <div className="flex items-baseline gap-1.5">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                className="w-20 border-0 bg-transparent text-[19px] font-bold outline-none"
              />
              <span className="text-ink-muted text-[14px] font-semibold">
                {unitLabel(item.unit, quantity)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Retirer un"
              onClick={() => setQuantity((q) => Math.max(0, q - 1))}
              className="border-line flex h-10 w-10 items-center justify-center rounded-full border-[1.5px]"
            >
              <MinusIcon size={17} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Ajouter un"
              onClick={() => setQuantity((q) => q + 1)}
              className="bg-corail flex h-10 w-10 items-center justify-center rounded-full text-white"
            >
              <PlusIcon size={17} strokeWidth={2} />
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col gap-1.5 px-4 py-3.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">Alerte sous</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="—"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="placeholder:text-ink-faint w-full border-0 bg-transparent text-[15.5px] font-bold outline-none"
            />
          </Card>
          <Card className="flex flex-col gap-1.5 px-4 py-3.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">Emplacement</span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="text-ink w-full border-0 bg-transparent text-[15.5px] font-bold outline-none"
            >
              <option value="">Sans emplacement</option>
              {(current?.locations ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Card>
        </div>

        <section className="flex flex-col gap-2">
          <span className="text-[15px] font-bold">Lots & dates</span>

          {batches.data?.length === 0 && (
            <p className="text-ink-muted text-[13.5px]">
              Aucune date enregistrée sur ce produit.
            </p>
          )}

          {batches.data?.map((batch) => (
            <Card key={batch.id} className="flex items-center gap-3 px-4 py-3">
              <CalendarIcon size={17} className="text-corail flex-none" />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[14.5px] font-bold">{formatDate(batch.expiry_date)}</span>
                <span className="text-ink-muted text-[12.5px]">
                  {batch.quantity} {unitLabel(item.unit, batch.quantity)} ·{' '}
                  {expiryPhrase(batch.expiry_date)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => dropBatch.mutate(batch.id)}
                className="text-ink-muted text-[12.5px] font-bold"
              >
                Retirer
              </button>
            </Card>
          ))}

          <Card className="flex items-center gap-2.5 px-4 py-3">
            <input
              type="number"
              min={0.1}
              step="0.1"
              value={newBatchQty}
              onChange={(e) => setNewBatchQty(e.target.value)}
              className="w-14 border-0 bg-transparent text-[15px] font-bold outline-none"
              aria-label="Quantité du lot"
            />
            <input
              type="date"
              value={newBatchDate}
              onChange={(e) => setNewBatchDate(e.target.value)}
              className="text-ink flex-1 border-0 bg-transparent text-[15px] font-bold outline-none"
              aria-label="Date limite du lot"
            />
            <button
              type="button"
              disabled={newBatchDate === '' || createBatch.isPending}
              onClick={() => createBatch.mutate()}
              className="bg-corail-tint text-corail flex h-9 w-9 flex-none items-center justify-center rounded-full disabled:opacity-40"
              aria-label="Ajouter ce lot"
            >
              <PlusIcon size={17} strokeWidth={2} />
            </button>
          </Card>
        </section>

        {(save.isError || drop.isError) && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
            {(save.error ?? drop.error)?.message}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'On enregistre…' : 'Enregistrer'}
          </Button>
          <button
            type="button"
            onClick={() => drop.mutate()}
            disabled={drop.isPending}
            className={cn('text-ink-muted py-2 text-[14px] font-semibold')}
          >
            Retirer du stock
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

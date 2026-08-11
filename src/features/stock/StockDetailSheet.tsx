import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { CalendarIcon, MinusIcon, PlusIcon } from '@/components/icons'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DecimalInput } from '@/components/ui/DecimalInput'
import { clean as cleanDecimal } from '@/components/ui/decimal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { cn } from '@/components/ui/cn'
import { toast } from '@/components/ui/toast'
import { productsQueryKey } from '@/features/products/productKeys'
import { replaceProductImage } from '@/features/products/productRepository'
import { UnitSelect } from '@/features/products/UnitSelect'
import { displayImage } from '@/features/products/productImages'
import { unitLabel } from '@/features/products/units'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { StockOverviewRow } from '@/lib/database.types'

import { ExpiryAlertSelect } from './ExpiryAlertSelect'
import { expiryPhrase, formatDate, suggestedOrderQuantity } from './status'
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
  const [unit, setUnit] = useState(item.unit)
  const [threshold, setThreshold] = useState(item.min_threshold?.toString() ?? '')
  const [target, setTarget] = useState(item.target_quantity?.toString() ?? '')
  const [leadDays, setLeadDays] = useState<number | null>(item.alert_lead_days)
  const [location, setLocation] = useState(item.location)
  const [newBatchDate, setNewBatchDate] = useState('')
  const [newBatchQty, setNewBatchQty] = useState('1')

  // Photo du produit : celle d'Open Food Facts est parfois floue, parfois une
  // autre déclinaison, parfois absente sur les formats professionnels.
  const photoInput = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const batches = useQuery({
    queryKey: [...stockQueryKey, 'batches', item.id],
    queryFn: () => listBatches(item.id),
    enabled: open,
  })

  const shortfall = suggestedOrderQuantity({
    quantity,
    min_threshold: threshold.trim() === '' ? null : Number(threshold),
    target_quantity: target.trim() === '' ? null : Number(target),
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: stockQueryKey })
  }

  const savePhoto = useMutation({
    mutationFn: async () => {
      if (!current || !photo) throw new Error('Aucune photo à enregistrer.')
      await replaceProductImage(current.org_id, item.product_id, photo)
    },
    onSuccess: async () => {
      setPhoto(null)
      await queryClient.invalidateQueries({ queryKey: productsQueryKey })
      await refresh()
    },
  })

  const save = useMutation({
    mutationFn: () =>
      updateStockItem(item.id, {
        quantity,
        unit,
        min_threshold: threshold.trim() === '' ? null : Number(threshold),
        target_quantity: target.trim() === '' ? null : Number(target),
        alert_lead_days: leadDays,
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

  const [confirming, setConfirming] = useState(false)

  const drop = useMutation({
    mutationFn: () => removeStockItem(item.id),
    onSuccess: async () => {
      toast(`${item.name} retiré du stock`)
      await refresh()
      onClose()
    },
  })

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            aria-label="Changer la photo du produit"
            className="photo-ph relative h-20 w-20 flex-none overflow-hidden rounded-[20px]"
          >
            {(photoPreview ?? displayImage(item.image_url, item.name)) && (
              <img
                src={photoPreview ?? displayImage(item.image_url, item.name) ?? ''}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            <span className="bg-ink/55 absolute inset-x-0 bottom-0 py-1 text-[10px] font-bold text-white">
              {photoPreview ? 'Nouvelle' : 'Changer'}
            </span>
          </button>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[20px] leading-tight font-extrabold tracking-[-0.025em]">
              {item.name}
            </span>
            <span className="text-ink-muted text-[13.5px]">
              {[item.brand, item.category].filter(Boolean).join(' · ') || 'Produit maison'}
            </span>
          </div>
        </div>

        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />

        {photo && (
          <div className="flex gap-2">
            <Button size="md" onClick={() => savePhoto.mutate()} disabled={savePhoto.isPending}>
              {savePhoto.isPending ? 'On envoie…' : 'Enregistrer la photo'}
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

        {savePhoto.isError && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13px] font-semibold">
            {savePhoto.error.message}
          </p>
        )}

        <Card className="flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">Quantité</span>
            <div className="flex items-baseline gap-1.5">
              <DecimalInput
                value={quantity}
                onValueChange={(next) => setQuantity(Math.max(0, next))}
                className="w-20 border-0 bg-transparent text-[19px] font-bold outline-none"
              />
              <span className="text-ink-muted text-[14px] font-semibold">
                {unitLabel(unit, quantity)}
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

        <UnitSelect value={unit} onChange={setUnit} />

        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col gap-1.5 px-4 py-3.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">Stock mini</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="—"
              value={threshold}
              onChange={(e) => setThreshold(cleanDecimal(e.target.value))}
              className="placeholder:text-ink-faint w-full border-0 bg-transparent text-[15.5px] font-bold outline-none"
            />
          </Card>
          <Card className="flex flex-col gap-1.5 px-4 py-3.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">Stock optimal</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="—"
              value={target}
              onChange={(e) => setTarget(cleanDecimal(e.target.value))}
              className="placeholder:text-ink-faint w-full border-0 bg-transparent text-[15.5px] font-bold outline-none"
            />
          </Card>
        </div>

        {shortfall > 0 && (
          <p className="bg-warn-bg text-warn-ink rounded-card px-4 py-2.5 text-[13px] font-semibold">
            Il manque {shortfall} {unitLabel(unit, shortfall)} pour atteindre l'optimal.
          </p>
        )}

        <Select
          label="Emplacement"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="">Sans emplacement</option>
          {(current?.locations ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>

        <ExpiryAlertSelect value={leadDays} onChange={setLeadDays} />

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
              type="text"
              inputMode="decimal"
              value={newBatchQty}
              onChange={(e) => setNewBatchQty(cleanDecimal(e.target.value))}
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
          {confirming ? (
            /*
             * Confirmation sur place plutôt qu'une seconde feuille : on est
             * déjà dans un panneau, en empiler un autre désoriente. La
             * suppression groupée demande la même chose — un pouce qui glisse
             * ne doit pas effacer un produit et ses dates.
             */
            <div className="bg-alert-bg rounded-card flex flex-col gap-2.5 px-4 py-3.5">
              <span className="text-alert-ink text-[13.5px] leading-snug font-semibold">
                Retirer « {item.name} » du stock, avec ses dates ? La fiche produit reste
                au catalogue.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => drop.mutate()}
                  disabled={drop.isPending}
                  className="bg-alert flex-1 rounded-full py-2.5 text-[13.5px] font-bold text-white"
                >
                  {drop.isPending ? 'Suppression…' : 'Oui, retirer'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-alert-ink flex-1 rounded-full py-2.5 text-[13.5px] font-bold"
                >
                  Garder
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={cn('text-ink-muted py-2 text-[14px] font-semibold')}
            >
              Retirer du stock
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

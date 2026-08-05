import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { CalendarIcon, MinusIcon, PlusIcon } from '@/components/icons'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { UnitSelect } from '@/features/products/UnitSelect'
import { unitLabel } from '@/features/products/units'
import { ExpiryAlertSelect } from '@/features/stock/ExpiryAlertSelect'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { ProductRow, ProductUnit } from '@/lib/database.types'

import { addToStock, stockQueryKey } from './stockRepository'

/**
 * Fiche produit après scan.
 *
 * Tout tient sans scroll : quantité au stepper, DLC, seuil, emplacement en
 * chips. Les valeurs par défaut sont bonnes — dans le cas nominal, l'ajout se
 * fait en un seul tap sur « Ajouter au stock ».
 */
export function AddToStockSheet({
  product,
  open,
  defaultLocation,
  onClose,
  onAdded,
}: {
  product: ProductRow
  open: boolean
  defaultLocation?: string | null
  onClose: () => void
  onAdded?: () => void
}) {
  const queryClient = useQueryClient()
  const { current } = useTenancy()

  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<ProductUnit>(product.default_unit)
  const [location, setLocation] = useState(defaultLocation ?? current?.locations[0] ?? '')
  const [expiry, setExpiry] = useState('')
  const [threshold, setThreshold] = useState('')
  const [target, setTarget] = useState('')
  const [leadDays, setLeadDays] = useState<number | null>(null)

  const add = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error('Aucun établissement sélectionné.')
      return addToStock({
        establishmentId: current.id,
        productId: product.id,
        quantity,
        unit,
        location,
        minThreshold: threshold.trim() === '' ? null : Number(threshold),
        targetQuantity: target.trim() === '' ? null : Number(target),
        alertLeadDays: leadDays,
        expiryDate: expiry === '' ? null : expiry,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: stockQueryKey })
      onAdded?.()
      onClose()
    },
  })

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <span className="photo-ph h-24 w-24 flex-none overflow-hidden rounded-[22px]">
            {product.image_url && (
              <img src={product.image_url} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[21px] leading-tight font-extrabold tracking-[-0.025em]">
              {product.name}
            </span>
            <span className="text-ink-muted text-[14px]">
              {product.brand ?? 'Produit maison'}
            </span>
          </div>
        </div>

        <Card className="flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">Quantité</span>
            <span className="text-[19px] font-bold">
              {quantity}{' '}
              <span className="text-ink-muted text-[14px] font-semibold">
                {unitLabel(unit, quantity)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Retirer un"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
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
            <span className="text-ink-muted text-[12.5px] font-semibold">Stock optimal</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="—"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="placeholder:text-ink-faint w-full border-0 bg-transparent text-[15.5px] font-bold outline-none"
            />
          </Card>
        </div>

        {threshold.trim() !== '' && target.trim() !== '' && (
          <p className="text-ink-muted px-1 text-[12.5px]">
            Sous {threshold} {unitLabel(unit, Number(threshold))}, on te proposera de
            recommander jusqu'à {target}.
          </p>
        )}

        <Card className="flex flex-col gap-1.5 px-4 py-3.5">
          <span className="text-ink-muted text-[12.5px] font-semibold">Date limite</span>
          <label className="flex items-center gap-2">
            <CalendarIcon size={17} className="text-corail flex-none" />
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="text-ink w-full border-0 bg-transparent text-[15px] font-bold outline-none"
            />
          </label>
        </Card>

        {expiry !== '' && (
          <ExpiryAlertSelect value={leadDays} onChange={setLeadDays} />
        )}

        {current && current.locations.length > 0 && (
          <Card className="flex flex-col gap-2.5 px-4 py-3.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">Emplacement</span>
            <div className="flex flex-wrap gap-2">
              {current.locations.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLocation(option)}
                  className={cn(
                    'rounded-full px-[15px] py-2 text-[13.5px] font-semibold',
                    location === option ? 'bg-ink text-white' : 'bg-chip text-ink-muted',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </Card>
        )}

        {add.isError && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
            {add.error.message}
          </p>
        )}

        <div className="pt-1">
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            {add.isPending ? 'On range…' : 'Ajouter au stock'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { CheckIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DecimalInput } from '@/components/ui/DecimalInput'
import { Field, FieldGroup } from '@/components/ui/Field'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/components/ui/cn'
import { productsQueryKey } from '@/features/products/productKeys'
import { listProducts } from '@/features/products/productRepository'
import { UnitSelect } from '@/features/products/UnitSelect'
import { unitLabel } from '@/features/products/units'
import type { ProductUnit } from '@/lib/database.types'

import {
  addPresetItem,
  applyPreset,
  createPreset,
  deletePreset,
  listPresets,
  presetQueryKey,
  removePresetItem,
  type ApplyReport,
  type PresetWithItems,
} from './presetRepository'
import { stockQueryKey } from './stockRepository'

/**
 * Présets de stock : « Stock midi semaine », « Stock soir week-end ».
 *
 * L'idée est de ne pas refaire chaque lundi la même liste de vingt produits.
 * On la compose une fois, on l'applique en un geste.
 */
export function PresetsSheet({
  open,
  onClose,
  establishmentId,
  orgId,
  locations,
}: {
  open: boolean
  onClose: () => void
  establishmentId: string
  orgId: string
  locations: readonly string[]
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [report, setReport] = useState<{ name: string; result: ApplyReport } | null>(null)

  const presets = useQuery({
    queryKey: [...presetQueryKey, establishmentId],
    queryFn: () => listPresets(establishmentId),
    enabled: open,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [...presetQueryKey, establishmentId] })

  const create = useMutation({
    mutationFn: () => createPreset(establishmentId, newName),
    onSuccess: async (preset) => {
      setNewName('')
      setEditing(preset.id)
      await invalidate()
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deletePreset(id),
    onSuccess: async () => {
      setEditing(null)
      await invalidate()
    },
  })

  const apply = useMutation({
    mutationFn: (preset: PresetWithItems) =>
      applyPreset(preset, { establishmentId, orgId }),
    onSuccess: async (result, preset) => {
      setReport({ name: preset.name, result })
      await queryClient.invalidateQueries({ queryKey: stockQueryKey })
    },
  })

  const current = presets.data?.find((p) => p.id === editing) ?? null

  return (
    <BottomSheet open={open} onClose={onClose} title="Présets de stock">
      <div className="flex max-h-[70vh] flex-col gap-3.5 overflow-y-auto px-5 pt-1 pb-6">
        {report ? (
          <ApplyResult
            name={report.name}
            result={report.result}
            onDone={() => {
              setReport(null)
              onClose()
            }}
          />
        ) : current ? (
          <PresetEditor
            preset={current}
            locations={locations}
            orgId={orgId}
            onBack={() => setEditing(null)}
            onChanged={invalidate}
          />
        ) : (
          <>
            <p className="text-ink-muted text-[13.5px] leading-relaxed">
              Une liste type que tu remontes d'un geste — le réassort du midi, celui du
              week-end. Tu la composes une fois, ensuite c'est deux taps.
            </p>

            {presets.isLoading && (
              <p className="text-ink-muted py-4 text-center text-[14px]">Chargement…</p>
            )}

            {presets.data?.map((preset) => (
              <Card key={preset.id} className="flex items-center gap-2.5 p-3">
                <button
                  type="button"
                  onClick={() => setEditing(preset.id)}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                >
                  <span className="truncate text-[15px] font-bold">{preset.name}</span>
                  <span className="text-ink-muted text-[12.5px]">
                    {preset.items.length === 0
                      ? 'Vide — ajoute des produits'
                      : `${preset.items.length} produit${preset.items.length > 1 ? 's' : ''}`}
                  </span>
                </button>

                <button
                  type="button"
                  aria-label={`Supprimer ${preset.name}`}
                  onClick={() => remove.mutate(preset.id)}
                  className="text-ink-faint flex h-9 w-9 flex-none items-center justify-center"
                >
                  <TrashIcon size={17} />
                </button>

                <button
                  type="button"
                  disabled={preset.items.length === 0 || apply.isPending}
                  onClick={() => apply.mutate(preset)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-[13px] font-bold whitespace-nowrap',
                    preset.items.length === 0
                      ? 'bg-canvas-warm text-ink-faint'
                      : 'bg-corail text-white',
                  )}
                >
                  {apply.isPending ? '…' : 'Appliquer'}
                </button>
              </Card>
            ))}

            {apply.isError && (
              <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
                {apply.error.message}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (newName.trim().length > 0) create.mutate()
              }}
              className="flex flex-col gap-2.5"
            >
              <Field
                label="Nouveau préset"
                placeholder="Stock midi semaine"
                maxLength={80}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              {create.isError && (
                <p className="text-alert-ink text-[13px] font-semibold">
                  {create.error.message}
                </p>
              )}
              <Button type="submit" disabled={newName.trim().length === 0 || create.isPending}>
                Créer le préset
              </Button>
            </form>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

/** Compte-rendu d'application : ce qui est entré, et surtout ce qui n'est pas passé. */
function ApplyResult({
  name,
  result,
  onDone,
}: {
  name: string
  result: ApplyReport
  onDone: () => void
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <span className="bg-fresh-bg text-fresh-ink flex h-10 w-10 items-center justify-center rounded-full">
          <CheckIcon size={20} />
        </span>
        <div className="flex flex-col">
          <span className="text-[16px] font-bold">
            {result.added} produit{result.added > 1 ? 's' : ''} en stock
          </span>
          <span className="text-ink-muted text-[13px]">« {name} » appliqué.</span>
        </div>
      </div>

      {result.failed.length > 0 && (
        <div className="bg-alert-bg rounded-card flex flex-col gap-1 px-4 py-3">
          <span className="text-alert-ink text-[13.5px] font-bold">
            {result.failed.length} ligne{result.failed.length > 1 ? 's' : ''} non ajoutée
            {result.failed.length > 1 ? 's' : ''}
          </span>
          <span className="text-alert-ink text-[12.5px] leading-relaxed">
            {result.failed.join(', ')} — à rentrer à la main.
          </span>
        </div>
      )}

      <Button onClick={onDone}>Voir mon stock</Button>
    </div>
  )
}

/**
 * Composition d'un préset.
 *
 * Trois façons d'ajouter une ligne, parce que les trois arrivent en vrai : le
 * produit est déjà au catalogue, on connaît sa référence, ou on a juste son nom
 * en tête.
 */
function PresetEditor({
  preset,
  locations,
  orgId,
  onBack,
  onChanged,
}: {
  preset: PresetWithItems
  locations: readonly string[]
  orgId: string
  onBack: () => void
  onChanged: () => Promise<void>
}) {
  const [mode, setMode] = useState<'catalogue' | 'libre'>('catalogue')
  const [search, setSearch] = useState('')
  const [label, setLabel] = useState('')
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<ProductUnit>('piece')
  const [location, setLocation] = useState('')

  const products = useQuery({
    queryKey: [...productsQueryKey, orgId],
    queryFn: () => listProducts(orgId),
  })

  const add = useMutation({
    mutationFn: (draft: { productId?: string; label?: string; barcode?: string }) =>
      addPresetItem({
        presetId: preset.id,
        productId: draft.productId ?? null,
        label: draft.label ?? null,
        barcode: draft.barcode ?? null,
        quantity,
        unit,
        location,
      }),
    onSuccess: async () => {
      setLabel('')
      setBarcode('')
      setSearch('')
      await onChanged()
    },
  })

  const drop = useMutation({
    mutationFn: (itemId: string) => removePresetItem(itemId),
    onSuccess: () => onChanged(),
  })

  const matches = (products.data ?? [])
    .filter((p) =>
      search.trim().length === 0
        ? false
        : p.name.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-ink-muted text-[13.5px] font-semibold underline"
        >
          ← Tous les présets
        </button>
        <span className="text-[15px] font-bold">{preset.name}</span>
      </div>

      {preset.items.length > 0 && (
        <div className="flex flex-col gap-2">
          {preset.items.map((item) => (
            <div
              key={item.id}
              className="bg-canvas-warm rounded-card flex items-center gap-2.5 px-3.5 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                {item.label ??
                  products.data?.find((p) => p.id === item.product_id)?.name ??
                  `Réf. ${item.barcode ?? ''}`}
              </span>
              <span className="text-ink-muted flex-none text-[13px]">
                {unitLabel(item.unit, item.quantity)}
              </span>
              <button
                type="button"
                aria-label="Retirer du préset"
                onClick={() => drop.mutate(item.id)}
                className="text-ink-faint flex-none"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(['catalogue', 'libre'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={cn(
              'rounded-full px-3.5 py-2 text-[12.5px] font-bold',
              mode === option ? 'bg-corail-tint text-corail-ink' : 'text-ink-faint',
            )}
          >
            {option === 'catalogue' ? 'Déjà scanné' : 'Nom ou référence'}
          </button>
        ))}
      </div>

      <label className="bg-surface rounded-card shadow-card flex flex-col gap-1.5 px-[18px] py-4">
        <span className="text-ink-muted text-[12.5px] font-semibold">
          Quantité par défaut
        </span>
        <DecimalInput
          value={quantity}
          onValueChange={setQuantity}
          className="w-full border-0 bg-transparent text-[15px] outline-none"
        />
      </label>

      <UnitSelect value={unit} onChange={setUnit} />

      {locations.length > 0 && (
        <FieldGroup label="Emplacement">
          <Chip active={location === ''} onClick={() => setLocation('')}>
            Sans emplacement
          </Chip>
          {locations.map((option) => (
            <Chip
              key={option}
              active={location === option}
              onClick={() => setLocation(option)}
            >
              {option}
            </Chip>
          ))}
        </FieldGroup>
      )}

      {mode === 'catalogue' ? (
        <>
          <Field
            label="Chercher dans tes produits"
            placeholder="Mozzarella…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {matches.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => add.mutate({ productId: product.id })}
              className="border-line flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-[14px] font-semibold"
            >
              <PlusIcon size={15} />
              {product.name}
            </button>
          ))}
          {search.trim().length > 0 && matches.length === 0 && (
            <p className="text-ink-muted text-[13px]">
              Rien à ce nom — passe par « Nom ou référence ».
            </p>
          )}
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (label.trim().length === 0 && barcode.trim().length === 0) return
            add.mutate({ label: label.trim() || undefined, barcode: barcode.trim() || undefined })
          }}
          className="flex flex-col gap-2.5"
        >
          <Field
            label="Nom du produit"
            placeholder="Farine T55"
            maxLength={200}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Field
            label="Ou code-barres"
            hint="Résolu automatiquement au moment d'appliquer le préset."
            inputMode="numeric"
            placeholder="3256540000000"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
          />
          <Button
            type="submit"
            disabled={label.trim().length === 0 && barcode.trim().length === 0}
          >
            Ajouter au préset
          </Button>
        </form>
      )}

      {add.isError && (
        <p className="text-alert-ink text-[13px] font-semibold">{add.error.message}</p>
      )}
    </div>
  )
}

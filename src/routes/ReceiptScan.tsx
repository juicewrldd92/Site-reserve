import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, ScanIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { cn } from '@/components/ui/cn'
import { productsQueryKey } from '@/features/products/productKeys'
import { createProduct, listProducts } from '@/features/products/productRepository'
import { UNITS_BY_FAMILY, FAMILY_LABELS, unitLabel } from '@/features/products/units'
import { matchProduct, parseReceipt } from '@/features/receipt/parseReceipt'
import { recognizeReceipt, type OcrProgress } from '@/features/receipt/ocr'
import { addToStock, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { ProductRow, ProductUnit } from '@/lib/database.types'

type Draft = {
  key: string
  label: string
  quantity: number
  unit: ProductUnit
  location: string
  expiry: string
  keep: boolean
  /** Produit du catalogue reconnu, s'il y en a un. */
  existing: ProductRow | null
}

type Phase = 'capture' | 'reading' | 'review' | 'done'

/**
 * Scan d'un ticket de caisse.
 *
 * La reconnaissance est imparfaite par nature : l'écran de révision n'est pas
 * une étape de confort, c'est là que la fonctionnalité devient fiable. Rien
 * n'entre en stock sans être passé sous les yeux de quelqu'un.
 */
export function ReceiptScan() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { current } = useTenancy()
  const fileInput = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('capture')
  const [progress, setProgress] = useState<OcrProgress>({ ratio: 0, label: '' })
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const [added, setAdded] = useState(0)

  const catalogue = useQuery({
    queryKey: [...productsQueryKey, current?.org_id],
    queryFn: () => listProducts(current?.org_id as string),
    enabled: Boolean(current?.org_id),
  })

  async function onPhoto(file: File) {
    setPhase('reading')
    setFailure(null)
    try {
      const text = await recognizeReceipt(file, setProgress)
      const products = catalogue.data ?? []
      const lines = parseReceipt(text)

      if (lines.length === 0) {
        setFailure(
          "Aucune ligne lisible sur cette photo. Reprends-la à plat, bien éclairée, en cadrant juste le ticket.",
        )
        setPhase('capture')
        return
      }

      setDrafts(
        lines.map((line, index) => {
          const existing = matchProduct(line.label, products)
          return {
            key: `${index}-${line.label}`,
            label: existing?.name ?? line.label,
            quantity: line.quantity,
            unit: existing?.default_unit ?? 'piece',
            location: current?.locations[0] ?? '',
            expiry: '',
            keep: true,
            existing,
          }
        }),
      )
      setPhase('review')
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? `Lecture impossible : ${cause.message}`
          : 'Lecture impossible.',
      )
      setPhase('capture')
    }
  }

  function patch(key: string, changes: Partial<Draft>) {
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...changes } : d)))
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error('Aucun établissement sélectionné.')
      const kept = drafts.filter((d) => d.keep && d.label.trim().length > 0)

      for (const draft of kept) {
        // Un produit inconnu du catalogue y entre au passage : il sera
        // réutilisable au prochain inventaire.
        const productId =
          draft.existing?.id ??
          (
            await createProduct({
              orgId: current.org_id,
              name: draft.label.trim(),
              defaultUnit: draft.unit,
              source: 'manual',
            })
          ).id

        await addToStock({
          establishmentId: current.id,
          productId,
          quantity: draft.quantity,
          unit: draft.unit,
          location: draft.location,
          expiryDate: draft.expiry === '' ? null : draft.expiry,
        })
      }
      return kept.length
    },
    onSuccess: async (count) => {
      setAdded(count)
      await queryClient.invalidateQueries({ queryKey: productsQueryKey })
      await queryClient.invalidateQueries({ queryKey: stockQueryKey })
      setPhase('done')
    },
  })

  const kept = drafts.filter((d) => d.keep).length

  return (
    <div className="bg-canvas flex min-h-dvh justify-center">
      <div
        className="flex min-h-dvh w-full max-w-[560px] flex-col gap-4 px-5"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 14px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 28px)',
        }}
      >
        <header className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => navigate(-1)}
            className="bg-surface shadow-pill flex h-10 w-10 items-center justify-center rounded-full"
          >
            <CloseIcon size={18} />
          </button>
          <span className="text-[15.5px] font-bold">Scanner un ticket</span>
          <span className="text-ink-muted w-10 text-right text-[13px] font-semibold">
            {phase === 'review' ? kept : ''}
          </span>
        </header>

        {failure && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] leading-relaxed font-semibold">
            {failure}
          </p>
        )}

        {phase === 'capture' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <span className="bg-corail-tint text-corail flex h-20 w-20 items-center justify-center rounded-full">
              <ScanIcon size={34} />
            </span>
            <div className="flex max-w-[320px] flex-col gap-2">
              <span className="text-[22px] font-extrabold tracking-[-0.025em]">
                Photographie ton ticket
              </span>
              <p className="text-ink-muted text-[15px] leading-relaxed">
                À plat, bien éclairé, en cadrant juste le ticket. Tout se passe sur ton
                téléphone — la photo ne part nulle part.
              </p>
            </div>
            <Button block={false} onClick={() => fileInput.current?.click()}>
              Prendre la photo
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onPhoto(file)
              }}
            />
          </div>
        )}

        {phase === 'reading' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="bg-chip h-1.5 w-56 overflow-hidden rounded-full">
              <div
                className="bg-corail h-full rounded-full transition-[width] duration-300"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </div>
            <span className="text-ink-muted text-[14.5px] font-semibold">
              {progress.label || 'Lecture du ticket…'}
            </span>
            <p className="text-ink-faint max-w-[300px] text-center text-[12.5px] leading-relaxed">
              La première lecture télécharge le moteur français, ça peut prendre une
              minute. Les suivantes sont immédiates.
            </p>
          </div>
        )}

        {phase === 'review' && (
          <>
            <p className="text-ink-muted text-[13.5px] leading-relaxed">
              Vérifie chaque ligne : la lecture d'un ticket n'est jamais parfaite.
              Décoche ce qui n'est pas un produit, corrige les noms, choisis l'emplacement
              et la date.
            </p>

            <div className="flex flex-col gap-2.5">
              {drafts.map((draft) => (
                <Card
                  key={draft.key}
                  className={cn('flex flex-col gap-3 p-3.5', !draft.keep && 'opacity-50')}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={draft.keep ? 'Ne pas ajouter' : 'Ajouter'}
                      onClick={() => patch(draft.key, { keep: !draft.keep })}
                      className={cn(
                        'flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full',
                        draft.keep
                          ? 'bg-corail text-white'
                          : 'border-[1.8px] border-[#DCD5CC]',
                      )}
                    >
                      {draft.keep && <CheckIcon size={15} strokeWidth={2.4} />}
                    </button>

                    <input
                      value={draft.label}
                      onChange={(e) => patch(draft.key, { label: e.target.value })}
                      className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold outline-none"
                      aria-label="Nom du produit"
                    />

                    {draft.existing && (
                      <span className="bg-ok-bg text-ok-ink flex-none rounded-full px-2.5 py-1 text-[11px] font-bold">
                        Connu
                      </span>
                    )}
                  </div>

                  {draft.keep && (
                    <>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label="Moins"
                          onClick={() =>
                            patch(draft.key, {
                              quantity: Math.max(0.1, Math.round((draft.quantity - 1) * 100) / 100),
                            })
                          }
                          className="border-line flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px]"
                        >
                          <MinusIcon size={14} strokeWidth={2} />
                        </button>
                        <span className="min-w-16 text-center text-[15px] font-bold tabular-nums">
                          {draft.quantity} {unitLabel(draft.unit, draft.quantity)}
                        </span>
                        <button
                          type="button"
                          aria-label="Plus"
                          onClick={() => patch(draft.key, { quantity: draft.quantity + 1 })}
                          className="border-line flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px]"
                        >
                          <PlusIcon size={14} strokeWidth={2} />
                        </button>

                        <select
                          value={draft.unit}
                          onChange={(e) =>
                            patch(draft.key, { unit: e.target.value as ProductUnit })
                          }
                          aria-label="Unité"
                          className="bg-chip ml-auto rounded-full px-3 py-2 text-[13px] font-semibold outline-none"
                        >
                          {UNITS_BY_FAMILY.filter((g) => g.units.length > 0).map((group) => (
                            <optgroup key={group.family} label={FAMILY_LABELS[group.family]}>
                              {group.units.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unitLabel(unit, 2)}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <Select
                          value={draft.location}
                          onChange={(e) => patch(draft.key, { location: e.target.value })}
                          className="py-2.5"
                          aria-label="Emplacement"
                        >
                          <option value="">Sans emplacement</option>
                          {(current?.locations ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>

                        <label className="bg-surface rounded-card border-line flex flex-col justify-center border-[1.5px] px-3.5 py-2">
                          <span className="text-ink-muted text-[11px] font-semibold">
                            Date limite
                          </span>
                          <input
                            type="date"
                            value={draft.expiry}
                            onChange={(e) => patch(draft.key, { expiry: e.target.value })}
                            className="text-ink w-full border-0 bg-transparent text-[14px] font-bold outline-none"
                          />
                        </label>
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>

            {save.isError && (
              <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
                {save.error.message}
              </p>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-4">
              <Button onClick={() => save.mutate()} disabled={kept === 0 || save.isPending}>
                {save.isPending
                  ? 'On range…'
                  : `Ajouter ${kept} produit${kept > 1 ? 's' : ''} au stock`}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setDrafts([])
                  setPhase('capture')
                }}
                className="text-ink-muted py-2 text-[13.5px] font-semibold"
              >
                Reprendre une photo
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <span className="bg-ok flex h-16 w-16 items-center justify-center rounded-full text-white">
              <CheckIcon size={30} strokeWidth={2.4} />
            </span>
            <span className="text-[22px] font-extrabold tracking-[-0.025em]">
              {added} produit{added > 1 ? 's' : ''} ajouté{added > 1 ? 's' : ''} 🎉
            </span>
            <div className="flex w-full max-w-[300px] flex-col gap-2">
              <Button onClick={() => navigate('/stock')}>Voir mon stock</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDrafts([])
                  setAdded(0)
                  setPhase('capture')
                }}
              >
                Scanner un autre ticket
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Field, FieldGroup } from '@/components/ui/Field'
import { productsQueryKey } from '@/features/products/productKeys'
import { createProduct, uploadProductImage } from '@/features/products/productRepository'
import { UnitSelect } from '@/features/products/UnitSelect'
import { unitLabel } from '@/features/products/units'
import { ExpiryAlertSelect } from '@/features/stock/ExpiryAlertSelect'
import { addToStock, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { ProductUnit } from '@/lib/database.types'

const CATEGORIES = [
  'Fruits & légumes',
  'Viande',
  'Poisson',
  'Crèmerie',
  'Épicerie',
  'Boisson',
  'Surgelé',
  'Mise en place',
] as const

/**
 * Ajout d'un produit sans code-barre.
 *
 * En resto, la majorité du stock n'a pas de code-barre : cet écran est le
 * chemin principal, pas une trappe de secours. Photo, nom, et c'est plié —
 * catégorie et unité ont des valeurs par défaut acceptables.
 */
export function ManualProduct() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { current } = useTenancy()
  const [params] = useSearchParams()
  const fileInput = useRef<HTMLInputElement>(null)

  const scannedBarcode = params.get('code')

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [unit, setUnit] = useState<ProductUnit>('piece')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Un produit créé ici doit atterrir dans le stock, pas seulement dans le
  // catalogue : c'est le geste attendu quand on ajoute quelque chose.
  const [quantity, setQuantity] = useState(1)
  const [location, setLocation] = useState(current?.locations[0] ?? '')
  const [expiry, setExpiry] = useState('')
  const [leadDays, setLeadDays] = useState<number | null>(null)

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
      const orgId = current?.org_id
      if (!orgId) throw new Error('Aucun établissement sélectionné.')

      // La photo passe avant l'insert : un produit sans image reste utilisable,
      // une image orpheline ne sert à personne.
      const imageUrl = photo ? await uploadProductImage(orgId, photo) : null

      const product = await createProduct({
        orgId,
        name,
        category,
        barcode: scannedBarcode,
        defaultUnit: unit,
        source: 'manual',
        imageUrl,
      })

      if (!current) throw new Error('Aucun établissement sélectionné.')
      await addToStock({
        establishmentId: current.id,
        productId: product.id,
        quantity,
        unit,
        location,
        expiryDate: expiry === '' ? null : expiry,
        alertLeadDays: leadDays,
      })

      return product
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productsQueryKey })
      await queryClient.invalidateQueries({ queryKey: stockQueryKey })
      navigate('/stock', { replace: true })
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length === 0 || save.isPending) return
    save.mutate()
  }

  return (
    <div className="bg-canvas flex min-h-dvh justify-center">
      <form
        onSubmit={onSubmit}
        className="flex min-h-dvh w-full max-w-[430px] flex-col px-5"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 14px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 28px)',
        }}
      >
        <header className="flex items-center justify-between pb-4">
          <button
            type="button"
            aria-label="Annuler"
            onClick={() => navigate(-1)}
            className="bg-surface shadow-pill flex h-10 w-10 items-center justify-center rounded-full"
          >
            <CloseIcon size={18} />
          </button>
          <span className="text-[15.5px] font-bold">Nouveau produit</span>
          <span className="w-10" />
        </header>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="border-line-soft relative mb-4 flex h-44 items-center justify-center overflow-hidden rounded-[26px] border-[1.5px] border-dashed"
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-ink-muted flex flex-col items-center gap-2 text-[14px] font-semibold">
              <span className="bg-corail-tint text-corail flex h-12 w-12 items-center justify-center rounded-full">
                <PlusIcon size={20} strokeWidth={2} />
              </span>
              Prendre une photo
            </span>
          )}
          {preview && (
            <span className="bg-ok absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-full text-white">
              <CheckIcon size={16} />
            </span>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />

        <div className="flex flex-col gap-4">
          <Field
            label="Nom du produit"
            required
            autoFocus
            maxLength={200}
            placeholder="Basilic frais"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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

          {current && current.locations.length > 0 && (
            <FieldGroup label="Où le ranges-tu ?">
              {current.locations.map((option) => (
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

          <Card className="flex flex-col gap-1.5 px-4 py-3.5">
            <span className="text-ink-muted text-[12.5px] font-semibold">
              Date limite (optionnel)
            </span>
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

          {expiry !== '' && <ExpiryAlertSelect value={leadDays} onChange={setLeadDays} />}

          <FieldGroup label="Catégorie">
            {CATEGORIES.map((option) => (
              <Chip
                key={option}
                active={category === option}
                onClick={() => setCategory(category === option ? null : option)}
              >
                {option}
              </Chip>
            ))}
          </FieldGroup>
        </div>

        {scannedBarcode && (
          <p className="text-ink-muted mt-4 font-mono text-[12.5px]">
            Code-barre scanné : {scannedBarcode}
          </p>
        )}

        {save.isError && (
          <p className="bg-alert-bg text-alert-ink rounded-card mt-4 px-4 py-3 text-[13.5px] font-semibold">
            {save.error.message}
          </p>
        )}

        <div className="mt-auto pt-8">
          <Button type="submit" disabled={name.trim().length === 0 || save.isPending}>
            {save.isPending ? 'On enregistre…' : 'Ajouter au stock'}
          </Button>
        </div>
      </form>
    </div>
  )
}

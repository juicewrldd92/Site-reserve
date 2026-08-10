import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CheckIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  ListIcon,
  SlidersIcon,
  TrashIcon,
} from '@/components/icons'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Photo } from '@/components/ui/Photo'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/components/ui/cn'
import { toast } from '@/components/ui/toast'
import { formatQuantity, unitLabel } from '@/features/products/units'
import { PresetsSheet } from '@/features/stock/PresetsSheet'
import { StockDetailSheet } from '@/features/stock/StockDetailSheet'
import { daysUntil, stockBadge, stockStatus } from '@/features/stock/status'
import {
  listStock,
  removeStockItems,
  setQuantity,
  stockQueryKey,
} from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { StockOverviewRow } from '@/lib/database.types'

type Sort = 'name' | 'quantity' | 'expiry'
type Mode = 'grid' | 'inventory'
type StatusFilter = 'all' | 'attention' | 'expiring' | 'low'

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Tous les statuts',
  attention: 'À traiter',
  expiring: 'DLC proche ou périmé',
  low: 'Stock bas ou rupture',
}

const SORT_LABELS: Record<Sort, string> = {
  name: 'Nom',
  quantity: 'Quantité',
  expiry: 'DLC la plus proche',
}

/**
 * L'écran signature : grille 2 colonnes, photo 4:3, pastille en surimpression.
 * Le statut se lit sans lire le texte.
 */
export function Stock() {
  const navigate = useNavigate()
  const { current } = useTenancy()

  const [search, setSearch] = useState('')
  const [location, setLocation] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const [mode, setMode] = useState<Mode>('grid')
  const [selected, setSelected] = useState<StockOverviewRow | null>(null)

  /**
   * Sélection multiple. `null` = mode désactivé : tant qu'on n'a rien demandé,
   * un tap sur un produit ouvre sa fiche, comme avant.
   */
  const [picked, setPicked] = useState<ReadonlySet<string> | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const selecting = picked !== null

  const alertDays = current?.dlc_alert_days ?? 5
  const queryClient = useQueryClient()

  const stock = useQuery({
    queryKey: [...stockQueryKey, current?.id],
    queryFn: () => listStock(current?.id as string),
    enabled: Boolean(current?.id),
  })

  const remove = useMutation({
    mutationFn: (ids: readonly string[]) => removeStockItems(ids),
    onSuccess: async (count) => {
      toast(`${count} produit${count > 1 ? 's' : ''} retiré${count > 1 ? 's' : ''}`)
      setPicked(null)
      setConfirming(false)
      await queryClient.invalidateQueries({ queryKey: stockQueryKey })
    },
  })

  function toggle(id: string) {
    setPicked((previous) => {
      const next = new Set(previous ?? [])
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  const visible = useMemo(() => {
    const all = stock.data ?? []
    const needle = search.trim().toLowerCase()

    const filtered = all.filter((item) => {
      if (location !== null && item.location !== location) return false
      if (category !== null && item.category !== category) return false

      if (status !== 'all') {
        const s = stockStatus(item, alertDays)
        const matches =
          status === 'attention'
            ? s !== 'ok'
            : status === 'expiring'
              ? s === 'expiring' || s === 'expired'
              : s === 'low' || s === 'out'
        if (!matches) return false
      }

      if (needle.length === 0) return true
      return [item.name, item.brand, item.category].some((field) =>
        field?.toLowerCase().includes(needle),
      )
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'quantity') return a.quantity - b.quantity
      if (sort === 'expiry') {
        // Sans date, on passe en dernier : ce n'est pas ce qu'on surveille.
        const da = a.next_expiry ? daysUntil(a.next_expiry) : Number.POSITIVE_INFINITY
        const db = b.next_expiry ? daysUntil(b.next_expiry) : Number.POSITIVE_INFINITY
        return da - db
      }
      return a.name.localeCompare(b.name, 'fr')
    })
  }, [stock.data, search, location, category, status, sort, alertDays])

  // Les filtres se construisent à partir de ce qui est réellement en stock :
  // pas de case vide, et les emplacements renommés suivent tout seuls.
  const locations = useMemo(
    () => [...new Set((stock.data ?? []).map((item) => item.location).filter(Boolean))].sort(),
    [stock.data],
  )

  const categories = useMemo(
    () =>
      [
        ...new Set(
          (stock.data ?? []).map((item) => item.category).filter((c): c is string => Boolean(c)),
        ),
      ].sort(),
    [stock.data],
  )

  const activeFilters =
    (location !== null ? 1 : 0) + (category !== null ? 1 : 0) + (status !== 'all' ? 1 : 0)

  if (stock.isSuccess && stock.data.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <h1 className="text-[27px] font-extrabold tracking-[-0.03em]">Mon stock</h1>
        <EmptyState
          title="Ton stock est encore vide"
          text="Scanne ton premier produit : trois secondes, et l'app prend le relais."
          action={
            <Button block={false} onClick={() => navigate('/scan')}>
              Scanner mon premier produit
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[27px] font-extrabold tracking-[-0.03em]">Mon stock</h1>
        <div className="flex flex-none items-baseline gap-3">
          {!selecting && (
            <span className="text-ink-muted text-[13.5px] font-semibold">
              {stock.data?.length ?? 0} produit{(stock.data?.length ?? 0) > 1 ? 's' : ''}
            </span>
          )}
          {/* Un bouton qui ne peut rien faire ne s'affiche pas. */}
          {(selecting || visible.length > 0) && (
            <button
              type="button"
              onClick={() => setPicked(selecting ? null : new Set())}
              className="text-ink-muted text-[13.5px] font-semibold underline"
            >
              {selecting ? 'Annuler' : 'Sélectionner'}
            </button>
          )}
        </div>
      </div>

      <label className="bg-surface shadow-card flex items-center gap-2.5 rounded-full px-[18px] py-3">
        <SearchIcon size={19} className="text-ink-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cherche un produit…"
          className="placeholder:text-ink-faint w-full border-0 bg-transparent text-[15px] outline-none"
        />
      </label>

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
        <FilterChip
          active={activeFilters === 0}
          onClick={() => {
            setLocation(null)
            setCategory(null)
            setStatus('all')
          }}
        >
          Tout <span className="opacity-60">{stock.data?.length ?? 0}</span>
        </FilterChip>
        {locations.map((option) => (
          <FilterChip
            key={option}
            active={location === option}
            onClick={() => setLocation(option)}
          >
            {option}
          </FilterChip>
        ))}
        {categories.map((option) => (
          <FilterChip
            key={option}
            active={category === option}
            onClick={() => setCategory(category === option ? null : option)}
          >
            {option}
          </FilterChip>
        ))}
        {(['attention', 'expiring', 'low'] as const).map((option) => (
          <FilterChip
            key={option}
            active={status === option}
            onClick={() => setStatus(status === option ? 'all' : option)}
          >
            {STATUS_LABELS[option]}
          </FilterChip>
        ))}
        <button
          type="button"
          onClick={() =>
            setSort(sort === 'name' ? 'expiry' : sort === 'expiry' ? 'quantity' : 'name')
          }
          title={`Trier : ${SORT_LABELS[sort]}`}
          className="bg-surface shadow-pill flex flex-none items-center gap-1.5 rounded-full px-3 py-[9px] text-[13px] font-semibold whitespace-nowrap"
        >
          <SlidersIcon size={16} />
          {SORT_LABELS[sort]}
        </button>
      </div>

      {activeFilters > 0 && (
        <button
          type="button"
          onClick={() => {
            setLocation(null)
            setCategory(null)
            setStatus('all')
          }}
          className="text-ink-muted self-start text-[13px] font-semibold underline"
        >
          Effacer les filtres ({activeFilters})
        </button>
      )}

      <div className="flex gap-2">
        <ModeChip active={mode === 'grid'} onClick={() => setMode('grid')}>
          Grille
        </ModeChip>
        <ModeChip active={mode === 'inventory'} onClick={() => setMode('inventory')}>
          Mode inventaire
        </ModeChip>
        <button
          type="button"
          onClick={() => setPresetsOpen(true)}
          className="text-ink-muted ml-auto flex items-center gap-1.5 text-[12.5px] font-bold"
        >
          <ListIcon size={15} />
          Présets
        </button>
      </div>

      {stock.isError && (
        <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
          {stock.error.message}
        </p>
      )}

      {mode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {visible.map((item) => (
            <StockTile
              key={item.id}
              item={item}
              alertDays={alertDays}
              picked={selecting ? (picked?.has(item.id) ?? false) : null}
              onOpen={() => (selecting ? toggle(item.id) : setSelected(item))}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              picked={selecting ? (picked?.has(item.id) ?? false) : null}
              onOpen={() => (selecting ? toggle(item.id) : setSelected(item))}
            />
          ))}
        </div>
      )}

      {visible.length === 0 && stock.isSuccess && (
        <p className="text-ink-muted py-8 text-center text-[14.5px]">
          Rien ici. Change de filtre ou scanne un produit.
        </p>
      )}

      {/* Laisse la place à la barre d'action pour ne pas masquer le dernier produit. */}
      <div className={selecting ? 'pb-20' : 'pb-2'} />

      {selecting && (
        <SelectionBar
          count={picked?.size ?? 0}
          total={visible.length}
          onSelectAll={() => setPicked(new Set(visible.map((item) => item.id)))}
          onClear={() => setPicked(new Set())}
          onDelete={() => setConfirming(true)}
        />
      )}

      <BottomSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Retirer du stock"
      >
        <div className="flex flex-col gap-3.5 px-5 pt-1 pb-6">
          <p className="text-[14.5px] leading-relaxed">
            {picked?.size === 1
              ? 'Ce produit sera retiré de ton stock, avec ses dates.'
              : `Ces ${picked?.size ?? 0} produits seront retirés de ton stock, avec leurs dates.`}{' '}
            <span className="text-ink-muted">
              Leur fiche reste au catalogue : tu pourras les rajouter au prochain réassort.
            </span>
          </p>

          {remove.isError && (
            <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
              {remove.error.message}
            </p>
          )}

          <Button
            onClick={() => remove.mutate([...(picked ?? [])])}
            disabled={remove.isPending}
          >
            {remove.isPending
              ? 'Suppression…'
              : `Retirer ${picked?.size ?? 0} produit${(picked?.size ?? 0) > 1 ? 's' : ''}`}
          </Button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-ink-muted py-1 text-[14px] font-semibold"
          >
            Garder
          </button>
        </div>
      </BottomSheet>

      {current && (
        <PresetsSheet
          open={presetsOpen}
          onClose={() => setPresetsOpen(false)}
          establishmentId={current.id}
          orgId={current.org_id}
          locations={current.locations}
        />
      )}

      {selected && (
        <StockDetailSheet
          key={selected.id}
          item={selected}
          open
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

/**
 * Barre d'action de la sélection.
 *
 * Fixée en bas, au-dessus de la navigation : le pouce y arrive sans remonter
 * l'écran, même après avoir coché trente produits.
 */
function SelectionBar({
  count,
  total,
  onSelectAll,
  onClear,
  onDelete,
}: {
  count: number
  total: number
  onSelectAll: () => void
  onClear: () => void
  onDelete: () => void
}) {
  const all = count > 0 && count === total

  return (
    <div className="pointer-events-none sticky bottom-2 z-30 flex justify-center">
      <div className="bg-ink shadow-card-lg pointer-events-auto flex items-center gap-3 rounded-full py-2.5 pr-2.5 pl-5 text-white">
        <span className="text-[13.5px] font-bold whitespace-nowrap">
          {count === 0 ? 'Rien de coché' : `${count} sélectionné${count > 1 ? 's' : ''}`}
        </span>

        <button
          type="button"
          onClick={all ? onClear : onSelectAll}
          className="text-[13px] font-semibold whitespace-nowrap text-white/70 underline"
        >
          {all ? 'Tout décocher' : 'Tout cocher'}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={count === 0}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-bold transition-colors',
            count === 0 ? 'bg-white/15 text-white/55' : 'bg-corail text-white',
          )}
        >
          <TrashIcon size={16} />
          Retirer
        </button>
      </div>
    </div>
  )
}

/** Pastille de sélection, en surimpression sur la photo ou en tête de ligne. */
function PickMark({ picked }: { picked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-2 transition-colors',
        picked ? 'bg-corail border-corail text-white' : 'border-white/70 bg-black/25 text-transparent',
      )}
    >
      <CheckIcon size={15} />
    </span>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-none rounded-full px-3.5 py-[9px] text-[13px] whitespace-nowrap',
        active ? 'bg-ink font-bold text-white' : 'bg-surface shadow-pill text-ink-muted font-semibold',
      )}
    >
      {children}
    </button>
  )
}

function ModeChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-2 text-[12.5px] font-bold',
        active ? 'bg-corail-tint text-corail-ink' : 'text-ink-faint',
      )}
    >
      {children}
    </button>
  )
}

function StockTile({
  item,
  alertDays,
  /** `null` hors mode sélection : la tuile se comporte comme avant. */
  picked,
  onOpen,
}: {
  item: StockOverviewRow
  alertDays: number
  picked: boolean | null
  onOpen: () => void
}) {
  const badge = stockBadge(item, alertDays)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={picked ?? undefined}
      className={cn(
        'bg-surface rounded-card shadow-card-lg overflow-hidden text-left transition-shadow',
        picked === true && 'ring-corail ring-2',
      )}
    >
      <div className="relative h-[132px]">
        <Photo src={item.image_url} size={264} className="h-full w-full" />
        {picked !== null && (
          <span className="absolute top-2 left-2">
            <PickMark picked={picked} />
          </span>
        )}
        <StatusBadge tone={badge.tone} size="sm" className="absolute top-2 right-2">
          {badge.label}
        </StatusBadge>
      </div>
      <div className="flex flex-col gap-[3px] px-3 pt-2.5 pb-3.5">
        <span className="line-clamp-2 text-[14.5px] leading-[1.25] font-bold">{item.name}</span>
        <span className="text-ink-muted text-[12.5px]">
          {[formatQuantity(item.quantity, item.unit), item.location]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
    </button>
  )
}

/**
 * Mode inventaire : on parcourt les étagères et on ajuste au pouce.
 * Chaque tap part directement en base — pas de « valider » à la fin qu'on
 * oublierait de presser.
 */
function InventoryRow({
  item,
  picked,
  onOpen,
}: {
  item: StockOverviewRow
  picked: boolean | null
  onOpen: () => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(item.quantity)

  const push = useMutation({
    mutationFn: (next: number) => setQuantity(item.establishment_id, item.id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockQueryKey }),
  })

  const bump = (delta: number) => {
    const next = Math.max(0, Math.round((draft + delta) * 100) / 100)
    setDraft(next)
    push.mutate(next)
  }

  const status = stockStatus(item, 5)

  return (
    <Card
      className={cn(
        'flex items-center gap-3 p-2.5',
        status === 'expired' && 'border-alert border-l-4',
        picked === true && 'ring-corail ring-2',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={picked ?? undefined}
        className="flex flex-1 items-center gap-3 text-left"
      >
        {picked !== null && <PickMark picked={picked} />}
        <span className="photo-ph rounded-thumb h-14 w-14 flex-none overflow-hidden">
          {item.image_url && (
            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold">{item.name}</span>
          <span className="text-ink-muted text-[13px]">
            {item.location || 'Sans emplacement'} · {unitLabel(item.unit, draft)}
          </span>
        </span>
      </button>

      <div
        className={cn(
          'flex flex-none items-center gap-2.5',
          // En sélection, les boutons de quantité gêneraient plus qu'ils
          // n'aideraient : un tap doit cocher, pas décrémenter.
          picked !== null && 'hidden',
        )}
      >
        <button
          type="button"
          aria-label={`Retirer un ${item.name}`}
          onClick={() => bump(-1)}
          className="border-line flex h-9 w-9 items-center justify-center rounded-full border-[1.5px]"
        >
          <MinusIcon size={14} strokeWidth={2} />
        </button>
        <span className="min-w-7 text-center text-[16px] font-bold tabular-nums">{draft}</span>
        <button
          type="button"
          aria-label={`Ajouter un ${item.name}`}
          onClick={() => bump(1)}
          className="border-line flex h-9 w-9 items-center justify-center rounded-full border-[1.5px]"
        >
          <PlusIcon size={14} strokeWidth={2} />
        </button>
      </div>
    </Card>
  )
}

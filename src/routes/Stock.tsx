import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { MinusIcon, PlusIcon, SearchIcon, SlidersIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/components/ui/cn'
import { formatQuantity, unitLabel } from '@/features/products/units'
import { StockDetailSheet } from '@/features/stock/StockDetailSheet'
import { daysUntil, stockBadge, stockStatus } from '@/features/stock/status'
import { listStock, setQuantity, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { StockOverviewRow } from '@/lib/database.types'

type Sort = 'name' | 'quantity' | 'expiry'
type Mode = 'grid' | 'inventory'

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
  const [sort, setSort] = useState<Sort>('name')
  const [mode, setMode] = useState<Mode>('grid')
  const [selected, setSelected] = useState<StockOverviewRow | null>(null)

  const alertDays = current?.dlc_alert_days ?? 5

  const stock = useQuery({
    queryKey: [...stockQueryKey, current?.id],
    queryFn: () => listStock(current?.id as string),
    enabled: Boolean(current?.id),
  })

  const visible = useMemo(() => {
    const all = stock.data ?? []
    const needle = search.trim().toLowerCase()

    const filtered = all.filter((item) => {
      if (location !== null && item.location !== location) return false
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
  }, [stock.data, search, location, sort])

  const locations = useMemo(
    () => [...new Set((stock.data ?? []).map((item) => item.location).filter(Boolean))],
    [stock.data],
  )

  if (stock.isSuccess && stock.data.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <h1 className="text-[27px] font-extrabold tracking-[-0.03em]">Mon stock</h1>
        <EmptyState
          title="Ton stock est vide 👀"
          text="Scanne ton premier produit, ça prend 2 secondes et après c'est l'app qui bosse."
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
      <div className="flex items-baseline justify-between">
        <h1 className="text-[27px] font-extrabold tracking-[-0.03em]">Mon stock</h1>
        <span className="text-ink-muted text-[13.5px] font-semibold">
          {stock.data?.length ?? 0} produit{(stock.data?.length ?? 0) > 1 ? 's' : ''}
        </span>
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
        <FilterChip active={location === null} onClick={() => setLocation(null)}>
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

      <div className="flex gap-2">
        <ModeChip active={mode === 'grid'} onClick={() => setMode('grid')}>
          Grille
        </ModeChip>
        <ModeChip active={mode === 'inventory'} onClick={() => setMode('inventory')}>
          Mode inventaire
        </ModeChip>
      </div>

      {stock.isError && (
        <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
          {stock.error.message}
        </p>
      )}

      {mode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((item) => (
            <StockTile
              key={item.id}
              item={item}
              alertDays={alertDays}
              onOpen={() => setSelected(item)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((item) => (
            <InventoryRow key={item.id} item={item} onOpen={() => setSelected(item)} />
          ))}
        </div>
      )}

      {visible.length === 0 && stock.isSuccess && (
        <p className="text-ink-muted py-8 text-center text-[14.5px]">
          Rien ici. Change de filtre ou scanne un produit.
        </p>
      )}

      <div className="pb-2" />

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
  onOpen,
}: {
  item: StockOverviewRow
  alertDays: number
  onOpen: () => void
}) {
  const badge = stockBadge(item, alertDays)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-surface rounded-card shadow-card-lg overflow-hidden text-left"
    >
      <div className="photo-ph relative h-[132px]">
        {item.image_url && (
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
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
function InventoryRow({ item, onOpen }: { item: StockOverviewRow; onOpen: () => void }) {
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
      )}
    >
      <button type="button" onClick={onOpen} className="flex flex-1 items-center gap-3 text-left">
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

      <div className="flex flex-none items-center gap-2.5">
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

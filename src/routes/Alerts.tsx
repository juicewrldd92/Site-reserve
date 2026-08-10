import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PlusIcon } from '@/components/icons'
import { Card } from '@/components/ui/Card'
import { Photo } from '@/components/ui/Photo'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/components/ui/cn'
import { useAlerts } from '@/features/alerts/useAlerts'
import { formatQuantity } from '@/features/products/units'
import { StockDetailSheet } from '@/features/stock/StockDetailSheet'
import { displayImage } from '@/features/products/productImages'
import { expiryPhrase } from '@/features/stock/status'
import { removeStockItem, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { StockOverviewRow } from '@/lib/database.types'

type Filter = 'all' | 'dates' | 'low'

/**
 * Alertes groupées par urgence, avec une action directe sur chaque ligne.
 * On ne demande jamais d'aller chercher l'écran suivant pour agir.
 */
export function Alerts() {
  const { groups, isLoading } = useAlerts()
  const { current } = useTenancy()
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<StockOverviewRow | null>(null)

  const showDates = filter === 'all' || filter === 'dates'
  const showLow = filter === 'all' || filter === 'low'

  if (!isLoading && groups.total === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <h1 className="text-[27px] font-extrabold tracking-[-0.03em]">Alertes</h1>
        <EmptyState
          title="Rien à signaler"
          text="Tout est frais, rien sous les seuils. On te préviendra dès qu’une date approche."
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <h1 className="text-[27px] font-extrabold tracking-[-0.03em]">Alertes</h1>

      <div className="flex gap-2">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
          Tout {groups.total}
        </FilterPill>
        <FilterPill active={filter === 'dates'} onClick={() => setFilter('dates')}>
          Dates {groups.expired.length + groups.expiring.length}
        </FilterPill>
        <FilterPill active={filter === 'low'} onClick={() => setFilter('low')}>
          Stock bas {groups.low.length}
        </FilterPill>
      </div>

      {showDates && groups.expired.length > 0 && (
        <Group dot="bg-alert" title="À jeter ou cuisiner vite" count={groups.expired.length}>
          {groups.expired.map((item) => (
            <ExpiryRow key={item.id} item={item} tone="alert" onOpen={() => setSelected(item)} />
          ))}
        </Group>
      )}

      {showDates && groups.expiring.length > 0 && (
        <Group dot="bg-warn" title="DLC proche" count={groups.expiring.length}>
          {groups.expiring.map((item) => (
            <ExpiryRow key={item.id} item={item} tone="warn" onOpen={() => setSelected(item)} />
          ))}
        </Group>
      )}

      {showLow && groups.low.length > 0 && (
        <Group dot="bg-ink-faint" title="Stock bas" count={groups.low.length}>
          {groups.low.map((item) => (
            <LowRow key={item.id} item={item} onOpen={() => setSelected(item)} />
          ))}
        </Group>
      )}

      <p className="text-ink-muted pb-2 text-[12.5px]">
        Les dates te préviennent {current?.dlc_alert_days ?? 5} jours à l'avance. Ça se règle
        dans les réglages de l'établissement.
      </p>

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

function FilterPill({
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
        'rounded-full px-[15px] py-[9px] text-[13px] whitespace-nowrap',
        active ? 'bg-ink font-bold text-white' : 'bg-surface shadow-pill text-ink-muted font-semibold',
      )}
    >
      {children}
    </button>
  )
}

function Group({
  dot,
  title,
  count,
  children,
}: {
  dot: string
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className={cn('h-[9px] w-[9px] rounded-full', dot)} />
        <span className="text-[15px] font-bold">
          {title} · {count}
        </span>
      </div>
      {children}
    </section>
  )
}

function ExpiryRow({
  item,
  tone,
  onOpen,
}: {
  item: StockOverviewRow
  tone: 'alert' | 'warn'
  onOpen: () => void
}) {
  const queryClient = useQueryClient()
  const drop = useMutation({
    mutationFn: () => removeStockItem(item.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stockQueryKey }),
  })

  return (
    <Card
      className={cn(
        'flex items-center gap-3 p-2.5 border-l-4',
        tone === 'alert' ? 'border-alert' : 'border-warn',
      )}
    >
      <button type="button" onClick={onOpen} className="flex flex-1 items-center gap-3 text-left">
        <Thumb item={item} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold">{item.name}</span>
          <span
            className={cn(
              'text-[13px] font-semibold',
              tone === 'alert' ? 'text-alert-ink' : 'text-warn-ink',
            )}
          >
            {item.next_expiry ? expiryPhrase(item.next_expiry) : 'Sans date'} ·{' '}
            {formatQuantity(item.quantity, item.unit)}
          </span>
        </span>
      </button>

      {tone === 'alert' && (
        <button
          type="button"
          onClick={() => drop.mutate()}
          disabled={drop.isPending}
          className="border-line flex-none rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold disabled:opacity-50"
        >
          Retirer
        </button>
      )}
    </Card>
  )
}

function LowRow({ item, onOpen }: { item: StockOverviewRow; onOpen: () => void }) {
  const navigate = useNavigate()

  return (
    <Card className="flex items-center gap-3 p-2.5">
      <button type="button" onClick={onOpen} className="flex flex-1 items-center gap-3 text-left">
        <Thumb item={item} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold">{item.name}</span>
          <span className="text-ink-muted text-[13px]">
            {item.quantity <= 0
              ? 'En rupture — à commander ?'
              : `Plus que ${formatQuantity(item.quantity, item.unit)} — à commander ?`}
          </span>
        </span>
      </button>

      <button
        type="button"
        aria-label={`Ajouter ${item.name} à une liste de commande`}
        onClick={() => navigate('/commandes')}
        className="bg-corail-tint text-corail flex h-9 w-9 flex-none items-center justify-center rounded-full"
      >
        <PlusIcon size={18} strokeWidth={2} />
      </button>
    </Card>
  )
}

function Thumb({ item }: { item: StockOverviewRow }) {
  return (
    <Photo src={displayImage(item.image_url, item.name)} size={56} className="rounded-thumb h-14 w-14 flex-none" />
  )
}

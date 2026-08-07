import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { CartIcon, ChevronRightIcon } from '@/components/icons'
import { Card } from '@/components/ui/Card'
import { Photo } from '@/components/ui/Photo'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/components/ui/cn'
import { useAlerts } from '@/features/alerts/useAlerts'
import { useProfile } from '@/features/profile/useProfile'
import { listOrderLists, ordersQueryKey } from '@/features/orders/orderRepository'
import { formatQuantity } from '@/features/products/units'
import { expiryPhrase, stockBadge, suggestedOrderQuantity } from '@/features/stock/status'
import { listStock, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { StockOverviewRow } from '@/lib/database.types'

/**
 * Dashboard bureau.
 *
 * Ce qu'on doit voir sans cliquer : combien de produits, ce qui manque, ce qui
 * va périmer, ce qu'il reste à commander. Le reste est à un clic.
 */
export function Dashboard() {
  const { displayName } = useProfile()
  const { current } = useTenancy()
  const { groups } = useAlerts()

  const alertDays = current?.dlc_alert_days ?? 5

  const stock = useQuery({
    queryKey: [...stockQueryKey, current?.id],
    queryFn: () => listStock(current?.id as string),
    enabled: Boolean(current?.id),
  })

  const orders = useQuery({
    queryKey: [...ordersQueryKey, current?.id],
    queryFn: () => listOrderLists(current?.id as string),
    enabled: Boolean(current?.id),
  })

  const items = stock.data ?? []
  const openOrders = (orders.data ?? []).filter((list) => list.status !== 'received')
  const toReorder = items.filter((item) => suggestedOrderQuantity(item) > 0)
  const watchlist = [...groups.expired, ...groups.expiring, ...groups.low].slice(0, 6)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em]">
            Salut {displayName} 👋
          </h1>
          <p className="text-ink-muted text-[15px]">
            {[
              current?.name,
              `${items.length} produit${items.length > 1 ? 's' : ''} suivi${items.length > 1 ? 's' : ''}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Produits en stock" value={items.length} hint="au total" />
        <Kpi
          label="Stock bas"
          value={groups.low.length}
          hint="à commander"
          accent="border-t-warn"
          hintTone="text-warn-ink"
        />
        <Kpi
          label={`DLC sous ${alertDays} j`}
          value={groups.expired.length + groups.expiring.length}
          hint={groups.expired.length > 0 ? `dont ${groups.expired.length} périmé(s)` : 'à surveiller'}
          accent="border-t-alert"
          hintTone="text-alert-ink"
        />
        <Kpi
          label="Commandes en cours"
          value={openOrders.length}
          hint={openOrders.length === 0 ? 'rien en attente' : 'à suivre'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="flex min-w-0 flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Ton stock</h2>
            <Link to="/stock" className="text-corail text-[13px] font-bold">
              Tout voir
            </Link>
          </div>

          {items.length === 0 ? (
            <p className="text-ink-muted py-10 text-center text-[14.5px]">
              Rien en stock pour l'instant. Scanne un premier produit depuis ton téléphone.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
              {items.slice(0, 8).map((item) => (
                <StockTile key={item.id} item={item} alertDays={alertDays} />
              ))}
            </div>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold">À traiter</h2>
              <Link to="/alertes" className="text-corail text-[13px] font-bold">
                Tout voir
              </Link>
            </div>

            {watchlist.length === 0 ? (
              <p className="text-ink-muted text-[13.5px]">
                Rien à signaler, tout est frais.
              </p>
            ) : (
              watchlist.map((item) => {
                const badge = stockBadge(item, alertDays)
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <Photo
                      src={item.image_url}
                      size={44}
                      className="h-11 w-11 flex-none rounded-[13px]"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-[14px] font-bold">{item.name}</span>
                      <span
                        className={cn(
                          'text-[12px] font-semibold',
                          badge.tone === 'alert' && 'text-alert-ink',
                          badge.tone === 'warn' && 'text-warn-ink',
                          badge.tone === 'ok' && 'text-ink-muted',
                          badge.tone === 'neutral' && 'text-ink-muted',
                        )}
                      >
                        {item.next_expiry
                          ? expiryPhrase(item.next_expiry)
                          : `Plus que ${formatQuantity(item.quantity, item.unit)}`}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'h-[9px] w-[9px] flex-none rounded-full',
                        badge.tone === 'alert' && 'bg-alert',
                        badge.tone === 'warn' && 'bg-warn',
                        badge.tone === 'ok' && 'bg-ok',
                        badge.tone === 'neutral' && 'bg-ink-faint',
                      )}
                    />
                  </div>
                )
              })
            )}
          </Card>

          <Card className="flex flex-1 flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold">À commander</h2>
              <Link to="/commandes" className="text-corail text-[13px] font-bold">
                Tout voir
              </Link>
            </div>

            {toReorder.length === 0 ? (
              <p className="text-ink-muted text-[13.5px]">
                Rien sous son seuil. Renseigne un stock optimal sur tes produits pour que
                les suggestions apparaissent ici.
              </p>
            ) : (
              toReorder.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 text-[14px]">
                  <span className="bg-warn-bg text-warn-ink flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold">
                    {suggestedOrderQuantity(item)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
                  <span className="text-ink-muted flex-none text-[12.5px]">
                    {formatQuantity(item.quantity, item.unit)}
                    {item.target_quantity !== null && ` / ${item.target_quantity}`}
                  </span>
                </div>
              ))
            )}

            {openOrders.length > 0 && (
              <Link
                to={`/commandes/${openOrders[0]?.id ?? ''}`}
                className="border-line mt-auto flex items-center gap-2.5 rounded-[14px] border p-3"
              >
                <span className="bg-corail-tint text-corail flex h-8 w-8 flex-none items-center justify-center rounded-full">
                  <CartIcon size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">
                  {openOrders[0]?.name}
                </span>
                <ChevronRightIcon size={16} className="text-ink-faint flex-none" />
              </Link>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  accent,
  hintTone = 'text-ink-muted',
}: {
  label: string
  value: number
  hint: string
  accent?: string
  hintTone?: string
}) {
  return (
    <Card className={cn('flex flex-col gap-2 p-5', accent && `border-t-4 ${accent}`)}>
      <span className="text-ink-muted text-[13.5px] font-semibold">{label}</span>
      <span className="text-[34px] leading-none font-extrabold tracking-[-0.03em]">
        {value}
      </span>
      <span className={cn('text-[12.5px] font-semibold', hintTone)}>{hint}</span>
    </Card>
  )
}

function StockTile({ item, alertDays }: { item: StockOverviewRow; alertDays: number }) {
  const badge = stockBadge(item, alertDays)
  return (
    <Link
      to="/stock"
      className="bg-canvas rounded-tile flex flex-col overflow-hidden"
    >
      <div className="photo-ph relative h-26">
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
      <div className="flex flex-col gap-0.5 px-2.5 pt-2.5 pb-3">
        <span className="line-clamp-2 text-[13.5px] leading-tight font-bold">
          {item.name}
        </span>
        <span className="text-ink-muted text-[12px]">
          {formatQuantity(item.quantity, item.unit)}
        </span>
      </div>
    </Link>
  )
}


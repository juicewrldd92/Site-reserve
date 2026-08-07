import { Link } from 'react-router-dom'

import { BellIcon, ScanIcon } from '@/components/icons'
import { Card } from '@/components/ui/Card'
import { Photo } from '@/components/ui/Photo'
import { cn } from '@/components/ui/cn'
import { useAlerts } from '@/features/alerts/useAlerts'
import { useProfile } from '@/features/profile/useProfile'
import { formatQuantity } from '@/features/products/units'
import { expiryPhrase, stockBadge } from '@/features/stock/status'
import { EstablishmentSwitcher } from '@/features/tenancy/EstablishmentSwitcher'
import { useTenancy } from '@/features/tenancy/useTenancy'

/** Accueil — switcher d'établissement, alertes chiffrées, CTA scan. */
export function Home() {
  const { displayName } = useProfile()
  const { current } = useTenancy()
  const { groups } = useAlerts()

  const alertDays = current?.dlc_alert_days ?? 5
  // Les 3 lignes les plus urgentes, tous groupes confondus.
  const watchlist = [...groups.expired, ...groups.expiring, ...groups.low].slice(0, 3)

  return (
    <div className="flex flex-col gap-5 pb-6">
      <header className="flex items-center justify-between">
        <EstablishmentSwitcher />
        <Link
          to="/alertes"
          aria-label={`Alertes${groups.total > 0 ? ` (${groups.total})` : ''}`}
          className="bg-surface shadow-pill relative flex h-11 w-11 items-center justify-center rounded-full"
        >
          <BellIcon size={21} strokeWidth={1.6} />
          {groups.total > 0 && (
            <span className="bg-alert absolute top-2.5 right-3 h-2 w-2 rounded-full border-2 border-white" />
          )}
        </Link>
      </header>

      <div className="flex flex-col gap-0.5">
        <h1 className="text-[27px] font-extrabold tracking-[-0.03em]">
          Salut {displayName} 👋
        </h1>
        <p className="text-ink-muted text-[15.5px]">Voilà ce qui bouge dans ta réserve.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          tint="bg-warn-bg"
          dot="bg-warn"
          value={groups.low.length}
          label="en stock bas"
        />
        <StatCard
          tint="bg-alert-bg"
          dot="bg-alert"
          value={groups.expired.length + groups.expiring.length}
          label={`DLC sous ${alertDays} j`}
        />
      </div>

      <Link
        to="/scan"
        className="bg-corail flex items-center gap-4 rounded-3xl p-5 shadow-[0_14px_30px_rgb(255_90_60/0.30)]"
      >
        <span className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-[18px] bg-white/20 text-white">
          <ScanIcon size={28} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[18px] font-bold text-white">Scanner un produit</span>
          <span className="text-[13.5px] text-white/90">2 secondes, et c'est dans le stock</span>
        </span>
      </Link>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">À surveiller</h2>
          <Link to="/alertes" className="text-corail text-[13.5px] font-semibold">
            Tout voir
          </Link>
        </div>
        {watchlist.length === 0 ? (
          <Card className="px-4 py-5">
            <p className="text-ink-muted text-[14.5px] leading-[1.5]">
              Rien à signaler, tout est frais.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {watchlist.map((item) => {
              const badge = stockBadge(item, alertDays)
              return (
                <Link
                  key={item.id}
                  to="/alertes"
                  className="bg-surface rounded-card shadow-card flex items-center gap-3 p-2.5"
                >
                  <Photo
                    src={item.image_url}
                    size={56}
                    className="rounded-thumb h-14 w-14 flex-none"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold">{item.name}</span>
                    <span className="text-ink-muted text-[13px]">
                      {item.next_expiry
                        ? expiryPhrase(item.next_expiry)
                        : item.location || 'Sans emplacement'}{' '}
                      · {formatQuantity(item.quantity, item.unit)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex-none rounded-full px-[11px] py-1.5 text-[12px] font-bold',
                      badge.tone === 'alert' && 'bg-alert-bg text-alert-ink',
                      badge.tone === 'warn' && 'bg-warn-bg text-warn-ink',
                      badge.tone === 'ok' && 'bg-ok-bg text-ok-ink',
                      badge.tone === 'neutral' && 'bg-chip text-ink-muted',
                    )}
                  >
                    {badge.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}

function StatCard({
  tint,
  dot,
  value,
  label,
}: {
  tint: string
  dot: string
  value: number
  label: string
}) {
  return (
    <Card className="flex flex-col gap-[7px] p-4">
      <span className={`flex h-8 w-8 items-center justify-center rounded-[11px] ${tint}`}>
        <span className={`h-[9px] w-[9px] rounded-full ${dot}`} />
      </span>
      <span className="text-[30px] leading-none font-extrabold tracking-[-0.03em]">{value}</span>
      <span className="text-ink-muted text-[13.5px] font-semibold">{label}</span>
    </Card>
  )
}


import { Link } from 'react-router-dom'

import { BellIcon, ChevronRightIcon, ScanIcon } from '@/components/icons'
import { Card } from '@/components/ui/Card'
import { Photo } from '@/components/ui/Photo'
import { cn } from '@/components/ui/cn'
import { useQuery } from '@tanstack/react-query'

import { useAlerts } from '@/features/alerts/useAlerts'
import { useProfile } from '@/features/profile/useProfile'
import { displayImage } from '@/features/products/productImages'
import { formatQuantity } from '@/features/products/units'
import { expiryPhrase, stockBadge } from '@/features/stock/status'
import { EstablishmentSwitcher } from '@/features/tenancy/EstablishmentSwitcher'
import { listStock, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'

/** Accueil — switcher d'établissement, alertes chiffrées, CTA scan. */
export function Home() {
  const { displayName } = useProfile()
  const { current } = useTenancy()
  const { groups, isLoading } = useAlerts()

  const alertDays = current?.dlc_alert_days ?? 5
  // Les 3 lignes les plus urgentes, tous groupes confondus.
  const watchlist = [...groups.expired, ...groups.expiring, ...groups.low].slice(0, 3)
  const stock = useQuery({
    queryKey: [...stockQueryKey, current?.id],
    queryFn: () => listStock(current?.id as string),
    enabled: Boolean(current?.id),
  })
  const total = stock.data?.length ?? 0

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
          {!isLoading && groups.total > 0 && (
            <span className="bg-alert absolute top-2.5 right-3 h-2 w-2 rounded-full border-2 border-white" />
          )}
        </Link>
      </header>

      {/*
        La date et l'établissement plutôt qu'un « Salut » à l'emoji : c'est un
        outil de travail qu'on ouvre entre deux services, pas une application
        grand public. On situe d'abord, on interpelle ensuite.
      */}
      <div className="flex flex-col gap-1">
        <span className="text-ink-faint text-[12.5px] font-bold tracking-wide uppercase">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
        <h1 className="text-[25px] leading-tight font-extrabold tracking-[-0.03em]">
          Bonjour {displayName}
        </h1>
        {current?.name && (
          <p className="text-ink-muted text-[14.5px]">{current.name}</p>
        )}
      </div>

      {/* Les compteurs mènent où il faut : un chiffre qui alerte sans donner
          accès à ce qu'il désigne est une impasse. */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard
          to="/stock"
          tint="bg-ok-bg"
          dot="bg-ok"
          value={total}
          loading={isLoading}
          label="produits"
        />
        <StatCard
          to="/alertes"
          tint="bg-warn-bg"
          dot="bg-warn"
          value={groups.low.length}
          loading={isLoading}
          label="stock bas"
        />
        <StatCard
          to="/alertes"
          tint="bg-alert-bg"
          dot="bg-alert"
          value={groups.expired.length + groups.expiring.length}
          loading={isLoading}
          label={`DLC ${alertDays} j`}
        />
      </div>

      <Link
        to="/scan"
        className="bg-night flex items-center gap-3.5 rounded-3xl p-4 shadow-[0_14px_30px_rgb(26_26_26/0.22)]"
      >
        <span className="bg-corail flex h-12 w-12 flex-none items-center justify-center rounded-[16px] text-white">
          <ScanIcon size={25} />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[16.5px] font-bold text-white">Scanner un produit</span>
          <span className="text-[13px] text-white/55">
            Trois secondes, code-barres ou photo
          </span>
        </span>
        <ChevronRightIcon size={18} className="flex-none text-white/40" />
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
                    src={displayImage(item.image_url, item.name)}
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
  to,
  loading = false,
}: {
  tint: string
  dot: string
  value: number
  label: string
  to: string
  loading?: boolean
}) {
  return (
    <Link to={to} className="contents">
      <Card className="flex flex-col gap-1.5 p-3.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-[10px] ${tint}`}>
          <span className={`h-2 w-2 rounded-full ${dot}`} />
        </span>
        {loading ? (
          // Un « 0 » affiché pendant le chargement se lit « tout va bien » — le
          // pire malentendu possible pour une app dont c'est toute la promesse.
          <span
            aria-hidden
            className="bg-canvas-warm my-[3px] h-[24px] w-10 animate-pulse rounded-lg"
          />
        ) : (
          <span className="text-[24px] leading-none font-extrabold tracking-[-0.03em]">
            {value}
          </span>
        )}
        <span className="text-ink-muted text-[12px] leading-tight font-semibold">
          {label}
        </span>
      </Card>
    </Link>
  )
}


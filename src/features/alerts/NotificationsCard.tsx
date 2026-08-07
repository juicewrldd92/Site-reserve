import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { listStock, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'

import { hasPushConfig, subscribeToPush, unsubscribeFromPush } from './pushSubscription'
import { useNotifications } from './useNotifications'

/** Réglage des notifications, avec ce qu'elles savent faire — et ce qu'elles ne savent pas. */
export function NotificationsCard() {
  const { current } = useTenancy()
  const alertDays = current?.dlc_alert_days ?? 5

  const stock = useQuery({
    queryKey: [...stockQueryKey, current?.id],
    queryFn: () => listStock(current?.id as string),
    enabled: Boolean(current?.id),
  })

  const { support, enabled, enable, disable } = useNotifications(
    stock.data ?? [],
    alertDays,
  )
  const [pushError, setPushError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setPushError(null)
    setBusy(true)
    try {
      if (enabled) {
        await unsubscribeFromPush()
        disable()
        return
      }
      const accepted = await enable()
      // L'abonnement au serveur de push n'est possible qu'une fois
      // l'autorisation accordée, et seulement si le déploiement est configuré.
      if (accepted && hasPushConfig && current) {
        await subscribeToPush(current.id)
      }
    } catch (cause) {
      setPushError(cause instanceof Error ? cause.message : 'Abonnement impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[16px] font-bold">Notifications</h2>

      <Card className="flex flex-col gap-3 p-4">
        {support === 'needs-install' && (
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-semibold">Ajoute Réserve à ton écran</span>
            <p className="text-ink-muted text-[13px] leading-relaxed">
              Sur iPhone, les notifications n'existent que si l'app est installée :
              bouton Partager, puis « Sur l'écran d'accueil ». Rouvre Réserve depuis
              l'icône et le réglage apparaîtra ici.
            </p>
          </div>
        )}

        {support === 'unsupported' && (
          <p className="text-ink-muted text-[13px] leading-relaxed">
            Ce navigateur ne gère pas les notifications.
          </p>
        )}

        {support === 'denied' && (
          <p className="text-ink-muted text-[13px] leading-relaxed">
            Les notifications sont bloquées pour Réserve. Réactive-les dans les réglages
            de ton téléphone, puis reviens ici.
          </p>
        )}

        {support === 'ready' && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">Alerte de dates</span>
                <span className="text-ink-muted text-[12.5px]">
                  {enabled
                    ? 'Activée — un rappel à l’ouverture, une fois par jour.'
                    : 'Un rappel à l’ouverture quand des dates approchent.'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label="Alerte de dates"
                disabled={busy}
                onClick={() => void toggle()}
                className={cn(
                  'relative h-[30px] w-[50px] flex-none rounded-full transition-colors',
                  enabled ? 'bg-corail' : 'bg-line',
                )}
              >
                <span
                  className={cn(
                    'absolute top-[3px] h-6 w-6 rounded-full bg-white transition-all',
                    enabled ? 'right-[3px]' : 'left-[3px]',
                  )}
                />
              </button>
            </div>

            {pushError && (
              <p className="bg-alert-bg text-alert-ink rounded-card px-3 py-2 text-[12.5px] font-semibold">
                {pushError}
              </p>
            )}

            <p className="text-ink-muted text-[12.5px] leading-relaxed">
              {hasPushConfig
                ? 'Un rappel quotidien le matin, même si l’app est fermée, plus un rappel à l’ouverture.'
                : 'Réserve te prévient quand tu ouvres l’app. Le rappel quotidien à distance demande une configuration côté serveur.'}
            </p>
          </>
        )}
      </Card>
    </section>
  )
}

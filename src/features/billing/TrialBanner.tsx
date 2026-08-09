import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { cn } from '@/components/ui/cn'
import { useTenancy } from '@/features/tenancy/useTenancy'
import { PRICE_LABEL } from '@/lib/offer'

import { readAccess } from './access'
import { fetchOrganization, subscriptionQueryKey } from './subscription'

/**
 * Bandeau d'échéance, en tête de l'app.
 *
 * Il ne s'affiche que quand il a quelque chose à dire : les derniers jours
 * d'essai, un prélèvement en échec, ou une porte fermée. Le reste du temps, un
 * abonné n'a pas à voir qu'il paie — il le sait.
 *
 * Le seuil de trois jours vient d'un compromis : plus tôt, c'est du harcèlement
 * sur un essai de quatorze jours ; plus tard, on prévient quelqu'un qui n'a plus
 * le temps de s'organiser.
 */
export function TrialBanner() {
  const { current } = useTenancy()
  const orgId = current?.org_id

  const organization = useQuery({
    queryKey: [...subscriptionQueryKey, orgId],
    queryFn: () => fetchOrganization(orgId as string),
    enabled: Boolean(orgId),
    // L'état vient d'un webhook Stripe : après un paiement, la ligne change
    // sans que l'app ait rien fait. On la relit à chaque retour sur l'onglet.
    refetchOnWindowFocus: true,
  })

  if (!organization.data) return null
  const access = readAccess(organization.data)

  if (access.phase === 'subscribed') return null
  if (access.phase === 'trial' && access.daysLeft > 3) return null

  const expired = access.phase === 'expired'

  return (
    <Link
      to="/reglages"
      className={cn(
        'rounded-card flex items-center gap-3 px-4 py-3 text-[13.5px] font-semibold',
        expired
          ? 'bg-alert-bg text-alert-ink'
          : access.phase === 'grace'
            ? 'bg-warn-bg text-warn-ink'
            : 'bg-corail-tint text-corail-ink',
      )}
    >
      <span className="flex-1 leading-snug">
        {expired
          ? 'Ton essai est terminé. Abonne-toi pour continuer à modifier ton stock.'
          : access.phase === 'grace'
            ? 'Ton dernier paiement n’est pas passé. Mets ta carte à jour.'
            : access.daysLeft <= 0
              ? 'Dernier jour d’essai.'
              : `Plus que ${access.daysLeft} jour${access.daysLeft > 1 ? 's' : ''} d’essai.`}
      </span>
      <span className="flex-none rounded-full bg-white/60 px-3 py-1.5 text-[12.5px] font-bold whitespace-nowrap">
        {expired || access.phase === 'grace' ? 'Régler' : PRICE_LABEL}
      </span>
    </Link>
  )
}

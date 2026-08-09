import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useTenancy } from '@/features/tenancy/useTenancy'
import { PRICE_LABEL, TRIAL_LABEL } from '@/lib/offer'

import { readAccess, type Access } from './access'
import {
  fetchOrganization,
  openPortal,
  startCheckout,
  subscriptionQueryKey,
} from './subscription'

/** Réglages → Abonnement : l'état, et le bouton qui va avec. */
export function SubscriptionCard() {
  const { current } = useTenancy()
  const orgId = current?.org_id
  const [error, setError] = useState<string | null>(null)

  const organization = useQuery({
    queryKey: [...subscriptionQueryKey, orgId],
    queryFn: () => fetchOrganization(orgId as string),
    enabled: Boolean(orgId),
  })

  const go = useMutation({
    mutationFn: (route: 'checkout' | 'portal') =>
      route === 'checkout' ? startCheckout(orgId as string) : openPortal(orgId as string),
    onError: (cause) => setError(cause.message),
  })

  const access = organization.data ? readAccess(organization.data) : null
  const subscribed = Boolean(organization.data?.stripe_subscription_id)

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[16px] font-bold">Abonnement</h2>

      <Card className="flex flex-col gap-3.5 p-4">
        {organization.isLoading && (
          <span className="text-ink-muted text-[14px]">Chargement…</span>
        )}

        {access && <StatusLine access={access} />}

        {access?.phase !== 'subscribed' && access?.phase !== 'grace' && (
          <ul className="flex flex-col gap-2">
            {[
              'Produits et utilisateurs illimités',
              'Alertes de dates et de stock bas',
              'Listes à commander et partage',
              'Résiliable en un clic, sans engagement',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-[13.5px]">
                <span className="bg-ok-bg text-ok mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full">
                  <CheckIcon size={11} strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-3 py-2 text-[13px] font-semibold">
            {error}
          </p>
        )}

        {access && (
          <Button
            onClick={() => {
              setError(null)
              go.mutate(subscribed ? 'portal' : 'checkout')
            }}
            disabled={go.isPending}
          >
            {go.isPending
              ? 'Ouverture…'
              : subscribed
                ? 'Gérer mon abonnement'
                : `S’abonner — ${PRICE_LABEL} / mois`}
          </Button>
        )}

        <p className="text-ink-faint text-[12px] leading-relaxed">
          {PRICE_LABEL} par mois et par établissement. Paiement par Stripe : Réserve ne voit
          jamais ton numéro de carte. Factures et résiliation depuis le même bouton.
        </p>
      </Card>
    </section>
  )
}

function StatusLine({ access }: { access: Access }) {
  const tone =
    access.phase === 'expired'
      ? 'bg-alert-bg text-alert-ink'
      : access.phase === 'grace'
        ? 'bg-warn-bg text-warn-ink'
        : 'bg-ok-bg text-ok'

  const label =
    access.phase === 'subscribed'
      ? 'Abonnement actif'
      : access.phase === 'grace'
        ? 'Paiement en attente'
        : access.phase === 'trial'
          ? `Essai gratuit — ${access.daysLeft} jour${access.daysLeft > 1 ? 's' : ''} restant${access.daysLeft > 1 ? 's' : ''}`
          : 'Essai terminé'

  const detail =
    access.phase === 'grace'
      ? 'Ton dernier prélèvement n’est pas passé. Mets ta carte à jour — l’app continue de fonctionner en attendant.'
      : access.phase === 'expired'
        ? 'Tes données sont intactes et consultables. Il faut un abonnement pour ajouter ou modifier du stock.'
        : access.phase === 'trial'
          ? `Tu as ${TRIAL_LABEL} pour te faire un avis, sans carte bancaire.`
          : null

  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn('self-start rounded-full px-3 py-1.5 text-[12.5px] font-bold', tone)}>
        {label}
      </span>
      {detail && (
        <p className="text-ink-muted text-[13px] leading-relaxed">{detail}</p>
      )}
    </div>
  )
}

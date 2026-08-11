import type Stripe from 'stripe'

import { getAdminClient, getStripe } from './_stripe.js'

import { withErrors } from './_errors.js'

/**
 * Réception des événements Stripe.
 *
 * C'est **la seule** source de vérité pour l'état d'un abonnement. On ne se fie
 * jamais au retour de la page de paiement : l'utilisateur peut fermer l'onglet
 * avant la redirection, et l'URL de succès se forge à la main. Un paiement n'est
 * acquis que lorsque Stripe le dit ici, signature vérifiée.
 */
/*
 * Signature Web Standard, exigée par Vercel.
 *
 * Une `export default function` est interprétée comme l'ancienne signature
 * Node `(req, res)` : le runtime passait deux objets Node à un code qui
 * attendait un `Request`, et la fonction plantait avant d'exécuter la moindre
 * ligne — 500 sans corps, indépendamment des variables d'environnement.
 *
 * On exporte donc la méthode HTTP, ce qui documente au passage ce que la route
 * accepte.
 */
async function handler(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ erreur: 'STRIPE_WEBHOOK_SECRET manquante' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Signature absente', { status: 400 })

  const stripe = getStripe()

  // Le corps brut, non parsé : la signature porte sur les octets exacts. Passer
  // par `request.json()` la rendrait invérifiable.
  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret)
  } catch (cause) {
    console.error('Signature Stripe invalide', cause)
    return new Response('Signature invalide', { status: 400 })
  }

  const admin = getAdminClient()

  /** Reporte l'état d'un abonnement sur l'organisation qu'il concerne. */
  async function sync(subscription: Stripe.Subscription): Promise<void> {
    const orgId = subscription.metadata?.org_id
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

    // `current_period_end` vit sur la ligne d'abonnement. On prend la plus
    // lointaine : c'est jusque-là que le service est payé.
    const periodEnd = subscription.items.data.reduce<number | null>((latest, item) => {
      const end = item.current_period_end
      return end && (latest === null || end > latest) ? end : latest
    }, null)

    const patch = {
      subscription_status: subscription.status,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    }

    // On cible par identifiant d'organisation quand Stripe nous l'a conservé,
    // et par client sinon — un abonnement créé à la main dans le tableau de
    // bord Stripe n'a pas nos métadonnées.
    const query = admin.from('organizations').update(patch)
    const { error } = orgId
      ? await query.eq('id', orgId)
      : await query.eq('stripe_customer_id', customerId)

    if (error) console.error('Mise à jour impossible', orgId ?? customerId, error.message)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.subscription) {
        const id =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
        await sync(await stripe.subscriptions.retrieve(id))
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await sync(event.data.object)
      break

    default:
      // Stripe envoie beaucoup d'événements ; ceux qu'on n'utilise pas doivent
      // quand même repartir avec un 200, sinon Stripe les rejoue indéfiniment.
      break
  }

  return Response.json({ recu: true })
}

export const POST = withErrors(handler)

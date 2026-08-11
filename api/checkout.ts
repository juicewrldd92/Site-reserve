import { authenticate, getAdminClient, getStripe, isError, siteUrl } from './_stripe.js'

import { withErrors } from './_errors.js'

/**
 * Ouvre une session de paiement Stripe.
 *
 * On ne manipule jamais de numéro de carte : Stripe héberge le formulaire, on
 * ne reçoit qu'une URL vers laquelle rediriger. C'est aussi ce qui garde la
 * conformité PCI hors de notre périmètre.
 *
 * L'essai n'est pas géré par Stripe mais par notre propre `trial_ends_at` :
 * l'inscription se fait sans carte bancaire, donc il n'y a pas d'abonnement
 * Stripe à faire démarrer le premier jour. Quand le restaurateur paie, il paie
 * tout de suite.
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
  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) {
    return Response.json({ erreur: 'STRIPE_PRICE_ID manquante' }, { status: 500 })
  }

  let body: { orgId?: string }
  try {
    body = (await request.json()) as { orgId?: string }
  } catch {
    return Response.json({ erreur: 'Requête illisible' }, { status: 400 })
  }

  if (!body.orgId) {
    return Response.json({ erreur: 'Organisation manquante' }, { status: 400 })
  }

  const caller = await authenticate(request, body.orgId)
  if (isError(caller)) {
    return Response.json({ erreur: caller.error }, { status: caller.status })
  }

  const stripe = getStripe()
  const admin = getAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, stripe_customer_id, subscription_status')
    .eq('id', caller.orgId)
    .single()

  if (!org) return Response.json({ erreur: 'Organisation introuvable' }, { status: 404 })

  // Un client Stripe par organisation, réutilisé : sans ça, chaque tentative de
  // paiement abandonnée laisserait un client orphelin dans le tableau de bord.
  let customerId = org.stripe_customer_id as string | null
  if (!customerId) {
    const { data: profile } = await admin.auth.admin.getUserById(caller.userId)
    const customer = await stripe.customers.create({
      email: profile.user?.email ?? undefined,
      name: org.name as string,
      metadata: { org_id: org.id as string },
    })
    customerId = customer.id
    await admin
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id)
  }

  // Nombre d'établissements : c'est l'unité de facturation annoncée sur la
  // vitrine (« par établissement »).
  const { count } = await admin
    .from('establishments')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', caller.orgId)

  const site = siteUrl(request)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: Math.max(1, count ?? 1) }],
    locale: 'fr',
    allow_promotion_codes: true,
    // L'identifiant d'organisation voyage avec la session : c'est ce que le
    // webhook lira pour savoir quelle ligne mettre à jour.
    subscription_data: { metadata: { org_id: caller.orgId } },
    metadata: { org_id: caller.orgId },
    success_url: `${site}/reglages?abonnement=ok`,
    cancel_url: `${site}/reglages?abonnement=annule`,
  })

  return Response.json({ url: session.url })
}

export const POST = withErrors(handler)

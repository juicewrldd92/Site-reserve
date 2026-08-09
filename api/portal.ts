import { authenticate, getAdminClient, getStripe, isError, siteUrl } from './_stripe'

/**
 * Ouvre le portail de facturation Stripe.
 *
 * Changer de carte, télécharger une facture, résilier : tout se passe chez
 * Stripe. Réimplémenter ces écrans nous ferait manipuler des données bancaires
 * pour un résultat moins bon.
 *
 * La résiliation reste donc à un clic, sans avoir à écrire un mail — c'est le
 * minimum décent, et le droit français le demande pour un abonnement souscrit
 * en ligne.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405 })
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

  const admin = getAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', caller.orgId)
    .single()

  const customerId = org?.stripe_customer_id as string | null
  if (!customerId) {
    return Response.json({ erreur: 'Aucun abonnement à gérer.' }, { status: 400 })
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    locale: 'fr',
    return_url: `${siteUrl(request)}/reglages`,
  })

  return Response.json({ url: session.url })
}

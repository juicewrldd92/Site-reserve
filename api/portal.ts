import { authenticate, getAdminClient, getStripe, isError, siteUrl } from './_stripe.js'

import { withErrors } from './_errors.js'

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

export const POST = withErrors(handler)

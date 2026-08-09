import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

/**
 * Outillage commun aux fonctions de facturation.
 *
 * Les trois routes Stripe partagent la même configuration et le même besoin :
 * identifier l'appelant à partir de son jeton Supabase, sans jamais faire
 * confiance à l'identifiant d'organisation qu'il envoie.
 */

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY manquante')
  return new Stripe(key)
}

/** Client à pleins pouvoirs : contourne la RLS, ne sort jamais du serveur. */
export function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Configuration Supabase manquante')
  return createClient(url, key, { auth: { persistSession: false } })
}

export function siteUrl(request: Request): string {
  const configured = process.env.SITE_URL
  if (configured) return configured.replace(/\/$/, '')
  // Repli sur l'origine de la requête : évite d'avoir à configurer l'URL sur
  // les déploiements de préversion, qui changent d'adresse à chaque commit.
  return new URL(request.url).origin
}

export type Caller = { userId: string; orgId: string; role: string }

/**
 * Identifie l'appelant et vérifie qu'il dirige bien l'organisation visée.
 *
 * L'identifiant d'organisation vient du client, donc il est suspect par
 * construction : on le confronte aux adhésions réelles de l'utilisateur. Sans
 * cette vérification, n'importe qui abonnerait — ou résilierait — le restaurant
 * de quelqu'un d'autre.
 *
 * Seul le propriétaire peut agir sur la facturation : un commis n'a pas à
 * engager une dépense.
 */
export async function authenticate(
  request: Request,
  orgId: string,
): Promise<Caller | { error: string; status: number }> {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { error: 'Authentification requise', status: 401 }

  const admin = getAdminClient()
  const { data: auth, error } = await admin.auth.getUser(token)
  if (error || !auth.user) return { error: 'Session invalide', status: 401 }

  const { data: membership } = await admin
    .from('memberships')
    .select('role')
    .eq('user_id', auth.user.id)
    .eq('org_id', orgId)
    .maybeSingle()

  if (!membership) return { error: 'Organisation inconnue', status: 403 }
  if (membership.role !== 'owner') {
    return { error: 'Seul le propriétaire gère l’abonnement.', status: 403 }
  }

  return { userId: auth.user.id, orgId, role: membership.role }
}

export function isError(
  value: Caller | { error: string; status: number },
): value is { error: string; status: number } {
  return 'error' in value
}

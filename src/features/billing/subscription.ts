import type { OrganizationRow } from '@/lib/database.types'
import { getSupabase } from '@/lib/supabase'

export const subscriptionQueryKey = ['subscription'] as const

export async function fetchOrganization(orgId: string): Promise<OrganizationRow> {
  const { data, error } = await getSupabase()
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Demande une URL de paiement ou de gestion, puis y envoie le navigateur.
 *
 * Le jeton de session part en en-tête : la fonction serveur revérifie que
 * l'appelant dirige bien cette organisation. L'identifiant seul ne prouve rien.
 */
async function openBillingRoute(route: 'checkout' | 'portal', orgId: string): Promise<void> {
  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Session expirée.')

  const response = await fetch(`/api/${route}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orgId }),
  })

  const payload = (await response.json()) as { url?: string; erreur?: string }
  if (!response.ok || !payload.url) {
    throw new Error(payload.erreur ?? 'Paiement indisponible pour le moment.')
  }

  // Redirection plutôt qu'un nouvel onglet : sur iPhone en app installée, une
  // fenêtre ouverte par script est souvent bloquée, et l'utilisateur ne
  // comprend pas pourquoi rien ne se passe.
  window.location.href = payload.url
}

export const startCheckout = (orgId: string) => openBillingRoute('checkout', orgId)
export const openPortal = (orgId: string) => openBillingRoute('portal', orgId)

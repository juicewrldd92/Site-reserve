import { getSupabase } from '@/lib/supabase'

/**
 * Abonnement aux notifications push.
 *
 * La clé publique VAPID identifie notre serveur auprès du service de push du
 * navigateur. Elle est publique par nature — c'est la clé privée, côté Vercel,
 * qui signe les envois.
 */
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

export const hasPushConfig = VAPID_PUBLIC_KEY.length > 0

/**
 * Le navigateur attend la clé en octets, pas en base64url.
 *
 * On alloue explicitement un `ArrayBuffer` : le type par défaut de `Uint8Array`
 * admet aussi `SharedArrayBuffer`, que `applicationServerKey` refuse.
 */
function toApplicationServerKey(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i)
  return buffer
}

/**
 * Abonne cet appareil et enregistre l'abonnement.
 *
 * Un appareil déjà abonné réutilise son endpoint : l'enregistrement est donc
 * idempotent côté base grâce à l'index unique.
 */
export async function subscribeToPush(establishmentId: string): Promise<void> {
  if (!hasPushConfig) {
    throw new Error("Les notifications ne sont pas configurées sur ce déploiement.")
  }

  const registration = await navigator.serviceWorker.ready

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // Obligatoire : les navigateurs refusent les abonnements silencieux.
      userVisibleOnly: true,
      applicationServerKey: toApplicationServerKey(VAPID_PUBLIC_KEY),
    }))

  const json = subscription.toJSON()
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Session expirée.')

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: auth.user.id,
      establishment_id: establishmentId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

/** Désabonne l'appareil et retire l'enregistrement. */
export async function unsubscribeFromPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  await getSupabase()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint)

  await subscription.unsubscribe()
}

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

/**
 * Rappel quotidien des dates limites.
 *
 * Déclenché par le cron Vercel (voir `vercel.json`), une fois par jour. Le plan
 * Hobby ne permet pas mieux, et c'est suffisant : prévenir qu'un produit périme
 * demain n'a pas besoin d'être à la minute près.
 *
 * Tourne côté serveur avec la clé `service_role`, qui contourne la RLS — d'où
 * la vérification d'appelant ci-dessous, et le fait que cette clé ne doit
 * jamais quitter les variables d'environnement Vercel.
 */

type StockRow = {
  establishment_id: string
  name: string
  quantity: number
  unit: string
  next_expiry: string | null
  alert_lead_days: number | null
}

type Subscription = {
  id: string
  establishment_id: string
  endpoint: string
  p256dh: string
  auth: string
}

function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00Z`).getTime()
  const today = new Date()
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((target - start) / 86_400_000)
}

function phrase(days: number): string {
  if (days < -1) return `périmé depuis ${Math.abs(days)} jours`
  if (days === -1) return 'périmé depuis hier'
  if (days === 0) return 'périme aujourd’hui'
  if (days === 1) return 'périme demain'
  return `périme dans ${days} jours`
}

export default async function handler(request: Request): Promise<Response> {
  // Vercel signe ses appels de cron. Sans ce contrôle, n'importe qui pourrait
  // déclencher une vague de notifications en visitant l'URL.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = request.headers.get('authorization')
    if (header !== `Bearer ${secret}`) {
      return new Response('Non autorisé', { status: 401 })
    }
  }

  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const contact = process.env.VAPID_CONTACT ?? 'mailto:contact@reserveapp.online'

  if (!url || !serviceKey || !publicKey || !privateKey) {
    return Response.json(
      { erreur: 'Variables d’environnement manquantes.' },
      { status: 500 },
    )
  }

  webpush.setVapidDetails(contact, publicKey, privateKey)
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const [{ data: stock, error: stockError }, { data: subs, error: subsError }] =
    await Promise.all([
      supabase
        .from('stock_overview')
        .select('establishment_id, name, quantity, unit, next_expiry, alert_lead_days')
        .not('next_expiry', 'is', null),
      supabase.from('push_subscriptions').select('*'),
    ])

  if (stockError || subsError) {
    return Response.json(
      { erreur: (stockError ?? subsError)?.message },
      { status: 500 },
    )
  }

  const { data: establishments } = await supabase
    .from('establishments')
    .select('id, dlc_alert_days')

  const leadByEstablishment = new Map(
    (establishments ?? []).map((e) => [e.id as string, (e.dlc_alert_days as number) ?? 5]),
  )

  // Regroupe les produits urgents par établissement.
  const urgentByEstablishment = new Map<string, StockRow[]>()
  for (const row of (stock ?? []) as StockRow[]) {
    if (!row.next_expiry) continue
    const lead = row.alert_lead_days ?? leadByEstablishment.get(row.establishment_id) ?? 5
    if (daysUntil(row.next_expiry) > lead) continue
    const list = urgentByEstablishment.get(row.establishment_id) ?? []
    list.push(row)
    urgentByEstablishment.set(row.establishment_id, list)
  }

  let envoyees = 0
  let retirees = 0

  for (const sub of (subs ?? []) as Subscription[]) {
    const urgent = urgentByEstablishment.get(sub.establishment_id)
    // Pas d'alerte, pas de notification : on ne réveille personne pour rien.
    if (!urgent || urgent.length === 0) continue

    urgent.sort((a, b) => (a.next_expiry ?? '').localeCompare(b.next_expiry ?? ''))
    const first = urgent[0]
    if (!first?.next_expiry) continue

    const body =
      urgent.length === 1
        ? `${first.name} ${phrase(daysUntil(first.next_expiry))}.`
        : `${first.name} ${phrase(daysUntil(first.next_expiry))}, et ${urgent.length - 1} autre${urgent.length > 2 ? 's' : ''}.`

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title: 'À cuisiner vite', body, url: '/alertes' }),
      )
      envoyees += 1
      await supabase
        .from('push_subscriptions')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', sub.id)
    } catch (cause) {
      // 404 ou 410 : l'abonnement est mort (app désinstallée, autorisation
      // révoquée). On le retire, sinon la table se remplit de fantômes.
      const status = (cause as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        retirees += 1
      } else {
        console.error('Envoi impossible', sub.endpoint, cause)
      }
    }
  }

  return Response.json({ envoyees, retirees, abonnements: subs?.length ?? 0 })
}

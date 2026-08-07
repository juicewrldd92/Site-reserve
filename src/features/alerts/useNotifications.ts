import { useCallback, useEffect, useRef, useState } from 'react'

import { expiryPhrase } from '@/features/stock/status'
import type { StockOverviewRow } from '@/lib/database.types'

/**
 * Notifications système.
 *
 * ─ Ce qui marche, et ce qui ne marche pas ────────────────────────────────
 * Sur iPhone, les notifications web n'existent QUE si l'app a été ajoutée à
 * l'écran d'accueil (Partager → Sur l'écran d'accueil), depuis iOS 16.4.
 * Dans Safari en onglet, l'API est absente : on le détecte et on le dit.
 *
 * Cette implémentation notifie **à l'ouverture de l'app**. Recevoir une alerte
 * alors que l'app est fermée demande un serveur de push (clés VAPID + tâche
 * planifiée), qui n'est pas en place — l'app seule ne peut pas se réveiller.
 * ─────────────────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = 'reserve.notifications'
/** Une seule notification par jour : personne ne veut être harcelé. */
const LAST_SHOWN_KEY = 'reserve.notifications.lastShown'

export type NotificationSupport =
  | 'ready'
  | 'denied'
  | 'unsupported'
  /** iOS en onglet Safari : il faut d'abord ajouter à l'écran d'accueil. */
  | 'needs-install'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && navigator.standalone === true)
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function detect(): NotificationSupport {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  if (isIos() && !isStandalone()) return 'needs-install'
  return 'ready'
}

export function useNotifications(items: readonly StockOverviewRow[], alertDays: number) {
  const [support, setSupport] = useState<NotificationSupport>(detect)
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'on',
  )
  const notified = useRef(false)

  const granted =
    support === 'ready' && 'Notification' in window && Notification.permission === 'granted'

  const enable = useCallback(async () => {
    if (!('Notification' in window)) return false
    const result = await Notification.requestPermission()
    setSupport(detect())
    if (result !== 'granted') return false
    localStorage.setItem(STORAGE_KEY, 'on')
    setEnabled(true)
    return true
  }, [])

  const disable = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setEnabled(false)
  }, [])

  // Notification au lancement, une fois par jour maximum.
  useEffect(() => {
    if (!enabled || !granted || notified.current || items.length === 0) return

    const today = new Date().toDateString()
    if (localStorage.getItem(LAST_SHOWN_KEY) === today) return

    const urgent = items
      .filter((item) => {
        if (!item.next_expiry) return false
        const lead = item.alert_lead_days ?? alertDays
        const days = Math.round(
          (new Date(item.next_expiry).getTime() - Date.now()) / 86_400_000,
        )
        return days <= lead
      })
      .sort((a, b) => (a.next_expiry ?? '').localeCompare(b.next_expiry ?? ''))

    if (urgent.length === 0) return
    notified.current = true
    localStorage.setItem(LAST_SHOWN_KEY, today)

    const first = urgent[0]
    if (!first) return

    const body =
      urgent.length === 1
        ? `${first.name} — ${first.next_expiry ? expiryPhrase(first.next_expiry) : ''}`
        : `${first.name} et ${urgent.length - 1} autre${urgent.length > 2 ? 's' : ''} à surveiller.`

    void navigator.serviceWorker.ready.then((registration) => {
      void registration.showNotification('À cuisiner vite', {
        body,
        icon: '/icons/pwa-192.png',
        badge: '/icons/pwa-192.png',
        tag: 'reserve-dlc',
        data: { url: '/alertes' },
      })
    })
  }, [enabled, granted, items, alertDays])

  return { support, enabled: enabled && granted, enable, disable }
}

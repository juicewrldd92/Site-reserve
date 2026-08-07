/**
 * Réception des notifications push.
 *
 * Chargé par le service worker généré (voir `workbox.importScripts` dans
 * vite.config.ts) : on ajoute ce comportement sans avoir à reprendre à la main
 * toute la configuration de cache produite par Workbox.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Réserve', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Réserve', {
      body: payload.body ?? '',
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      // Un seul rappel de dates à la fois : le nouveau remplace l'ancien
      // plutôt que d'empiler des notifications identiques.
      tag: payload.tag ?? 'reserve-dlc',
      data: { url: payload.url ?? '/alertes' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/alertes'

  // Si l'app est déjà ouverte quelque part, on la ramène au premier plan au
  // lieu d'ouvrir un second onglet.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})

import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // `host: true` permet de tester depuis un vrai iPhone sur le réseau local.
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // « prompt » plutôt que « autoUpdate » : on ne recharge jamais l'app
      // dans le dos de quelqu'un qui est en train de compter son stock.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Réserve — stock resto',
        short_name: 'Réserve',
        description: 'Scanne, range, commande. Ta réserve enfin claire.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF8F5',
        theme_color: '#FAF8F5',
        categories: ['business', 'food', 'productivity'],
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Scanner un produit',
            short_name: 'Scanner',
            url: '/scan',
            icons: [{ src: '/icons/pwa-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Ajoute la réception des notifications au service worker généré,
        // sans avoir à reprendre à la main toute la config de cache.
        importScripts: ['/push-sw.js'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Photos de produits, d'établissements et de profil.
            // « Cache d'abord » : une photo ne change jamais — son URL contient
            // un identifiant unique, une nouvelle photo a une nouvelle URL.
            // Sans ça, chaque écran les retélécharge, et elles disparaissent
            // hors-ligne alors que c'est là qu'on en a le plus besoin.
            urlPattern: ({ url, request }) =>
              request.destination === 'image' &&
              (url.hostname.endsWith('.supabase.co') ||
                url.hostname.endsWith('openfoodfacts.org')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'reserve-photos',
              expiration: {
                // Un gros stock tourne autour de 150 produits ; 300 laisse de
                // la marge sans saturer le téléphone.
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 60,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Désactivé volontairement. Un service worker en dev finit par servir
        // un index.html en cache qui référence des chunks aux noms périmés :
        // page blanche, sans erreur visible. Pour tester la PWA pour de vrai,
        // faire `npm run build && npm run preview`.
        enabled: false,
      },
    }),
  ],
})

import { QueryClient } from '@tanstack/react-query'

/**
 * Réglages pensés pour une app utilisée en réserve / chambre froide :
 * on garde les données affichables longtemps et on ne spamme pas le réseau.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      // Le réseau revient souvent d'un coup en sortant de la réserve.
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useTenancy } from '@/features/tenancy/useTenancy'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

import { stockQueryKey } from './stockRepository'

/**
 * Stock partagé en temps réel.
 *
 * Quand un membre ajuste une quantité en chambre froide, les autres la voient
 * sans recharger. La RLS s'applique aussi aux messages Realtime : personne ne
 * reçoit les mouvements d'une autre organisation.
 *
 * On ne fait qu'invalider le cache — refaire la requête est plus simple et plus
 * sûr que d'appliquer les deltas à la main, et le volume ne le justifie pas.
 */
export function useStockRealtime(): void {
  const queryClient = useQueryClient()
  const { current } = useTenancy()
  const establishmentId = current?.id

  useEffect(() => {
    if (!isSupabaseConfigured || !establishmentId) return

    const supabase = getSupabase()
    const channel = supabase
      .channel(`stock:${establishmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_items',
          filter: `establishment_id=eq.${establishmentId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: stockQueryKey })
        },
      )
      .on(
        'postgres_changes',
        // Les lots n'ont pas d'`establishment_id` : on écoute tout ce qui nous
        // parvient, la RLS ayant déjà fait le tri à la source.
        { event: '*', schema: 'public', table: 'stock_batches' },
        () => {
          void queryClient.invalidateQueries({ queryKey: stockQueryKey })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [establishmentId, queryClient])
}

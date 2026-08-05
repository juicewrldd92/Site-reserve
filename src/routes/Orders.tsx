import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { CartIcon, ChevronRightIcon, PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAlerts } from '@/features/alerts/useAlerts'
import {
  createOrderList,
  listOrderLists,
  ordersQueryKey,
} from '@/features/orders/orderRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'
import type { OrderStatus } from '@/lib/database.types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'À commander',
  sent: 'Commandée',
  ordered: 'Commandée',
  received: 'Reçue',
}

const STATUS_TONES: Record<OrderStatus, 'ok' | 'warn' | 'neutral'> = {
  draft: 'neutral',
  sent: 'warn',
  ordered: 'warn',
  received: 'ok',
}

/** Les listes à commander de l'établissement. */
export function Orders() {
  const queryClient = useQueryClient()
  const { current } = useTenancy()
  const { groups } = useAlerts()
  const [name, setName] = useState('')

  const lists = useQuery({
    queryKey: [...ordersQueryKey, current?.id],
    queryFn: () => listOrderLists(current?.id as string),
    enabled: Boolean(current?.id),
  })

  const create = useMutation({
    mutationFn: () => {
      if (!current) throw new Error('Aucun établissement sélectionné.')
      return createOrderList(current.id, name.trim() || defaultName())
    },
    onSuccess: async () => {
      setName('')
      await queryClient.invalidateQueries({ queryKey: ordersQueryKey })
    },
  })

  const isEmpty = lists.isSuccess && lists.data.length === 0

  return (
    <div className="flex min-h-full flex-col gap-3.5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[27px] font-extrabold tracking-[-0.03em]">À commander</h1>
        {!isEmpty && lists.isSuccess && (
          <span className="text-ink-muted text-[13.5px] font-semibold">
            {lists.data.length} liste{lists.data.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <Button
        variant="tertiary"
        size="md"
        disabled={create.isPending}
        onClick={() => create.mutate()}
      >
        <PlusIcon size={18} strokeWidth={2} className="text-corail" />
        {create.isPending ? 'On prépare…' : 'Nouvelle liste'}
      </Button>

      {groups.low.length > 0 && (
        <p className="text-ink-muted text-[13px] leading-[1.5]">
          {groups.low.length} produit{groups.low.length > 1 ? 's sont' : ' est'} sous
          {groups.low.length > 1 ? ' leur seuil' : ' son seuil'}. Ouvre une liste et
          génère-la en un tap.
        </p>
      )}

      {create.isError && (
        <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
          {create.error.message}
        </p>
      )}

      {isEmpty ? (
        <EmptyState
          title="Aucune liste en cours"
          text="Crée une liste et remplis-la automatiquement avec tout ce qui est sous son seuil."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {lists.data?.map((list) => (
            <Link
              key={list.id}
              to={`/commandes/${list.id}`}
              className="bg-surface rounded-card shadow-card flex items-center gap-3 p-3.5"
            >
              <span className="bg-corail-tint text-corail flex h-11 w-11 flex-none items-center justify-center rounded-full">
                <CartIcon size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold">{list.name}</span>
                <span className="text-ink-muted text-[12.5px]">
                  {new Date(list.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </span>
              <StatusBadge tone={STATUS_TONES[list.status]} size="sm">
                {STATUS_LABELS[list.status]}
              </StatusBadge>
              <ChevronRightIcon size={18} className="text-ink-faint flex-none" />
            </Link>
          ))}
        </div>
      )}

      {lists.isError && (
        <Card className="px-4 py-3">
          <p className="text-alert-ink text-[13.5px] font-semibold">{lists.error.message}</p>
        </Card>
      )}

      <div className="pb-2" />
    </div>
  )
}

/** « Commande du 4 août » — plus parlant qu'un champ vide à remplir. */
function defaultName(): string {
  return `Commande du ${new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })}`
}

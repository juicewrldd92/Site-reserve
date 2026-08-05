import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, UploadIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import {
  fillFromLowStock,
  getOrderList,
  listOrderItems,
  markAsOrdered,
  ordersQueryKey,
  receiveOrderList,
  removeOrderItem,
  removeOrderList,
  reopenOrderList,
  updateOrderItem,
} from '@/features/orders/orderRepository'
import {
  formatOrderText,
  mailtoUrl,
  shareText,
  whatsappUrl,
} from '@/features/orders/share'
import { unitLabel } from '@/features/products/units'
import { stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'

/** Détail d'une liste : cases à cocher, quantités, partage. */
export function OrderDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { current } = useTenancy()
  const [notice, setNotice] = useState<string | null>(null)

  const list = useQuery({
    queryKey: [...ordersQueryKey, 'list', id],
    queryFn: () => getOrderList(id),
    enabled: id !== '',
  })

  const items = useQuery({
    queryKey: [...ordersQueryKey, 'items', id],
    queryFn: () => listOrderItems(id),
    enabled: id !== '',
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ordersQueryKey })

  const generate = useMutation({
    mutationFn: () => fillFromLowStock(id),
    onSuccess: async (count) => {
      setNotice(
        count === 0
          ? 'Rien à ajouter : aucun produit sous son seuil.'
          : `${count} produit${count > 1 ? 's ajoutés' : ' ajouté'} depuis le stock bas.`,
      )
      await refresh()
    },
  })

  const patch = useMutation({
    // `itemId` identifie la ligne, il ne fait pas partie du patch : on le sort
    // avant l'envoi, sinon PostgREST le prend pour une colonne.
    mutationFn: ({
      itemId,
      ...changes
    }: {
      itemId: string
      quantity?: number
      is_checked?: boolean
    }) => updateOrderItem(itemId, changes),
    onSuccess: refresh,
  })

  const drop = useMutation({
    mutationFn: (itemId: string) => removeOrderItem(itemId),
    onSuccess: refresh,
  })

  const send = useMutation({
    mutationFn: () => markAsOrdered(id),
    onSuccess: refresh,
  })

  const receive = useMutation({
    mutationFn: () => receiveOrderList(id),
    onSuccess: async (count) => {
      setNotice(
        count === 0
          ? 'Aucune ligne cochée : rien n’est rentré en stock.'
          : `${count} produit${count > 1 ? 's rentrés' : ' rentré'} en stock.`,
      )
      await queryClient.invalidateQueries({ queryKey: stockQueryKey })
      await refresh()
    },
  })

  const reopen = useMutation({
    mutationFn: () => reopenOrderList(id),
    onSuccess: refresh,
  })

  const dropList = useMutation({
    mutationFn: () => removeOrderList(id),
    onSuccess: async () => {
      await refresh()
      navigate('/commandes', { replace: true })
    },
  })

  const rows = items.data ?? []
  const checked = rows.filter((item) => item.is_checked)
  const status = list.data?.status ?? 'draft'
  const isReceived = status === 'received'
  const isOrdered = status === 'ordered' || status === 'sent'

  // Regroupement par fournisseur : on ne mélange pas la commande du primeur
  // avec celle de Metro.
  const grouped = Object.values(
    rows.reduce<Record<string, { key: string; label: string; items: typeof rows }>>(
      (acc, item) => {
        const key = item.supplier_id ?? 'sans'
        acc[key] ??= {
          key,
          label: item.supplier_name ?? 'Sans fournisseur',
          items: [],
        }
        acc[key].items.push(item)
        return acc
      },
      {},
    ),
  ).sort((a, b) => a.label.localeCompare(b.label, 'fr'))
  const text = formatOrderText(
    list.data?.name ?? 'Commande',
    current?.name ?? '',
    rows,
  )

  async function onShare() {
    const outcome = await shareText(list.data?.name ?? 'Commande', text)
    if (outcome === 'copied') setNotice('Liste copiée dans le presse-papier.')
    if (outcome === 'failed') setNotice('Le partage n’a pas abouti.')
  }

  return (
    <div className="flex min-h-full flex-col gap-3.5 pb-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Retour"
          onClick={() => navigate('/commandes')}
          className="bg-surface shadow-pill flex h-10 w-10 items-center justify-center rounded-full"
        >
          <CloseIcon size={18} />
        </button>
        <span className="max-w-[60%] truncate text-[15.5px] font-bold">
          {list.data?.name ?? 'Commande'}
        </span>
        <span className="text-ink-muted w-10 text-right text-[13px] font-semibold">
          {rows.length}
        </span>
      </header>

      <div className="flex gap-2">
        <StatusStep label="À commander" done={true} current={!isOrdered && !isReceived} />
        <StatusStep label="Commandée" done={isOrdered || isReceived} current={isOrdered} />
        <StatusStep label="Reçue" done={isReceived} current={isReceived} />
      </div>

      <Button
        variant="tertiary"
        size="md"
        disabled={generate.isPending || isReceived}
        onClick={() => generate.mutate()}
      >
        <UploadIcon size={18} strokeWidth={2} className="text-corail" />
        {generate.isPending ? 'On regarde le stock…' : 'Générer depuis le stock bas'}
      </Button>

      {notice && <p className="text-ink-muted text-[13px]">{notice}</p>}

      {(generate.isError || patch.isError) && (
        <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
          {(generate.error ?? patch.error)?.message}
        </p>
      )}

      {grouped.map((group) => (
        <div key={group.key} className="flex flex-col gap-2.5">
          {grouped.length > 1 && (
            <span className="text-ink-muted px-1 text-[13px] font-bold">
              {group.label} · {group.items.length}
            </span>
          )}
          {group.items.map((item) => (
          <Card
            key={item.id}
            className={cn('flex items-center gap-3 p-3', !item.is_checked && 'opacity-60')}
          >
            <button
              type="button"
              aria-label={item.is_checked ? 'Décocher' : 'Cocher'}
              onClick={() => patch.mutate({ itemId: item.id, is_checked: !item.is_checked })}
              className={cn(
                'flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full',
                item.is_checked
                  ? 'bg-corail text-white'
                  : 'border-[1.8px] border-[#DCD5CC]',
              )}
            >
              {item.is_checked && <CheckIcon size={15} strokeWidth={2.4} />}
            </button>

            <span className="photo-ph h-[46px] w-[46px] flex-none overflow-hidden rounded-[13px]">
              {item.image_url && (
                <img src={item.image_url} alt="" className="h-full w-full object-cover" />
              )}
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="truncate text-[14.5px] font-bold">{item.name}</span>
              <span className="text-ink-muted text-[12.5px]">
                {item.brand ?? unitLabel(item.unit, item.quantity)}
              </span>
            </span>

            <span className="flex flex-none items-center gap-2">
              <button
                type="button"
                aria-label="Moins"
                onClick={() =>
                  item.quantity <= 1
                    ? drop.mutate(item.id)
                    : patch.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                }
                className="border-line flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px]"
              >
                <MinusIcon size={13} strokeWidth={2} />
              </button>
              <span className="min-w-4 text-center text-[15px] font-bold tabular-nums">
                {item.quantity}
              </span>
              <button
                type="button"
                aria-label="Plus"
                onClick={() => patch.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                className="border-line flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px]"
              >
                <PlusIcon size={13} strokeWidth={2} />
              </button>
            </span>
          </Card>
          ))}
        </div>
      ))}

      {rows.length === 0 && items.isSuccess && (
        <p className="text-ink-muted py-8 text-center text-[14.5px]">
          Liste vide. Génère-la depuis le stock bas.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex gap-2.5">
            <a
              href={whatsappUrl(text)}
              target="_blank"
              rel="noreferrer"
              className="bg-surface shadow-pill flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-full text-[13.5px] font-bold"
            >
              WhatsApp
            </a>
            <a
              href={mailtoUrl(list.data?.name ?? 'Commande', text)}
              className="bg-surface shadow-pill flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-full text-[13.5px] font-bold"
            >
              Mail
            </a>
            <button
              type="button"
              onClick={() => void onShare()}
              className="bg-surface shadow-pill flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-full text-[13.5px] font-bold"
            >
              Partager
            </button>
          </div>

          {!isOrdered && !isReceived && (
            <Button
              onClick={() => {
                void onShare()
                send.mutate()
              }}
              disabled={send.isPending || checked.length === 0}
            >
              {send.isPending
                ? 'On envoie…'
                : `Envoyer la commande · ${checked.length} item${checked.length > 1 ? 's' : ''}`}
            </Button>
          )}

          {isOrdered && (
            <Button onClick={() => receive.mutate()} disabled={receive.isPending}>
              {receive.isPending ? 'On range…' : 'Marquer comme reçue'}
            </Button>
          )}

          {isReceived && (
            <p className="bg-ok-bg text-ok-ink rounded-card px-4 py-3 text-center text-[13.5px] font-semibold">
              Commande reçue le{' '}
              {new Date(list.data?.received_at ?? Date.now()).toLocaleDateString('fr-FR')} —
              le stock a été mis à jour.
            </p>
          )}

          {(isOrdered || isReceived) && (
            <button
              type="button"
              onClick={() => reopen.mutate()}
              disabled={reopen.isPending}
              className="text-ink-muted py-1 text-[13px] font-semibold"
            >
              Rouvrir en brouillon
            </button>
          )}

          {receive.isError && (
            <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13.5px] font-semibold">
              {receive.error.message}
            </p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => dropList.mutate()}
        disabled={dropList.isPending}
        className="text-ink-muted py-2 text-[13.5px] font-semibold"
      >
        Supprimer cette liste
      </button>
    </div>
  )
}

/** Fil d'Ariane du cycle de vie : on voit d'un coup d'œil où en est la commande. */
function StatusStep({
  label,
  done,
  current,
}: {
  label: string
  done: boolean
  current: boolean
}) {
  return (
    <span
      className={cn(
        'flex-1 rounded-full py-2 text-center text-[12.5px] font-bold',
        current
          ? 'bg-corail text-white'
          : done
            ? 'bg-ok-bg text-ok-ink'
            : 'bg-chip text-ink-faint',
      )}
    >
      {label}
    </span>
  )
}

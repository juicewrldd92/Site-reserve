import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SlidersIcon,
} from '@/components/icons'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/features/auth/useAuth'
import { useProfile } from '@/features/profile/useProfile'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

import { useTenancy } from './useTenancy'

const ROLE_LABELS = { owner: 'Patron', manager: 'Manager', staff: 'Cuisine' } as const

/** Pilule d'en-tête + feuille de sélection. Un membre peut être sur plusieurs restos. */
export function EstablishmentSwitcher() {
  const [open, setOpen] = useState(false)
  const { current, establishments, organizations, memberships, setCurrentId } = useTenancy()
  const { user, signOut } = useAuth()
  const { displayName, avatarUrl } = useProfile()
  const { canInstall, install } = useInstallPrompt()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-surface shadow-pill flex items-center gap-[11px] rounded-full py-[7px] pr-3.5 pl-[7px]"
      >
        <span className="photo-ph block h-[34px] w-[34px] flex-none overflow-hidden rounded-full">
          {current?.image_url && (
            <img src={current.image_url} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <span className="max-w-[170px] truncate text-[15px] font-bold">
          {current?.name ?? 'Ton resto'}
        </span>
        <ChevronDownIcon size={16} className="text-ink-muted" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Tes établissements">
        <div className="flex flex-col gap-2 pb-2">
          {establishments.map((establishment) => {
            const active = establishment.id === current?.id
            const org = organizations.find((o) => o.id === establishment.org_id)
            const role = memberships.find(
              (m) =>
                m.org_id === establishment.org_id &&
                (m.establishment_id === null || m.establishment_id === establishment.id),
            )?.role

            return (
              <button
                key={establishment.id}
                type="button"
                onClick={() => {
                  setCurrentId(establishment.id)
                  setOpen(false)
                }}
                className={cn(
                  'bg-surface rounded-card shadow-card flex items-center gap-3 p-3 text-left',
                  active && 'border-corail border-[1.5px]',
                )}
              >
                <span className="photo-ph rounded-thumb h-12 w-12 flex-none overflow-hidden">
                  {establishment.image_url && (
                    <img
                      src={establishment.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{establishment.name}</span>
                  <span className="text-ink-muted text-[12.5px]">
                    {[org && org.name !== establishment.name ? org.name : null, role && ROLE_LABELS[role]]
                      .filter(Boolean)
                      .join(' · ') || 'Établissement'}
                  </span>
                </span>
                {active && (
                  <span className="bg-corail flex h-6 w-6 flex-none items-center justify-center rounded-full text-white">
                    <CheckIcon size={14} />
                  </span>
                )}
              </button>
            )
          })}

          <Link
            to="/reglages"
            onClick={() => setOpen(false)}
            className="bg-surface rounded-card shadow-card mt-2 flex items-center gap-3 p-3.5"
          >
            <span className="bg-chip text-ink flex h-10 w-10 flex-none items-center justify-center rounded-full">
              <SlidersIcon size={18} />
            </span>
            <span className="flex-1 text-[15px] font-bold">Réglages & équipe</span>
            <ChevronRightIcon size={18} className="text-ink-faint" />
          </Link>

          {canInstall && (
            <button
              type="button"
              onClick={() => void install()}
              className="border-line-soft mt-2 flex h-13 items-center justify-center rounded-full border-[1.5px] border-dashed text-[14.5px] font-bold"
            >
              Installer Réserve sur cet appareil
            </button>
          )}

          <Card className="mt-2 flex items-center gap-3 p-3.5">
            <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-full">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="bg-corail-tint text-corail-ink flex h-full w-full items-center justify-center text-[15px] font-bold">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-bold">{displayName}</span>
              <span className="text-ink-muted truncate text-[12px]">{user?.email}</span>
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="border-line rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold"
            >
              Se déconnecter
            </button>
          </Card>
        </div>
      </BottomSheet>
    </>
  )
}

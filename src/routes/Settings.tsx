import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CloseIcon } from '@/components/icons'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { ProfileSection } from '@/features/profile/ProfileSection'
import { LocationsEditor } from '@/features/tenancy/LocationsEditor'
import { Members } from '@/features/tenancy/Members'
import { tenancyQueryKey } from '@/features/tenancy/tenancyContext'
import { useTenancy } from '@/features/tenancy/useTenancy'
import { getSupabase } from '@/lib/supabase'

const DLC_CHOICES = [2, 3, 5, 7, 10] as const

/** Réglages de l'établissement : alertes et équipe. Aucun tableau, aucun jargon. */
export function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { current, role } = useTenancy()
  const [days, setDays] = useState(current?.dlc_alert_days ?? 5)

  const canManage = role === 'owner' || role === 'manager'

  const saveDays = useMutation({
    mutationFn: async (value: number) => {
      if (!current) throw new Error('Aucun établissement sélectionné.')
      const { error } = await getSupabase()
        .from('establishments')
        .update({ dlc_alert_days: value })
        .eq('id', current.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenancyQueryKey }),
  })

  return (
    <div className="flex flex-col gap-5 pb-6">
      <header className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => navigate(-1)}
          className="bg-surface shadow-pill flex h-10 w-10 items-center justify-center rounded-full"
        >
          <CloseIcon size={18} />
        </button>
        <span className="text-[15.5px] font-bold">Réglages</span>
        <span className="w-10" />
      </header>

      <Card className="flex items-center gap-3.5 p-4">
        <span className="photo-ph h-14 w-14 flex-none rounded-[18px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[17px] font-bold">{current?.name}</span>
          <span className="text-ink-muted text-[13px]">
            {[current?.cuisine_type, current?.address].filter(Boolean).join(' · ') ||
              'Établissement'}
          </span>
        </div>
      </Card>

      <ProfileSection />

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[16px] font-bold">Alertes</h2>
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Prévenir avant la DLC</span>
            <span className="text-ink-muted text-[12.5px]">
              {days} jour{days > 1 ? 's' : ''} avant la date limite
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DLC_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                disabled={!canManage || saveDays.isPending}
                onClick={() => {
                  setDays(choice)
                  saveDays.mutate(choice)
                }}
                className={cn(
                  'rounded-full px-[15px] py-2 text-[13.5px] font-semibold disabled:opacity-50',
                  days === choice ? 'bg-corail text-white' : 'bg-chip text-ink-muted',
                )}
              >
                {choice} j
              </button>
            ))}
          </div>
          {!canManage && (
            <p className="text-ink-muted text-[12.5px]">
              Seuls le patron et les managers peuvent changer ce réglage.
            </p>
          )}
          {saveDays.isError && (
            <p className="bg-alert-bg text-alert-ink rounded-card px-3 py-2 text-[12.5px] font-semibold">
              {saveDays.error.message}
            </p>
          )}
        </Card>
      </section>

      <LocationsEditor />

      <Members />
    </div>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Field } from '@/components/ui/Field'
import { useAuth } from '@/features/auth/useAuth'
import type { MemberRole } from '@/lib/database.types'
import { getSupabase } from '@/lib/supabase'

import { tenancyQueryKey } from './tenancyContext'
import { useTenancy } from './useTenancy'

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Patron',
  manager: 'Manager',
  staff: 'Cuisine',
}

const AVATAR_TINTS = [
  'bg-corail-tint text-corail-ink',
  'bg-ok-bg text-ok-ink',
  'bg-warn-bg text-warn-ink',
]

const teamQueryKey = ['team'] as const

/** « L'équipe » : rôles par pastille, invitations en attente, zéro tableau. */
export function Members() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { current, role, memberships } = useTenancy()

  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('staff')

  const orgId = current?.org_id
  const isOwner = role === 'owner'
  const canInvite = isOwner || role === 'manager'

  const team = useQuery({
    queryKey: [...teamQueryKey, orgId],
    queryFn: async () => {
      const supabase = getSupabase()
      const [profiles, invitations] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('invitations').select('*').is('accepted_at', null),
      ])
      const failed = profiles.error ?? invitations.error
      if (failed) throw new Error(failed.message)
      return { profiles: profiles.data ?? [], invitations: invitations.data ?? [] }
    },
    enabled: Boolean(orgId),
  })

  const invite = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('Aucun établissement sélectionné.')
      const { error } = await getSupabase().from('invitations').insert({
        org_id: orgId,
        email: email.trim().toLowerCase(),
        role: inviteRole,
        invited_by: user?.id ?? null,
      })
      if (error) throw new Error(translate(error.message))
    },
    onSuccess: async () => {
      setEmail('')
      await queryClient.invalidateQueries({ queryKey: teamQueryKey })
    },
  })

  const revoke = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await getSupabase().from('invitations').delete().eq('id', invitationId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamQueryKey }),
  })

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await getSupabase().from('memberships').delete().eq('id', membershipId)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenancyQueryKey })
      await queryClient.invalidateQueries({ queryKey: teamQueryKey })
    },
  })

  function onInvite(event: FormEvent) {
    event.preventDefault()
    if (email.trim().length === 0 || invite.isPending) return
    invite.mutate()
  }

  const orgMembers = memberships.filter((m) => m.org_id === orgId)

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[16px] font-bold">L'équipe</h2>

      <Card className="flex flex-col p-1.5">
        {orgMembers.map((membership, index) => {
          const profile = team.data?.profiles.find((p) => p.id === membership.user_id)
          const label = profile?.full_name ?? (membership.user_id === user?.id ? 'Toi' : 'Membre')
          return (
            <div key={membership.id}>
              {index > 0 && <div className="mx-2.5 h-px bg-[rgb(26_26_26/0.06)]" />}
              <div className="flex items-center gap-3 p-2.5">
                <Avatar label={label} index={index} />
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[15px] font-bold">{label}</span>
                  <span className="text-ink-muted text-[12.5px]">
                    {membership.establishment_id === null
                      ? 'Tous les établissements'
                      : current?.name}
                  </span>
                </div>
                <span className="bg-chip text-ink-muted flex-none rounded-full px-[11px] py-1.5 text-[12px] font-bold">
                  {ROLE_LABELS[membership.role]}
                </span>
                {isOwner && membership.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => removeMember.mutate(membership.id)}
                    className="text-ink-faint flex-none text-[12.5px] font-bold"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {team.data?.invitations.map((invitation) => (
          <div key={invitation.id}>
            <div className="mx-2.5 h-px bg-[rgb(26_26_26/0.06)]" />
            <div className="flex items-center gap-3 p-2.5">
              <Avatar label={invitation.email} index={2} />
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-[15px] font-bold">{invitation.email}</span>
                <span className="text-ink-muted text-[12.5px]">
                  Rejoindra en {ROLE_LABELS[invitation.role].toLowerCase()}
                </span>
              </div>
              <span className="bg-warn-bg text-warn-ink flex-none rounded-full px-[11px] py-1.5 text-[12px] font-bold">
                En attente
              </span>
              {canInvite && (
                <button
                  type="button"
                  onClick={() => revoke.mutate(invitation.id)}
                  className="text-ink-faint flex-none text-[12.5px] font-bold"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        ))}
      </Card>

      {canInvite && (
        <form onSubmit={onInvite} className="flex flex-col gap-2.5">
          <Field
            label="Inviter quelqu'un"
            type="email"
            inputMode="email"
            placeholder="lea@chezmarco.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <Chip active={inviteRole === 'staff'} onClick={() => setInviteRole('staff')}>
              Cuisine
            </Chip>
            {isOwner && (
              <>
                <Chip active={inviteRole === 'manager'} onClick={() => setInviteRole('manager')}>
                  Manager
                </Chip>
                <Chip active={inviteRole === 'owner'} onClick={() => setInviteRole('owner')}>
                  Patron
                </Chip>
              </>
            )}
          </div>

          {invite.isError && (
            <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13px] font-semibold">
              {invite.error.message}
            </p>
          )}

          <Button type="submit" size="md" disabled={invite.isPending}>
            {invite.isPending ? 'On enregistre…' : "Envoyer l'invitation"}
          </Button>

          <p className="text-ink-muted text-[12.5px] leading-[1.5]">
            La personne rejoint l'équipe automatiquement à sa première connexion,
            si elle s'inscrit avec cette adresse. Préviens-la de ton côté :
            Réserve n'envoie pas encore d'e-mail.
          </p>
        </form>
      )}
    </section>
  )
}

function Avatar({ label, index }: { label: string; index: number }) {
  return (
    <span
      className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-[15px] font-bold ${
        AVATAR_TINTS[index % AVATAR_TINTS.length]
      }`}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

function translate(message: string): string {
  if (/duplicate key|unique constraint/i.test(message))
    return 'Cette adresse a déjà une invitation en attente.'
  if (/row-level security|violates/i.test(message))
    return "Tu n'as pas le droit d'inviter avec ce rôle."
  return message
}

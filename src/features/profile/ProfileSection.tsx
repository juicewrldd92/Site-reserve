import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/useAuth'

import { IdentityFields } from './IdentityFields'
import { profileQueryKey, updateProfile, uploadAvatar } from './profileRepository'
import { useProfile } from './useProfile'

/** Section « Toi » des réglages : le nom d'usage et la photo, modifiables. */
export function ProfileSection() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { profile, avatarUrl } = useProfile()

  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saved, setSaved] = useState(false)

  // Le profil arrive après le premier rendu : on remplit le champ dès qu'il est là,
  // sans écraser ce que la personne est en train de taper.
  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
  }, [profile?.full_name])

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Session expirée.')
      const avatar = photo ? await uploadAvatar(user.id, photo) : null
      await updateProfile(user.id, {
        full_name: name.trim() === '' ? null : name.trim(),
        ...(avatar ? { avatar_url: avatar } : {}),
      })
    },
    onSuccess: async () => {
      setPhoto(null)
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: profileQueryKey })
    },
  })

  const dirty = photo !== null || name.trim() !== (profile?.full_name ?? '').trim()

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[16px] font-bold">Toi</h2>

      <Card className="flex flex-col gap-4 p-4">
        <IdentityFields
          name={name}
          onNameChange={(value) => {
            setName(value)
            setSaved(false)
          }}
          photo={photo}
          onPhotoChange={(file) => {
            setPhoto(file)
            setSaved(false)
          }}
          currentAvatarUrl={avatarUrl}
        />

        {save.isError && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-3 py-2 text-[12.5px] font-semibold">
            {save.error.message}
          </p>
        )}

        {dirty && (
          <Button size="md" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'On enregistre…' : 'Enregistrer'}
          </Button>
        )}

        {saved && !dirty && (
          <p className="text-ok-ink text-[13px] font-semibold">C’est noté.</p>
        )}
      </Card>
    </section>
  )
}

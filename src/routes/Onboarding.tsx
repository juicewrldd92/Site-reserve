import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Field, FieldGroup } from '@/components/ui/Field'
import { cn } from '@/components/ui/cn'
import { IdentityFields } from '@/features/profile/IdentityFields'
import {
  profileQueryKey,
  updateProfile,
  uploadAvatar,
} from '@/features/profile/profileRepository'
import { tenancyQueryKey } from '@/features/tenancy/tenancyContext'
import { useTenancy } from '@/features/tenancy/useTenancy'
import { useAuth } from '@/features/auth/useAuth'
import { getSupabase } from '@/lib/supabase'

const CUISINES = ['Trattoria', 'Bistrot', 'Bar à vin', 'Pizzeria', 'Brasserie', 'Autre'] as const
const LOCATION_SUGGESTIONS = ['Frigo', 'Congélo', 'Réserve sèche', 'Cave', 'Bar', 'Économat'] as const
const DEFAULT_LOCATIONS = ['Frigo', 'Congélo', 'Réserve sèche']

/**
 * « On parle de quel resto ? » — 3 champs max, des chips tappables plutôt
 * que des menus déroulants.
 *
 * L'organisation prend le nom du restaurant : un indépendant n'a pas à
 * comprendre la différence. Les groupes ajouteront leurs autres
 * établissements ensuite, sous la même organisation.
 */
export function Onboarding() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setCurrentId } = useTenancy()
  const { user } = useAuth()

  // Deux étapes : qui tu es, puis où tu travailles. La seconde est la seule
  // obligatoire — on n'empêche personne d'entrer parce qu'il n'a pas de photo.
  const [step, setStep] = useState<1 | 2>(1)
  const [displayName, setDisplayName] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState<string | null>(null)
  const [locations, setLocations] = useState<string[]>(DEFAULT_LOCATIONS)
  const [customLocation, setCustomLocation] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)

  const create = useMutation({
    mutationFn: async () => {
      // L'identité d'abord : si ça échoue, on n'a pas encore créé d'organisation
      // orpheline. Un échec de photo ne doit pas bloquer l'inscription.
      if (user?.id) {
        let avatarUrl: string | null = null
        if (photo) {
          try {
            avatarUrl = await uploadAvatar(user.id, photo)
          } catch (cause) {
            console.warn('Photo de profil non envoyée :', cause)
          }
        }
        await updateProfile(user.id, {
          full_name: displayName.trim() === '' ? null : displayName.trim(),
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
      }

      const { data, error } = await getSupabase().rpc(
        'create_organization_with_establishment',
        {
          p_org_name: name.trim(),
          p_establishment_name: name.trim(),
          p_cuisine_type: cuisine,
          p_locations: locations,
        },
      )
      if (error) throw new Error(error.message)
      const created = data[0]
      if (!created) throw new Error("L'établissement n'a pas pu être créé.")
      return created
    },
    onSuccess: async (created) => {
      setCurrentId(created.establishment_id)
      await queryClient.invalidateQueries({ queryKey: tenancyQueryKey })
      await queryClient.invalidateQueries({ queryKey: profileQueryKey })
      // Navigation explicite : le garde de `/onboarding` ne regarde que la
      // session, il ne nous sortirait pas d'ici tout seul.
      //
      // On passe par l'installation : c'est le seul moment où l'on est sûr
      // d'avoir l'attention du restaurateur, et sur iPhone les notifications
      // n'existent pas tant que l'app n'est pas sur l'écran d'accueil.
      navigate('/installation', { replace: true })
    },
  })

  const suggestions = LOCATION_SUGGESTIONS.filter((s) => !locations.includes(s))

  function toggleLocation(value: string) {
    setLocations((current) =>
      current.includes(value) ? current.filter((l) => l !== value) : [...current, value],
    )
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    // Entrée pressée à l'étape 1 : on avance, on ne crée rien.
    if (step === 1) {
      setStep(2)
      return
    }
    if (name.trim().length === 0 || create.isPending) return
    create.mutate()
  }

  return (
    <div className="bg-canvas flex min-h-dvh justify-center">
      <form
        onSubmit={onSubmit}
        className="flex min-h-dvh w-full max-w-[430px] flex-col px-6"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 34px)',
        }}
      >
        <div className="flex items-center justify-center gap-1.5 py-2">
          <span
            className={cn(
              'h-1.5 rounded-full',
              step === 1 ? 'bg-corail w-[22px]' : 'w-1.5 bg-[#DCD5CC]',
            )}
          />
          <span
            className={cn(
              'h-1.5 rounded-full',
              step === 2 ? 'bg-corail w-[22px]' : 'w-1.5 bg-[#DCD5CC]',
            )}
          />
        </div>

        <div className="flex flex-col gap-2 pt-5">
          <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em]">
            {step === 1 ? 'On fait connaissance ?' : 'On parle de quel resto ?'}
          </h1>
          <p className="text-ink-muted text-[15.5px] leading-[1.5]">
            {step === 1
              ? 'Juste de quoi te dire bonjour correctement.'
              : "Tu pourras en ajouter d'autres plus tard."}
          </p>
        </div>

        {step === 1 && (
          <div className="pt-7">
            <IdentityFields
              name={displayName}
              onNameChange={setDisplayName}
              photo={photo}
              onPhotoChange={setPhoto}
              size="lg"
            />
          </div>
        )}

        <div className={cn('flex flex-col gap-4 pt-6', step === 1 && 'hidden')}>
          <Field
            label="Nom de l'établissement"
            required
            maxLength={120}
            autoFocus
            placeholder="Chez Marco"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <FieldGroup label="Type de cuisine">
            {CUISINES.map((option) => (
              <Chip
                key={option}
                active={cuisine === option}
                onClick={() => setCuisine(cuisine === option ? null : option)}
              >
                {option}
              </Chip>
            ))}
          </FieldGroup>

          <FieldGroup label="Tes emplacements de stockage">
            {locations.map((location) => (
              <button
                key={location}
                type="button"
                onClick={() => toggleLocation(location)}
                className="bg-corail-tint text-corail-ink rounded-full px-[14px] py-2 text-[13.5px] font-semibold"
              >
                {location}
              </button>
            ))}
            {suggestions.map((location) => (
              <button
                key={location}
                type="button"
                onClick={() => toggleLocation(location)}
                className="bg-chip text-ink-muted rounded-full px-[14px] py-2 text-[13.5px] font-semibold"
              >
                {location}
              </button>
            ))}
            {addingLocation ? (
              <input
                autoFocus
                value={customLocation}
                maxLength={40}
                placeholder="Nom de la zone"
                onChange={(e) => setCustomLocation(e.target.value)}
                onBlur={commitCustomLocation}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitCustomLocation()
                  }
                  if (e.key === 'Escape') {
                    setAddingLocation(false)
                    setCustomLocation('')
                  }
                }}
                className="bg-chip placeholder:text-ink-faint w-32 rounded-full px-[14px] py-2 text-[13.5px] font-semibold outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingLocation(true)}
                className="bg-chip text-ink-muted flex items-center gap-1.5 rounded-full px-[14px] py-2 text-[13.5px] font-semibold"
              >
                <PlusIcon size={13} strokeWidth={1.9} />
                Ajouter
              </button>
            )}
          </FieldGroup>
        </div>

        {create.isError && (
          <p className="bg-alert-bg text-alert-ink rounded-card mt-4 px-4 py-3 text-[13.5px] font-semibold">
            {create.error.message}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-8">
          {step === 1 ? (
            <Button type="button" onClick={() => setStep(2)}>
              Continuer
            </Button>
          ) : (
            <>
              <Button type="submit" disabled={name.trim().length === 0 || create.isPending}>
                {create.isPending ? 'On installe ta réserve…' : 'C’est parti'}
              </Button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-ink-muted py-2 text-[14px] font-semibold"
              >
                Retour
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )

  function commitCustomLocation() {
    const value = customLocation.trim()
    if (value.length > 0 && !locations.includes(value)) {
      setLocations((current) => [...current, value])
    }
    setCustomLocation('')
    setAddingLocation(false)
  }
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Field, FieldGroup } from '@/components/ui/Field'
import { cn } from '@/components/ui/cn'
import { tenancyQueryKey } from '@/features/tenancy/tenancyContext'
import { useTenancy } from '@/features/tenancy/useTenancy'
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

  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState<string | null>(null)
  const [locations, setLocations] = useState<string[]>(DEFAULT_LOCATIONS)
  const [customLocation, setCustomLocation] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)

  const create = useMutation({
    mutationFn: async () => {
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
      // Navigation explicite : le garde de `/onboarding` ne regarde que la
      // session, il ne nous sortirait pas d'ici tout seul.
      navigate('/', { replace: true })
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
          <span className="h-1.5 w-1.5 rounded-full bg-[#DCD5CC]" />
          <span className="bg-corail h-1.5 w-[22px] rounded-full" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#DCD5CC]" />
        </div>

        <div className="flex flex-col gap-2 pt-5">
          <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em]">
            On parle de quel resto ?
          </h1>
          <p className="text-ink-muted text-[15.5px] leading-[1.5]">
            Tu pourras en ajouter d'autres plus tard.
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-6">
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

        <div className={cn('mt-auto flex flex-col gap-3 pt-8')}>
          <Button type="submit" disabled={name.trim().length === 0 || create.isPending}>
            {create.isPending ? 'On installe ta réserve…' : 'Continuer'}
          </Button>
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

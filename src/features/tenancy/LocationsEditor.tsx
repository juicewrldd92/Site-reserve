import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'

import { CloseIcon, PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getSupabase } from '@/lib/supabase'

import { addLocation, dedupeLocations, locationKey, normalizeLocation } from './locations'
import { tenancyQueryKey } from './tenancyContext'
import { useTenancy } from './useTenancy'

/**
 * Emplacements de stockage, nommés librement.
 *
 * Un resto peut avoir trois frigos : « Frigo bar », « Frigo cuisine »,
 * « Frigo desserts ». Les imposer par une liste fermée rendrait l'app
 * inutilisable pour la moitié des cuisines.
 *
 * Renommer un emplacement renomme aussi les lignes de stock qui le portent :
 * sinon les produits se retrouveraient orphelins, dans une zone qui n'existe
 * plus.
 */
export function LocationsEditor() {
  const queryClient = useQueryClient()
  const { current, role } = useTenancy()

  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameTo, setRenameTo] = useState('')

  const canManage = role === 'owner' || role === 'manager'
  const locations = current?.locations ?? []

  const persist = useMutation({
    mutationFn: async (next: string[]) => {
      if (!current) throw new Error('Aucun établissement sélectionné.')
      const { error } = await getSupabase()
        .from('establishments')
        .update({ locations: next })
        .eq('id', current.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenancyQueryKey }),
  })

  const rename = useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      if (!current) throw new Error('Aucun établissement sélectionné.')
      if (locationKey(to) !== locationKey(from) &&
          locations.some((l) => locationKey(l) === locationKey(to))) {
        throw new Error('Un emplacement porte déjà ce nom.')
      }
      const supabase = getSupabase()

      // Les lignes de stock d'abord : si la seconde requête échoue, on préfère
      // un emplacement en double à des produits pointant vers le néant.
      const moved = await supabase
        .from('stock_items')
        .update({ location: normalizeLocation(to) })
        .eq('establishment_id', current.id)
        .eq('location', from)
      if (moved.error) throw new Error(moved.error.message)

      const next = dedupeLocations(locations.map((l) => (l === from ? to : l)))
      const saved = await supabase
        .from('establishments')
        .update({ locations: next })
        .eq('id', current.id)
      if (saved.error) throw new Error(saved.error.message)
    },
    onSuccess: async () => {
      setRenaming(null)
      setRenameTo('')
      await queryClient.invalidateQueries({ queryKey: tenancyQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
  })

  function add(event: FormEvent) {
    event.preventDefault()
    const next = addLocation(locations, draft)
    // `addLocation` renvoie la liste inchangée si l'emplacement existe déjà,
    // même écrit avec une autre casse ou d'autres accents.
    if (next.length === locations.length) {
      setDraft('')
      return
    }
    persist.mutate(dedupeLocations(next))
    setDraft('')
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-bold">Emplacements</h2>
        <span className="text-ink-muted text-[12.5px] font-semibold">
          {locations.length}
        </span>
      </div>

      <Card className="flex flex-col p-1.5">
        {locations.length === 0 && (
          <p className="text-ink-muted p-3 text-[13.5px]">
            Aucun emplacement. Ajoute « Frigo cuisine », « Congélo », « Réserve sèche »…
          </p>
        )}

        {locations.map((location, index) => (
          <div key={location}>
            {index > 0 && <div className="mx-2.5 h-px bg-[rgb(26_26_26/0.06)]" />}

            {renaming === location ? (
              <div className="flex items-center gap-2 p-2.5">
                <input
                  autoFocus
                  value={renameTo}
                  maxLength={60}
                  onChange={(e) => setRenameTo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameTo.trim().length > 0) {
                      rename.mutate({ from: location, to: renameTo.trim() })
                    }
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                  className="bg-chip flex-1 rounded-full px-3.5 py-2 text-[14px] font-semibold outline-none"
                  aria-label={`Nouveau nom pour ${location}`}
                />
                <button
                  type="button"
                  disabled={renameTo.trim().length === 0 || rename.isPending}
                  onClick={() => rename.mutate({ from: location, to: renameTo.trim() })}
                  className="text-corail text-[13px] font-bold disabled:opacity-40"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(null)}
                  className="text-ink-faint text-[13px] font-bold"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2.5">
                <span className="bg-corail-tint text-corail-ink flex-1 truncate rounded-full px-3.5 py-2 text-[14px] font-semibold">
                  {location}
                </span>
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRenaming(location)
                        setRenameTo(location)
                      }}
                      className="text-ink-muted flex-none text-[13px] font-bold"
                    >
                      Renommer
                    </button>
                    <button
                      type="button"
                      aria-label={`Supprimer ${location}`}
                      onClick={() =>
                        persist.mutate(locations.filter((l) => l !== location))
                      }
                      className="text-ink-faint flex-none"
                    >
                      <CloseIcon size={15} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </Card>

      {canManage && (
        <form onSubmit={add} className="flex items-center gap-2">
          <input
            value={draft}
            maxLength={60}
            placeholder="Frigo bar, Cave, Économat…"
            onChange={(e) => setDraft(e.target.value)}
            className="bg-surface shadow-card placeholder:text-ink-faint flex-1 rounded-full px-4 py-3 text-[14.5px] font-semibold outline-none"
            aria-label="Nom du nouvel emplacement"
          />
          <Button
            type="submit"
            size="md"
            block={false}
            disabled={draft.trim().length === 0 || persist.isPending}
            className="px-5"
          >
            <PlusIcon size={17} strokeWidth={2} />
            Ajouter
          </Button>
        </form>
      )}

      {(persist.isError || rename.isError) && (
        <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-[13px] font-semibold">
          {(persist.error ?? rename.error)?.message}
        </p>
      )}

      <p className="text-ink-muted text-[12.5px] leading-relaxed">
        Renommer un emplacement déplace aussi les produits qui s'y trouvent. Le
        supprimer ne les efface pas : ils restent en stock, sans emplacement.
      </p>
    </section>
  )
}

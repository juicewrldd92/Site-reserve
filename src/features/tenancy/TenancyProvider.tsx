import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { useAuth } from '@/features/auth/useAuth'
import type { MemberRole } from '@/lib/database.types'
import { getSupabase } from '@/lib/supabase'

import {
  CURRENT_ESTABLISHMENT_STORAGE_KEY,
  TenancyContext,
  tenancyQueryKey,
  type TenancyValue,
} from './tenancyContext'

async function fetchTenancy() {
  const supabase = getSupabase()

  // Une invitation en attente devient un membership à la première connexion.
  // Idempotent, donc sans risque à chaque chargement ; un échec ne doit pas
  // empêcher quelqu'un qui a déjà ses accès d'entrer.
  const claimed = await supabase.rpc('claim_invitations', {})
  if (claimed.error) console.warn('Invitations non réclamées :', claimed.error.message)

  const [memberships, organizations, establishments] = await Promise.all([
    supabase.from('memberships').select('*'),
    supabase.from('organizations').select('*'),
    supabase.from('establishments').select('*').order('name'),
  ])

  const failed = [memberships.error, organizations.error, establishments.error].find(Boolean)
  if (failed) throw new Error(failed.message)

  return {
    memberships: memberships.data ?? [],
    organizations: organizations.data ?? [],
    establishments: establishments.data ?? [],
  }
}

export function TenancyProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const [storedId, setStoredId] = useState<string | null>(() =>
    localStorage.getItem(CURRENT_ESTABLISHMENT_STORAGE_KEY),
  )

  const query = useQuery({
    queryKey: [...tenancyQueryKey, user?.id],
    queryFn: fetchTenancy,
    enabled: status === 'authenticated',
  })

  const setCurrentId = useCallback((id: string) => {
    localStorage.setItem(CURRENT_ESTABLISHMENT_STORAGE_KEY, id)
    setStoredId(id)
  }, [])

  const value = useMemo<TenancyValue>(() => {
    const establishments = query.data?.establishments ?? []
    const memberships = query.data?.memberships ?? []

    // L'établissement mémorisé peut avoir disparu (accès retiré, suppression).
    const current =
      establishments.find((e) => e.id === storedId) ?? establishments[0] ?? null

    const role =
      current === null
        ? null
        : (memberships
            .filter(
              (m) =>
                m.org_id === current.org_id &&
                (m.establishment_id === null || m.establishment_id === current.id),
            )
            .sort((a, b) => rank(a.role) - rank(b.role))[0]?.role ?? null)

    return {
      isLoading: status === 'loading' || (status === 'authenticated' && query.isPending),
      error: query.error,
      needsOnboarding: query.isSuccess && memberships.length === 0,
      organizations: query.data?.organizations ?? [],
      establishments,
      memberships,
      current,
      role,
      setCurrentId,
      refetch: () => void query.refetch(),
    }
  }, [query, setCurrentId, status, storedId])

  return <TenancyContext value={value}>{children}</TenancyContext>
}

function rank(role: MemberRole): number {
  return role === 'owner' ? 0 : role === 'manager' ? 1 : 2
}

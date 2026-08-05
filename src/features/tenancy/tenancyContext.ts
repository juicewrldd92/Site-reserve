import { createContext } from 'react'

import type {
  EstablishmentRow,
  MemberRole,
  MembershipRow,
  OrganizationRow,
} from '@/lib/database.types'

export type TenancyValue = {
  isLoading: boolean
  error: Error | null
  /** Aucun membership : l'utilisateur doit passer par l'onboarding. */
  needsOnboarding: boolean
  organizations: OrganizationRow[]
  establishments: EstablishmentRow[]
  memberships: MembershipRow[]
  current: EstablishmentRow | null
  /** Rôle de l'utilisateur sur l'établissement courant. */
  role: MemberRole | null
  setCurrentId: (id: string) => void
  refetch: () => void
}

export const TenancyContext = createContext<TenancyValue | null>(null)

export const tenancyQueryKey = ['tenancy'] as const

export const CURRENT_ESTABLISHMENT_STORAGE_KEY = 'reserve.establishment_id'

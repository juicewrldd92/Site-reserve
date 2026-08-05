import type { Session, User } from '@supabase/supabase-js'
import { createContext } from 'react'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'unconfigured'

export type AuthValue = {
  status: AuthStatus
  session: Session | null
  user: User | null
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

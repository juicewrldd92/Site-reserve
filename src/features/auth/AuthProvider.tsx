import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

import { AuthContext, type AuthStatus, type AuthValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const supabase = getSupabase()

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthValue>(() => {
    const status: AuthStatus = !isSupabaseConfigured
      ? 'unconfigured'
      : !ready
        ? 'loading'
        : session
          ? 'authenticated'
          : 'anonymous'

    return {
      status,
      session,
      user: session?.user ?? null,
      signOut: async () => {
        if (isSupabaseConfigured) await getSupabase().auth.signOut()
        setSession(null)
      },
    }
  }, [ready, session])

  return <AuthContext value={value}>{children}</AuthContext>
}

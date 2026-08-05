import { use } from 'react'

import { AuthContext, type AuthValue } from './authContext'

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return value
}

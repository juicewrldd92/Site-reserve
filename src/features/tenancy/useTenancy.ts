import { use } from 'react'

import { TenancyContext, type TenancyValue } from './tenancyContext'

export function useTenancy(): TenancyValue {
  const value = use(TenancyContext)
  if (!value) throw new Error('useTenancy doit être utilisé dans <TenancyProvider>')
  return value
}

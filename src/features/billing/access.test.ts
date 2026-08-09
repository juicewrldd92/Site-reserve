/**
 * Tests des droits d'écriture — `npm test`.
 *
 * Cette logique décide qui peut encore travailler dans l'app : elle doit
 * refléter exactement `org_can_write` en base (migration 0015).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { OrganizationRow } from '../../lib/database.types.ts'
import { readAccess } from './access.ts'

const NOW = new Date('2026-08-09T12:00:00Z')

function org(patch: Partial<OrganizationRow>): OrganizationRow {
  return {
    id: 'o1',
    name: 'Chez marcoo',
    owner_id: 'u1',
    created_at: '2026-08-01T00:00:00Z',
    trial_ends_at: '2026-08-15T00:00:00Z',
    subscription_status: 'trialing',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
    ...patch,
  }
}

test('pendant l’essai, on écrit', () => {
  const access = readAccess(org({}), NOW)
  assert.equal(access.canWrite, true)
  assert.equal(access.phase, 'trial')
  assert.equal(access.daysLeft, 6)
})

test('essai expiré : plus d’écriture', () => {
  const access = readAccess(org({ trial_ends_at: '2026-08-01T00:00:00Z' }), NOW)
  assert.equal(access.canWrite, false)
  assert.equal(access.phase, 'expired')
})

test('abonné : on écrit tant que la période court', () => {
  const access = readAccess(
    org({ subscription_status: 'active', current_period_end: '2026-09-01T00:00:00Z' }),
    NOW,
  )
  assert.equal(access.canWrite, true)
  assert.equal(access.phase, 'subscribed')
})

test('période payée dépassée : la porte se ferme', () => {
  // Le webhook aurait dû basculer en `canceled` ; s'il a échoué, la date fait foi.
  const access = readAccess(
    org({ subscription_status: 'active', current_period_end: '2026-08-01T00:00:00Z' }),
    NOW,
  )
  assert.equal(access.canWrite, false)
})

test('prélèvement en échec : on prévient sans couper', () => {
  // Stripe relance pendant plusieurs jours. Fermer la cuisine le matin même
  // d'un rejet bancaire ferait perdre le client plutôt que le paiement.
  const access = readAccess(
    org({ subscription_status: 'past_due', current_period_end: '2026-09-01T00:00:00Z' }),
    NOW,
  )
  assert.equal(access.canWrite, true)
  assert.equal(access.phase, 'grace')
})

test('résilié : plus d’écriture, même si l’essai courait encore', () => {
  const access = readAccess(org({ subscription_status: 'canceled' }), NOW)
  assert.equal(access.canWrite, false)
})

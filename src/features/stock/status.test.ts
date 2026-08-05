/**
 * Tests du calcul de statut — `node --test src/features/stock/status.test.ts`
 * (ou `npm test`). Node lit le TypeScript directement, pas de runner à installer.
 *
 * C'est la logique qui pilote toutes les pastilles de l'app et l'écran
 * d'alertes : elle mérite d'être vérifiée plutôt que supposée.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  daysUntil,
  expiryPhrase,
  stockBadge,
  stockStatus,
  suggestedOrderQuantity,
} from './status.ts'

const TODAY = new Date(2026, 7, 4) // 4 août 2026

/** Date ISO à N jours d'aujourd'hui. */
function iso(offsetDays: number): string {
  const d = new Date(2026, 7, 4 + offsetDays)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function item(
  quantity: number,
  min_threshold: number | null,
  next_expiry: string | null,
  alert_lead_days: number | null = null,
) {
  return { quantity, min_threshold, next_expiry, alert_lead_days }
}

test('daysUntil compte en jours calendaires', () => {
  assert.equal(daysUntil(iso(0), TODAY), 0)
  assert.equal(daysUntil(iso(1), TODAY), 1)
  assert.equal(daysUntil(iso(-1), TODAY), -1)
})

test('la priorité des statuts : le bloquant passe devant le préventif', () => {
  assert.equal(stockStatus(item(0, 5, iso(-2)), 5, TODAY), 'expired')
  assert.equal(stockStatus(item(0, 5, null), 5, TODAY), 'out')
  // Périmable ET sous le seuil : c'est la date qui demande une action.
  assert.equal(stockStatus(item(1, 4, iso(2)), 5, TODAY), 'expiring')
  assert.equal(stockStatus(item(2, 4, null), 5, TODAY), 'low')
  assert.equal(stockStatus(item(12, null, null), 5, TODAY), 'ok')
})

test('le seuil de stock bas est inclusif', () => {
  assert.equal(stockStatus(item(4, 4, null), 5, TODAY), 'low')
  assert.equal(stockStatus(item(5, 4, null), 5, TODAY), 'ok')
})

test('le nombre de jours avant DLC est réglable par établissement', () => {
  assert.equal(stockStatus(item(5, null, iso(3)), 5, TODAY), 'expiring')
  assert.equal(stockStatus(item(5, null, iso(3)), 2, TODAY), 'ok')
  assert.equal(stockStatus(item(5, null, iso(9)), 10, TODAY), 'expiring')
})

test('les pastilles disent la bonne couleur', () => {
  assert.deepEqual(stockBadge(item(3, null, iso(-1)), 5, TODAY), {
    tone: 'alert',
    label: 'Périmé',
  })
  // Aujourd'hui ou demain, c'est rouge : ça se cuisine maintenant.
  assert.deepEqual(stockBadge(item(3, null, iso(0)), 5, TODAY), {
    tone: 'alert',
    label: "DLC aujourd'hui",
  })
  assert.deepEqual(stockBadge(item(3, null, iso(1)), 5, TODAY), {
    tone: 'alert',
    label: 'DLC J-1',
  })
  assert.deepEqual(stockBadge(item(3, null, iso(3)), 5, TODAY), {
    tone: 'warn',
    label: 'DLC J-3',
  })
  assert.deepEqual(stockBadge(item(0, null, null), 5, TODAY), {
    tone: 'alert',
    label: 'Rupture',
  })
  assert.deepEqual(stockBadge(item(2, 4, null), 5, TODAY), {
    tone: 'warn',
    label: 'Stock bas',
  })
  assert.deepEqual(stockBadge(item(9, 4, null), 5, TODAY), {
    tone: 'ok',
    label: 'En stock',
  })
})

test('les phrases de DLC parlent français', () => {
  assert.equal(expiryPhrase(iso(-3), TODAY), 'Périmé depuis 3 jours')
  assert.equal(expiryPhrase(iso(-1), TODAY), 'Périmé depuis hier')
  assert.equal(expiryPhrase(iso(0), TODAY), "Périme aujourd'hui")
  assert.equal(expiryPhrase(iso(1), TODAY), 'Demain')
  assert.equal(expiryPhrase(iso(4), TODAY), 'Dans 4 jours')
})

test('le délai réglé sur le produit prime sur celui de l’établissement', () => {
  // L'établissement prévient à 5 jours, ce produit à 1 seul.
  assert.equal(stockStatus(item(5, null, iso(3), 1), 5, TODAY), 'ok')
  // À l'inverse, un produit surveillé de loin alerte plus tôt.
  assert.equal(stockStatus(item(5, null, iso(20), 30), 5, TODAY), 'expiring')
  // Sans réglage produit, on suit l'établissement.
  assert.equal(stockStatus(item(5, null, iso(3), null), 5, TODAY), 'expiring')
})

test('la quantité suggérée vise le stock optimal', () => {
  // Le cas du cahier des charges : stock 3, optimal 12 → commander 9.
  assert.equal(
    suggestedOrderQuantity({ quantity: 3, min_threshold: 5, target_quantity: 12 }),
    9,
  )
  // Déjà au niveau : rien à commander.
  assert.equal(
    suggestedOrderQuantity({ quantity: 12, min_threshold: 5, target_quantity: 12 }),
    0,
  )
  // Les fractions sont arrondies au-dessus : on ne commande pas 8,4 sacs.
  assert.equal(
    suggestedOrderQuantity({ quantity: 3.6, min_threshold: 5, target_quantity: 12 }),
    9,
  )
  // Sans optimal, on retombe sur le double du seuil (comportement historique).
  assert.equal(
    suggestedOrderQuantity({ quantity: 2, min_threshold: 5, target_quantity: null }),
    8,
  )
})

/**
 * Tests de normalisation des emplacements — `npm test`.
 *
 * Deux « Réserve sèche » visuellement identiques mais encodés différemment ont
 * réellement coexisté en base : le stock s'était réparti entre les deux. Ces
 * tests verrouillent le comportement.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { addLocation, dedupeLocations, locationKey, normalizeLocation } from './locations.ts'

/** « Réserve sèche » avec accents combinants, comme certains claviers Mac. */
const DECOMPOSED = 'Réserve sèche'.normalize('NFD')
const COMPOSED = 'Réserve sèche'

test('les deux écritures Unicode se rejoignent', () => {
  assert.notEqual(DECOMPOSED, COMPOSED, 'les deux formes doivent bien différer au départ')
  assert.equal(normalizeLocation(DECOMPOSED), COMPOSED)
  assert.equal(locationKey(DECOMPOSED), locationKey(COMPOSED))
})

test('les espaces superflus sont resserrés', () => {
  assert.equal(normalizeLocation('  Frigo   bar  '), 'Frigo bar')
})

test('un doublon n’est pas ajouté deux fois', () => {
  const start = [COMPOSED]
  assert.deepEqual(addLocation(start, DECOMPOSED), [COMPOSED])
  assert.deepEqual(addLocation(start, 'réserve sèche'), [COMPOSED])
  assert.deepEqual(addLocation(start, 'RESERVE SECHE'), [COMPOSED])
})

test('un emplacement réellement nouveau est ajouté', () => {
  assert.deepEqual(addLocation(['Frigo'], 'Congélo'), ['Frigo', 'Congélo'])
})

test('un nom vide est ignoré', () => {
  assert.deepEqual(addLocation(['Frigo'], '   '), ['Frigo'])
})

test('une liste existante se nettoie en gardant la première forme', () => {
  const messy = ['Frigo', DECOMPOSED, COMPOSED, 'frigo', 'Congélo']
  assert.deepEqual(dedupeLocations(messy), ['Frigo', COMPOSED, 'Congélo'])
})

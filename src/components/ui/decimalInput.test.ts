/**
 * Tests de la saisie décimale — `npm test`.
 *
 * C'est le geste le plus fréquent de l'app : entrer une quantité. Un clavier
 * français produit une virgule, il faut qu'elle passe.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { clean, format, parse } from './decimal.ts'

test('la virgule est acceptée', () => {
  assert.equal(parse('1,5'), 1.5)
  assert.equal(parse('0,25'), 0.25)
})

test('le point reste accepté', () => {
  // Un clavier de portable, un copier-coller : les deux formes arrivent.
  assert.equal(parse('1.5'), 1.5)
})

test('les lettres sont écartées à la saisie', () => {
  assert.equal(clean('12a,5kg'), '12,5')
})

test('un seul séparateur survit', () => {
  // « 1,5,3 » n'est pas un nombre : on garde la première virgule.
  assert.equal(clean('1,5,3'), '1,53')
  assert.equal(clean('1.5.3'), '1.53')
})

test('une saisie en cours reste intacte', () => {
  // Taper « 1, » ne doit pas voir la virgule disparaître sous les doigts.
  assert.equal(clean('1,'), '1,')
  assert.equal(parse('1,'), 1)
})

test('un champ vide ne vaut pas zéro', () => {
  // Effacer pour retaper ne doit pas écrire 0 en base au passage.
  assert.equal(parse(''), null)
  assert.equal(parse('   '), null)
})

test('l’affichage est à la française', () => {
  assert.equal(format(1.5), '1,5')
  assert.equal(format(3), '3')
})

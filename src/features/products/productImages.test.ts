/**
 * Tests de la vignette devinée — `npm test`.
 *
 * L'ordre des règles est la seule chose fragile ici : « sauce tomate » doit
 * recevoir la tomate, pas autre chose.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { guessProductImage } from './productImages.ts'

test('les produits courants sont reconnus', () => {
  assert.equal(guessProductImage('Tomates San Marzano'), '/photos/tomates.jpg')
  assert.equal(guessProductImage('Mozzarella di bufala'), '/photos/mozzarella.jpg')
  assert.equal(guessProductImage('Basilic frais'), '/photos/basilic.jpg')
  assert.equal(guessProductImage('Farine T65'), '/photos/farine.jpg')
})

test('les accents et la casse n’empêchent rien', () => {
  assert.equal(guessProductImage('CRÈME FRAÎCHE ÉPAISSE'), '/photos/creme.jpg')
  assert.equal(guessProductImage('creme fraiche'), '/photos/creme.jpg')
})

test('la spécificité prime sur la généralité', () => {
  // « Sauce tomate » contient « tomate » : c'est la tomate qui doit gagner,
  // et non une règle plus large placée avant.
  assert.equal(guessProductImage('Sauce tomate maison'), '/photos/tomates.jpg')
  // « Crème de gruyère » : le fromage est plus discriminant que la crème.
  assert.equal(guessProductImage('Crème de gruyère'), '/photos/mozzarella.jpg')
})

test('un produit inconnu ne reçoit rien', () => {
  // Mieux vaut un aplat qu'une photo qui ment sur le contenu.
  assert.equal(guessProductImage('Vis inox M6'), null)
  assert.equal(guessProductImage(''), null)
})

test('les pâtes et féculents tombent sur la même vignette', () => {
  assert.equal(guessProductImage('Spaghetti n°5'), '/photos/farine.jpg')
  assert.equal(guessProductImage('Riz arborio'), '/photos/farine.jpg')
})

/**
 * Tests de lecture de ticket — `npm test`.
 *
 * C'est la partie la plus fragile de la fonctionnalité : la reconnaissance de
 * texte rend du bruit, et c'est ce parseur qui décide de ce qu'on propose à
 * l'utilisateur. Il mérite d'être vérifié sur de vrais formats de tickets.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { matchProduct, parseReceipt } from './parseReceipt.ts'

/** Ticket type d'une enseigne française, tel que l'OCR le rendrait. */
const TICKET = `
MONOPRIX
12 RUE DE LA REPUBLIQUE
Tel 04 78 00 00 00

TOMATE GRAPPE            2,49
2 x BQT BASILIC          3,80
LAIT DEMI ECREME 1L      1,15
0,850 kg x 8,90
FILET DE POULET          7,57
BOITE CONSERVE THON      2,00

SOUS-TOTAL              17,01
TVA 5,5%                 0,89
TOTAL                   17,01
CARTE BANCAIRE          17,01
Merci de votre visite
`

test('les lignes de produit sont extraites, le bruit administratif écarté', () => {
  const lines = parseReceipt(TICKET)
  const labels = lines.map((l) => l.label)

  assert.ok(labels.includes('Tomate grappe'))
  assert.ok(labels.includes('Bqt basilic'))
  assert.ok(labels.includes('Lait demi ecreme 1l'))
  assert.ok(labels.includes('Filet de poulet'))

  for (const noise of ['Sous-total', 'Tva 5,5%', 'Total', 'Carte bancaire']) {
    assert.ok(!labels.includes(noise), `« ${noise} » ne devrait pas être un produit`)
  }
})

test('la quantité en tête de ligne est lue', () => {
  const [line] = parseReceipt('2 x BQT BASILIC          3,80')
  assert.equal(line?.quantity, 2)
  assert.equal(line?.label, 'Bqt basilic')
})

test('un produit pesé donne son poids comme quantité', () => {
  const [line] = parseReceipt('POMMES 0,850 kg x 8,90     7,57')
  assert.equal(line?.quantity, 0.85)
  assert.equal(line?.label, 'Pommes')
})

test('sans quantité explicite, on compte 1', () => {
  const [line] = parseReceipt('TOMATE GRAPPE            2,49')
  assert.equal(line?.quantity, 1)
})

test('les lignes sans prix ne sont pas des achats', () => {
  assert.equal(parseReceipt('MONOPRIX\nTel 04 78 00 00 00').length, 0)
})

test('le point décimal et le symbole euro sont acceptés', () => {
  const lines = parseReceipt('HUILE OLIVE 12.50 €\nBEURRE DOUX  3,20€')
  assert.equal(lines.length, 2)
  assert.equal(lines[0]?.price, 12.5)
  assert.equal(lines[1]?.price, 3.2)
})

test('le libellé crié revient en casse de phrase', () => {
  const [line] = parseReceipt('CREME LIQUIDE ENTIERE    2,10')
  assert.equal(line?.label, 'Creme liquide entiere')
})

test('une ligne sans lettre est ignorée', () => {
  assert.equal(parseReceipt('**** 12,00').length, 0)
})

const CATALOGUE = [
  { id: '1', name: 'Basilic frais' },
  { id: '2', name: 'Tomates San Marzano' },
  { id: '3', name: 'Filet de poulet fermier' },
]

test('un libellé de ticket retrouve son produit au catalogue', () => {
  assert.equal(matchProduct('Filet de poulet', CATALOGUE)?.id, '3')
  assert.equal(matchProduct('FILET DE POULET', CATALOGUE)?.id, '3')
})

test('les accents et la casse n’empêchent pas le rapprochement', () => {
  assert.equal(matchProduct('tomates san marzano', CATALOGUE)?.id, '2')
})

test('en cas de doute, on ne rattache rien', () => {
  // Mieux vaut proposer une création que fausser le stock d'un autre produit.
  assert.equal(matchProduct('Lait demi écrémé', CATALOGUE), null)
  assert.equal(matchProduct('Bqt', CATALOGUE), null)
})

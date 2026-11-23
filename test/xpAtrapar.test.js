import test from 'node:test'
import assert from 'node:assert'
import { xpAlDerrotar, xpAlAtrapar } from '../src/lib/xpAtrapar.js'

test('derrotar: 200 x nivel x SR, con SR fraccionario', () => {
  assert.strictEqual(xpAlDerrotar(20, '13'), 52000)
  assert.strictEqual(xpAlDerrotar(5, '1/4'), 250)
})

test('atrapar da 1/5 de la experiencia normal', () => {
  assert.strictEqual(xpAlAtrapar(20, '13'), 10400)
  assert.strictEqual(xpAlAtrapar(5, '1/4'), 50)
})

test('sin SR o nivel calculables no hay cifra', () => {
  for (const [lvl, sr] of [[5, 'Varies'], [5, ''], [0, '1'], [null, '2'], [5, '0']]) {
    assert.strictEqual(xpAlDerrotar(lvl, sr), null)
    assert.strictEqual(xpAlAtrapar(lvl, sr), null)
  }
})

import test from 'node:test'
import assert from 'node:assert'
import { relacionContra, danoTrasRelacion, textoRelacion, aplicaStab } from '../src/lib/objetivos.js'

const grass = { resist: ['Water', 'Grass', 'Electric', 'Ground'], vuln: ['Fire', 'Ice', 'Poison', 'Flying', 'Bug'], immune: [] }
const ghost = { resist: ['Poison', 'Bug'], vuln: ['Ghost', 'Dark'], immune: ['Normal', 'Fighting'] }

test('relación según el tipo del ataque', () => {
  assert.strictEqual(relacionContra(grass, 'Fire'), 'vuln')
  assert.strictEqual(relacionContra(grass, 'water'), 'resist')
  assert.strictEqual(relacionContra(ghost, 'Normal'), 'immune')
  assert.strictEqual(relacionContra(grass, 'Rock'), 'neutral')
  assert.strictEqual(relacionContra(null, 'Fire'), 'neutral')
})

test('daño: ×2, ÷2 hacia abajo, 0', () => {
  assert.strictEqual(danoTrasRelacion(7, 'vuln'), 14)
  assert.strictEqual(danoTrasRelacion(7, 'resist'), 3)
  assert.strictEqual(danoTrasRelacion(7, 'immune'), 0)
  assert.strictEqual(danoTrasRelacion(7, 'neutral'), 7)
})

test('texto del chat solo si no es neutral', () => {
  assert.strictEqual(textoRelacion('Chespin', 'vuln', 'Fire', 7),
    'Chespin es vulnerable al ataque de tipo Fire: el daño es 14 (7 ×2)')
  assert.strictEqual(textoRelacion('Chespin', 'neutral', 'Rock', 7), null)
})

test('STAB con cualquiera de los tipos', () => {
  assert.strictEqual(aplicaStab('Fire', ['Fire', 'Flying']), true)
  assert.strictEqual(aplicaStab('flying', ['Fire', 'Flying']), true)
  assert.strictEqual(aplicaStab('Water', ['Fire', null]), false)
  assert.strictEqual(aplicaStab('', ['Fire']), false)
})

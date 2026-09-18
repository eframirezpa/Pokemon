import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statModPokemon, tieneFeat } from '../src/lib/trainerStats.js'

test('statModPokemon: modificador base, sin feats ni tope', () => {
  const d = { pokemon_level: 5, stats: { pokemon_dex: 14, pokemon_dex_bonus: 0 }, feats: [] }
  assert.equal(statModPokemon(d, 'dex'), 2)
})

test('statModPokemon: suma base + bonus de tabla + bonos de stat de los feats', () => {
  const d = {
    pokemon_level: 5,
    stats: { pokemon_dex: 14, pokemon_dex_bonus: 1 },
    feats: [{ bonos: [{ type: 'stat', llave: 'dex', value: 2 }] }],
  }
  assert.equal(statModPokemon(d, 'dex'), 3) // (14+1+2-10)/2 = 3.5 -> floor 3
})

test('statModPokemon: solo topa si hay feats (sin feats no hay tope que aplicar)', () => {
  const d = { pokemon_level: 5, stats: { pokemon_dex: 30, pokemon_dex_bonus: 0 }, feats: [] }
  assert.equal(statModPokemon(d, 'dex'), 10) // (30-10)/2, sin tope
})

test('statModPokemon: con feats, topa en 20 por debajo de nivel 20', () => {
  const d = {
    pokemon_level: 10,
    stats: { pokemon_dex: 19, pokemon_dex_bonus: 0 },
    feats: [{ bonos: [{ type: 'stat', llave: 'dex', value: 5 }] }],
  }
  // 19+5=24, topado a 20 por tener feats y ser < nivel 20
  assert.equal(statModPokemon(d, 'dex'), 5)
})

test('statModPokemon: con feats, el tope sube a 22 en nivel 20', () => {
  const d = {
    pokemon_level: 20,
    stats: { pokemon_dex: 19, pokemon_dex_bonus: 0 },
    feats: [{ bonos: [{ type: 'stat', llave: 'dex', value: 5 }] }],
  }
  assert.equal(statModPokemon(d, 'dex'), 6) // topado a 22
})

test('statModPokemon: sin datos no revienta', () => {
  assert.equal(statModPokemon({}, 'dex'), -5) // (0-10)/2
})

test('tieneFeat: compara por feat_name_id, no por el id numérico', () => {
  const feats = [{ feat_id: 1, feat_name_id: 'alert' }, { feat_id: 9, feat_name_id: 'tough' }]
  assert.equal(tieneFeat(feats, 'alert'), true)
  assert.equal(tieneFeat(feats, 'alert_p'), false)
})

test('tieneFeat: sin feats, o feats vacío/indefinido, no revienta', () => {
  assert.equal(tieneFeat([], 'alert'), false)
  assert.equal(tieneFeat(undefined, 'alert'), false)
  assert.equal(tieneFeat(null, 'alert'), false)
})

test('tieneFeat: no distingue mayúsculas en feat_name_id', () => {
  const feats = [{ feat_name_id: 'Alert_P' }]
  assert.equal(tieneFeat(feats, 'alert_p'), true)
})

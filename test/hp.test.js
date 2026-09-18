import { test } from 'node:test'
import assert from 'node:assert/strict'
import { healingBase, healingAtLevel, hpExtra, hpValues, pokemonCon, pokemonHpExtra, hitDiceMax } from '../src/lib/hp.js'

test('healingBase: número suelto es plano, "N per lvl" vale N a nivel 1', () => {
  assert.equal(healingBase(3), 3)
  assert.equal(healingBase('2 per lvl'), 2)
  assert.equal(healingBase(''), 0)
  assert.equal(healingBase(null), 0)
})

test('healingAtLevel: plano no escala, "per lvl" multiplica por el nivel', () => {
  assert.equal(healingAtLevel(3, 10), 3)
  assert.equal(healingAtLevel('2 per lvl', 5), 10)
  assert.equal(healingAtLevel('2 per lvl', 0), 2) // nivel mínimo 1, no 0
})

test('hpExtra: sin datos no revienta, da 0', () => {
  assert.equal(hpExtra(null), 0)
  assert.equal(hpExtra(undefined), 0)
})

test('hpExtra: modificador de CON cuenta por nivel', () => {
  const full = {
    personaje_level: 5,
    stats: { personaje_con: 14, personaje_con_bonus: 0 }, // mod +2
  }
  assert.equal(hpExtra(full), 10) // +2 * nivel 5
})

test('hpExtra: feat de stat CON se suma antes de sacar el modificador', () => {
  const full = {
    personaje_level: 4,
    stats: { personaje_con: 12, personaje_con_bonus: 0 }, // mod +1 solo
    extra_feats: [{ bonos: [{ type: 'stat', llave: 'con', value: 2 }] }], // total 14 → mod +2
  }
  assert.equal(hpExtra(full), 8) // +2 * nivel 4
})

test('hpExtra: healing "per lvl" de un feat se suma completo (no se hornea)', () => {
  const full = {
    personaje_level: 3,
    stats: { personaje_con: 10, personaje_con_bonus: 0 }, // mod 0
    extra_feats: [{ bonos: [{ type: 'healing', value: '2 per lvl' }] }],
  }
  assert.equal(hpExtra(full), 6) // 0 de CON + 2*3 de healing
})

test('hpExtra: healing de origen/background solo repone lo que falta por nivel (ya se horneó nivel 1)', () => {
  const full = {
    personaje_level: 3,
    stats: { personaje_con: 10, personaje_con_bonus: 0 },
    origin_feat: { bonos: [{ type: 'healing', llave: 'hp', value: '2 per lvl' }] },
  }
  // a nivel 3 el bono completo vale 6; la creación ya horneó 2 (nivel 1); falta reponer 4
  assert.equal(hpExtra(full), 4)
})

test('hpExtra: healing de background con llave distinta de "hp" no cuenta (no es lo que hornea el wizard)', () => {
  const full = {
    personaje_level: 5,
    stats: { personaje_con: 10, personaje_con_bonus: 0 },
    background_feat: { bonos: [{ type: 'healing', llave: 'otra-cosa', value: '2 per lvl' }] },
  }
  assert.equal(hpExtra(full), 0)
})

test('hpValues: max es la base guardada más el extra; cur cae al max si no hay valor guardado', () => {
  const full = {
    personaje_hp: 20, personaje_level: 1,
    stats: { personaje_con: 10, personaje_con_bonus: 0 },
  }
  assert.deepEqual(hpValues(full), { max: 20, cur: 20 })
})

test('hpValues: cur respeta el HP actual guardado, aunque sea distinto del máximo', () => {
  const full = {
    personaje_hp: 20, personaje_current_hp: 5, personaje_level: 1,
    stats: { personaje_con: 10, personaje_con_bonus: 0 },
  }
  assert.deepEqual(hpValues(full), { max: 20, cur: 5 })
})

test('pokemonCon: suma base + bonus de tabla + bonos de stat de los feats', () => {
  const stats = { pokemon_con: 14, pokemon_con_bonus: 1 }
  const feats = [{ bonos: [{ type: 'stat', llave: 'con', value: 2 }] }]
  assert.equal(pokemonCon(stats, feats), 17)
})

test('pokemonHpExtra: un CON bajo (modificador negativo) no resta vida, el piso es 0', () => {
  const extra = pokemonHpExtra({ stats: { pokemon_con: 1, pokemon_con_bonus: 0 }, feats: [], level: 10 })
  assert.equal(extra, 0)
})

test('pokemonHpExtra: modificador positivo escala con el nivel más el healing de feats', () => {
  const extra = pokemonHpExtra({
    stats: { pokemon_con: 14, pokemon_con_bonus: 0 }, // mod +2
    feats: [{ bonos: [{ type: 'healing', value: '1 per lvl' }] }],
    level: 4,
  })
  assert.equal(extra, 12) // (2*4) de CON + (1*4) de healing
})

test('hitDiceMax: extrae el número del texto del pokédex', () => {
  assert.equal(hitDiceMax('d10'), 10)
  assert.equal(hitDiceMax('d6'), 6)
  assert.equal(hitDiceMax(''), 0)
  assert.equal(hitDiceMax(undefined), 0)
})

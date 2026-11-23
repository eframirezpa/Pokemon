import test from 'node:test'
import assert from 'node:assert'
import { usaMunicion, dadosArma, tiradaArma, danoArma } from '../src/lib/armaDano.js'

const shortbow = { weapon_type_damage_dice: '1d6', weapon_type_property_1: '1', weapon_type_property_2: '11' }
const greatsword = { weapon_type_damage_dice: '2d6', weapon_type_property_1: '4', weapon_type_property_2: '11' }
const blowgun = { weapon_type_damage_dice: '1', weapon_type_property_1: 1, weapon_type_property_2: 6 }
const net = { weapon_type_damage_dice: 'Special', weapon_type_property_1: '9' }

test('munición: solo armas con la propiedad Ammunition', () => {
  assert.strictEqual(usaMunicion(shortbow), true)
  assert.strictEqual(usaMunicion(blowgun), true)
  assert.strictEqual(usaMunicion(greatsword), false)
  assert.strictEqual(usaMunicion(null), false)
})

test('dados del arma', () => {
  assert.deepStrictEqual(dadosArma(greatsword), { tipo: 'dados', n: 2, caras: 6 })
  assert.deepStrictEqual(dadosArma(blowgun), { tipo: 'fijo', valor: 1 })
  assert.strictEqual(dadosArma(net), null)
})

test('crítico duplica los dados, no el modificador', () => {
  assert.deepStrictEqual(tiradaArma(dadosArma(greatsword), true), { notacion: '4d6', min: 4, max: 24 })
  const d = danoArma(dadosArma(greatsword), { valor: '20', mod: 3, critico: true })
  assert.strictEqual(d.total, 23)
})

test('daño: valor fuera de rango o vacío no cuenta', () => {
  const dados = dadosArma(shortbow)
  assert.strictEqual(danoArma(dados, { valor: '', mod: 2 }), null)
  assert.strictEqual(danoArma(dados, { valor: '7', mod: 2 }), null)
  assert.strictEqual(danoArma(dados, { valor: '4', mod: 2 }).total, 6)
})

test('daño fijo y nunca negativo', () => {
  assert.strictEqual(danoArma(dadosArma(blowgun), { mod: 2 }).total, 3)
  assert.strictEqual(danoArma(dadosArma(blowgun), { mod: -3 }).total, 0)
})

import { statDeArma, esArmaDeRango, GOLPE_SIN_ARMA } from '../src/lib/armaDano.js'

const stats = (str, dex) => [
  { key: 'STR', valor: str, mod: Math.floor((str - 10) / 2) },
  { key: 'DEX', valor: dex, mod: Math.floor((dex - 10) / 2) },
]

test('stat del ataque: rango DEX, cuerpo a cuerpo STR, sin arma STR', () => {
  const arco = { weapon_type_dnd_category: 'Martial Ranged Weapons' }
  const hacha = { weapon_type_dnd_category: 'Martial Melee Weapons', weapon_type_property_1: 12 }
  assert.strictEqual(esArmaDeRango(arco), true)
  assert.strictEqual(statDeArma(arco, stats(16, 12)).key, 'DEX')
  assert.strictEqual(statDeArma(hacha, stats(10, 18)).key, 'STR')
  assert.strictEqual(statDeArma(null, stats(8, 18)).key, 'STR')
})

test('Finesse: el mayor entre STR y DEX; empate STR', () => {
  const daga = { weapon_type_dnd_category: 'Simple Melee Weapons', weapon_type_property_1: 3, weapon_type_property_2: 5 }
  assert.strictEqual(statDeArma(daga, stats(10, 16)).key, 'DEX')
  assert.strictEqual(statDeArma(daga, stats(16, 10)).key, 'STR')
  assert.strictEqual(statDeArma(daga, stats(14, 14)).key, 'STR')
})

test('sin arma: 1 + STR, sin dados (el crítico no lo dobla)', () => {
  assert.deepStrictEqual(danoArma(GOLPE_SIN_ARMA, { mod: 3, critico: true }), { total: 4, dados: 1, mod: 3, notacion: '1' })
})

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

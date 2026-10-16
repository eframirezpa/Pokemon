import test from 'node:test'
import assert from 'node:assert'
import { tieneDano, esCuracion, dadosPorNivel, parseDados, tirada, modificadorDano, usaPower, reglaRonda, rondaValida, magnitudDe, esFling, danoFling } from '../src/lib/danoMove.js'

const fang = {
  move_has_damage: 1, move_damage_type: 'Fire', move_damage_modifier: 'MOVE',
  move_damage_level_1: '1d10', move_damage_level_5: '2d8', move_damage_level_10: '5d4', move_damage_level_17: '4d8',
}

test('ventana solo con move_has_damage = 1', () => {
  assert.ok(tieneDano(fang))
  assert.ok(!tieneDano({ ...fang, move_has_damage: 0 }))
  assert.ok(esCuracion({ move_damage_type: 'Healing' }))
})

test('dados según el nivel', () => {
  assert.strictEqual(dadosPorNivel(fang, 1), '1d10')
  assert.strictEqual(dadosPorNivel(fang, 4), '1d10')
  assert.strictEqual(dadosPorNivel(fang, 5), '2d8')
  assert.strictEqual(dadosPorNivel(fang, 16), '5d4')
  assert.strictEqual(dadosPorNivel(fang, 17), '4d8')
})

test('formatos de dados de la tabla', () => {
  assert.deepStrictEqual(parseDados('2d8'), { tipo: 'dados', n: 2, caras: 8 })
  assert.deepStrictEqual(parseDados('16'), { tipo: 'fijo', valor: 16 })
  assert.deepStrictEqual(parseDados('Rd6'), { tipo: 'ronda', caras: 6 })
  assert.deepStrictEqual(parseDados('2×dice'), { tipo: 'magnitud', factor: 2 })
  assert.deepStrictEqual(parseDados('dice'), { tipo: 'magnitud', factor: 1 })
  assert.strictEqual(parseDados('algo raro').tipo, 'manual')
})

test('crítico duplica los dados; la ronda da la cantidad', () => {
  assert.deepStrictEqual(tirada(parseDados('2d8')), { n: 2, caras: 8, notacion: '2d8', min: 2, max: 16 })
  assert.deepStrictEqual(tirada(parseDados('2d8'), { critico: true }), { n: 4, caras: 8, notacion: '4d8', min: 4, max: 32 })
  assert.strictEqual(tirada(parseDados('Rd6'), { ronda: 3 }).notacion, '3d6')
  assert.strictEqual(tirada(parseDados('Rd6'), { ronda: 3, critico: true }).notacion, '6d6')
  assert.strictEqual(tirada(parseDados('16')), null)
})

test('modificador: MOVE, LEVEL y MOVE + x', () => {
  assert.deepStrictEqual(modificadorDano(fang, { modMove: 3 }), { valor: 3, etiqueta: 'Move' })
  assert.strictEqual(modificadorDano({ move_damage_modifier: 'LEVEL' }, { nivel: 7 }).valor, 7)
  assert.strictEqual(modificadorDano({ move_damage_modifier: 'MOVE + 5' }, { modMove: 2 }).valor, 7)
  assert.strictEqual(modificadorDano({ move_damage_modifier: '0' }, { modMove: 2 }).valor, 0)
  assert.ok(usaPower({ move_damage_modifier: 'MOVE + 10' }))
  assert.ok(!usaPower({ move_damage_modifier: 'LEVEL' }))
})

test('Rollout: R dados, hasta la ronda 5', () => {
  const regla = reglaRonda({ move_name: 'Rollout' })
  assert.strictEqual(regla.max, 5)
  assert.strictEqual(tirada(parseDados('Rd6'), { ronda: 3, regla }).notacion, '3d6')
  assert.strictEqual(tirada(parseDados('Rd6'), { ronda: 8, regla }).notacion, '5d6')
  assert.strictEqual(tirada(parseDados('Rd6'), { ronda: 8, regla, critico: true }).notacion, '10d6')
})

test('Outrage: 2^(R-1) dados, R de 1 a 3', () => {
  const regla = reglaRonda({ move_name: 'Outrage' })
  assert.deepStrictEqual([1, 2, 3].map(r => tirada(parseDados('Rd8'), { ronda: r, regla }).n), [1, 2, 4])
  assert.strictEqual(tirada(parseDados('Rd8'), { ronda: 7, regla }).n, 4)   // tope 3
  assert.strictEqual(tirada(parseDados('Rd8'), { ronda: 0, regla }).n, 1)   // nunca menos de 1
  assert.strictEqual(tirada(parseDados('Rd8'), { ronda: -2, regla }).n, 1)
  assert.strictEqual(tirada(parseDados('Rd8'), { ronda: 3, regla, critico: true }).notacion, '8d8')
  assert.strictEqual(rondaValida(0, regla), 1)
})

test('Magnitude: el d100 da los dados y el nivel los multiplica', () => {
  assert.deepStrictEqual([1, 5, 6, 15, 16, 35, 36, 65, 66, 85, 86, 95, 96, 100].map(v => magnitudDe(v).magnitud),
    [4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10])
  assert.strictEqual(magnitudDe(0), null)
  assert.strictEqual(magnitudDe(101), null)
  const nv1 = parseDados('dice'), nv7 = parseDados('2×dice')
  assert.strictEqual(tirada(nv1, { d100: 3 }).notacion, '1d4')
  assert.strictEqual(tirada(nv1, { d100: 50 }).notacion, '1d12')
  assert.strictEqual(tirada(nv7, { d100: 50 }).notacion, '2d12')
  assert.strictEqual(tirada(nv7, { d100: 99 }).notacion, '4d12')
  assert.strictEqual(tirada(nv7, { d100: 99, critico: true }).notacion, '8d12')
  assert.strictEqual(tirada(nv1, {}), null)
})

test('Fling: precio del held item entre 100, o 0', () => {
  assert.ok(esFling({ move_name: 'Fling' }))
  assert.strictEqual(danoFling(4500), 45)
  assert.strictEqual(danoFling(150), 1)
  assert.strictEqual(danoFling(99), 0)
  assert.strictEqual(danoFling(null), 0)
  assert.strictEqual(danoFling(undefined), 0)
  assert.strictEqual(danoFling('abc'), 0)
  assert.strictEqual(danoFling(-300), 0)
})

import test from 'node:test'
import assert from 'node:assert'
import {
  alternarEstado, cambiarEstados, enGracia, desventajaAtaque, desventajaSalvacion, danoMenorDeDos,
  mitadVelocidad, danoPorTurno, resolverFinTurno, resolverInicioTurno, sinVolatiles, estadosInmunes, tiradasFinTurno,
} from '../src/lib/estados.js'

test('uno no volátil y uno volátil', () => {
  assert.deepStrictEqual(alternarEstado([], 'quemado'), ['quemado'])
  assert.deepStrictEqual(alternarEstado(['quemado'], 'confuso'), ['quemado', 'confuso'])
  assert.deepStrictEqual(alternarEstado(['quemado', 'confuso'], 'dormido'), ['dormido', 'confuso'])
  assert.deepStrictEqual(alternarEstado(['quemado', 'confuso'], 'retroceso'), ['quemado', 'retroceso'])
  assert.deepStrictEqual(alternarEstado(['quemado', 'confuso'], 'quemado'), ['confuso'])
})

test('cambiar: meta inicial y gracia al quitar', () => {
  const a = cambiarEstados({ claves: [], meta: null }, ['congelado'], { dc: 14 })
  assert.deepStrictEqual(a, { claves: ['congelado'], texto: 'congelado', meta: { congelado: { dc: 14 } } })
  const b = cambiarEstados(a, [])
  assert.deepStrictEqual(b.meta, { gracia: { congelado: 1 } })
  assert.ok(enGracia(b.meta, 'congelado'))
  assert.deepStrictEqual(cambiarEstados({ claves: [], meta: null }, ['dormido']).meta, { dormido: { restantes: 3 } })
})

test('desventajas y velocidad', () => {
  assert.strictEqual(desventajaAtaque('envenenado_grave'), 'Envenenado grave')
  assert.strictEqual(desventajaAtaque('quemado'), null)
  assert.strictEqual(desventajaSalvacion('paralizado', 'dex'), 'Paralizado')
  assert.strictEqual(desventajaSalvacion('paralizado', 'CON'), null)
  assert.strictEqual(desventajaSalvacion('quemado,retroceso', 'WIS'), 'Retroceso')
  assert.strictEqual(danoMenorDeDos('quemado'), 'Quemado')
  assert.strictEqual(mitadVelocidad('35 ft'), '17 ft')
  assert.deepStrictEqual(estadosInmunes(['Steel']), ['envenenado', 'envenenado_grave'])
})

test('daño por turno según proficiencia; inconsciente no', () => {
  assert.deepStrictEqual(danoPorTurno({ claves: 'envenenado_grave,confuso', hp: 10, prof: 3 }), [{ estado: 'envenenado_grave', cantidad: 6 }])
  assert.deepStrictEqual(danoPorTurno({ claves: 'quemado', hp: 0, prof: 3 }), [])
})

test('final del turno: dormido, congelado, volátiles y gracia', () => {
  const dormido = { claves: 'dormido', meta: { dormido: { restantes: 3 } }, hp: 5, prof: 2 }
  let r = resolverFinTurno(dormido, { dormido: 4 })
  assert.deepStrictEqual(r.meta, { dormido: { restantes: 2 } })
  r = resolverFinTurno(dormido, { dormido: 15 })
  assert.deepStrictEqual([r.claves, r.meta], [[], { gracia: { dormido: 1 } }])
  // Tercera ronda sin despertar: se acaba igual
  r = resolverFinTurno({ ...dormido, meta: { dormido: { restantes: 1 } } }, { dormido: 2 })
  assert.deepStrictEqual(r.claves, [])
  // Congelado con DC
  const cong = { claves: 'congelado', meta: { congelado: { dc: 14 } }, hp: 5, prof: 2 }
  assert.strictEqual(tiradasFinTurno(cong)[0].meta, 14)
  assert.deepStrictEqual(resolverFinTurno(cong, { congelado: 13 }).claves, ['congelado'])
  assert.deepStrictEqual(resolverFinTurno(cong, { congelado: 14 }).claves, [])
  // Envenenado + retroceso: daño y el retroceso se va; la gracia vieja avanza
  r = resolverFinTurno({ claves: 'envenenado,retroceso', meta: { retroceso: { restantes: 1 }, gracia: { quemado: 1 } }, hp: 9, prof: 2 })
  assert.strictEqual(r.dano, 2)
  assert.deepStrictEqual([r.claves, r.meta], [['envenenado'], { gracia: { retroceso: 1 } }])
})

test('inicio del turno: paralizado y confuso', () => {
  let r = resolverInicioTurno({ claves: 'paralizado,confuso', meta: { confuso: { restantes: 2 } } }, { paralizado: 1, confuso: 1, struggle: 5 })
  assert.strictEqual(r.dano, 5)
  assert.ok(r.textos[0].includes('no puede actuar'))
  r = resolverInicioTurno({ claves: 'confuso', meta: { confuso: { restantes: 2 } } }, { confuso: 8 })
  assert.deepStrictEqual([r.claves, r.meta], [[], { gracia: { confuso: 1 } }])
})

test('sin volátiles al salir de combate', () => {
  assert.deepStrictEqual(sinVolatiles({ claves: 'quemado,confuso', meta: { confuso: { restantes: 2 } } }).claves, ['quemado'])
  assert.strictEqual(sinVolatiles({ claves: 'quemado', meta: null }), null)
})

test('incapacitado: dormido, congelado y paralizado con 1', async () => {
  const { incapacitado, fueraDeCombate } = await import('../src/lib/estados.js')
  assert.match(incapacitado('dormido', null), /Dormido/)
  assert.match(incapacitado('congelado,confuso', null), /Congelado/)
  assert.strictEqual(incapacitado('paralizado', null), null)
  let r = resolverInicioTurno({ claves: 'paralizado', meta: null }, { paralizado: 1 })
  assert.deepStrictEqual(r.meta, { paralizado: { incapacitado: true } })
  assert.match(incapacitado(r.texto, r.meta), /Paralizado/)
  // El siguiente inicio de turno vuelve a tirar: con otro número ya puede actuar
  r = resolverInicioTurno({ claves: 'paralizado', meta: r.meta }, { paralizado: 3 })
  assert.strictEqual(incapacitado(r.texto, r.meta), null)
  // Fuera de combate se va la incapacidad de un turno, los volátiles y la gracia
  const f = fueraDeCombate({ claves: 'paralizado,confuso', meta: { paralizado: { incapacitado: true }, confuso: { restantes: 2 }, gracia: { dormido: 1 } } })
  assert.deepStrictEqual([f.claves, f.meta], [['paralizado'], null])
  assert.strictEqual(fueraDeCombate({ claves: 'quemado', meta: null }), null)
})

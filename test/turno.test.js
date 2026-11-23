import test from 'node:test'
import assert from 'node:assert'
import { debeDesplegarTurno, posicionTurno } from '../src/lib/turno.js'

// Orden: Ana (1), Beto (2), yo (3), Caro (4)
const ini = (ronda, turno) => ({
  estado: 'activa', ronda, turno,
  participantes: [{ user_id: 1 }, { user_id: 2 }, { user_id: 3 }, { user_id: 4 }],
})
const YO = 3

test('desplegada (sin plegar) no hace nada', () => {
  assert.strictEqual(debeDesplegarTurno(null, ini(1, 1), YO), false)
})

test('plegada en el turno de Ana: sigue plegada mientras no me toque', () => {
  const plegado = { en: posicionTurno(ini(1, 0)) }
  assert.strictEqual(debeDesplegarTurno(plegado, ini(1, 0), YO), false)
})

test('se despliega cuando juega el anterior a mí (mi turno está por llegar)', () => {
  const plegado = { en: posicionTurno(ini(1, 0)) }
  assert.strictEqual(debeDesplegarTurno(plegado, ini(1, 1), YO), true)
})

test('se despliega en mi turno', () => {
  const plegado = { en: posicionTurno(ini(1, 1)) }
  assert.strictEqual(debeDesplegarTurno(plegado, ini(1, 2), YO), true)
})

test('plegada durante mi turno: se queda plegada en ese turno y en el siguiente ajeno', () => {
  const plegado = { en: posicionTurno(ini(1, 2)) }
  assert.strictEqual(debeDesplegarTurno(plegado, ini(1, 2), YO), false)
  assert.strictEqual(debeDesplegarTurno(plegado, ini(1, 3), YO), false)
  assert.strictEqual(debeDesplegarTurno(plegado, ini(2, 0), YO), false)
})

test('vuelve a desplegarse en la ronda siguiente al acercarse mi turno', () => {
  const plegado = { en: posicionTurno(ini(1, 2)) }
  assert.strictEqual(debeDesplegarTurno(plegado, ini(2, 1), YO), true)
})

test('un combate nuevo (turno anterior al guardado) arranca desplegado', () => {
  const plegado = { en: posicionTurno(ini(3, 0)) }
  assert.strictEqual(debeDesplegarTurno(plegado, ini(1, 0), YO), true)
})

test('sin combate activo no se toca nada', () => {
  const plegado = { en: posicionTurno(ini(1, 0)) }
  assert.strictEqual(debeDesplegarTurno(plegado, { ...ini(1, 2), estado: 'pendiente' }, YO), false)
  assert.strictEqual(debeDesplegarTurno(plegado, null, YO), false)
})

test('si voy primero, me precede el último de la ronda', () => {
  const plegado = { en: posicionTurno(ini(1, 1)) }
  const conmigoPrimero = { ...ini(1, 3), participantes: [{ user_id: 3 }, { user_id: 1 }, { user_id: 2 }, { user_id: 4 }] }
  assert.strictEqual(debeDesplegarTurno(plegado, conmigoPrimero, YO), true)
})

import test from 'node:test'
import assert from 'node:assert'
import { estadoDeMovimiento } from '../src/lib/estadoMovimiento.js'

const m = (move_name, move_description) => ({ move_name, move_description })

test('automáticos: frase directa', () => {
  assert.deepStrictEqual(estadoDeMovimiento(m('Thunder Wave', 'The target must make a CON save against your Move DC or become\nparalyzed.')), { estado: 'paralizado', auto: true })
  assert.deepStrictEqual(estadoDeMovimiento(m('Toxic', 'Targets in the area must make a CON save against your MOVE DC or become badly poisoned.')), { estado: 'envenenado_grave', auto: true })
  assert.deepStrictEqual(estadoDeMovimiento(m('Will-O-Wisp', 'Make a ranged attack roll on a target, causing burn on a hit.')), { estado: 'quemado', auto: true })
  assert.deepStrictEqual(estadoDeMovimiento(m('Mortal Spin', 'Creatures that fail the save are also poisoned.')), { estado: 'envenenado', auto: true })
})

test('a mano: dependen de algo más', () => {
  assert.strictEqual(estadoDeMovimiento(m('Bite', 'Make a melee attack. On natural attack rolls of 19 or 20, the target flinches')).auto, false)
  assert.strictEqual(estadoDeMovimiento(m('Thunder', 'If a target fails the save by 5 or more, it becomes paralyzed.')).auto, false)
  assert.strictEqual(estadoDeMovimiento(m('Rest', 'When you activate this move, you fall asleep after the end of your turn.')).auto, false)
  assert.strictEqual(estadoDeMovimiento(m('Spore', 'You can use your reaction to release a spore. The creature must make a CON save, falling asleep on a fail.')).motivo, 'es una reacción')
  assert.match(estadoDeMovimiento(m('Tri Attack', 'On a 1, the target becomes paralyzed. On a 2, it becomes burned. On a 3, it becomes frozen.')).motivo, /varios/)
})

test('sin estado', () => {
  assert.strictEqual(estadoDeMovimiento(m('Tackle', 'Make a melee attack, doing 1d6 + MOVE damage.')), null)
})

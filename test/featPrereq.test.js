import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prereqMet, featPrereqStatus, buildPrereqContext } from '../src/lib/featPrereq.js'

const ctx = (over = {}) => ({
  level: 1,
  statTotal: () => 0,
  armorProfs: new Set(),
  ...over,
})

test('prereqMet: sin prerequisito, siempre se cumple', () => {
  assert.equal(prereqMet('', null, ctx()), true)
  assert.equal(prereqMet(null, null, ctx()), true)
})

test('prereqMet: lvl compara contra ctx.level', () => {
  assert.equal(prereqMet('lvl', 5, ctx({ level: 5 })), true)
  assert.equal(prereqMet('lvl', 5, ctx({ level: 4 })), false)
  assert.equal(prereqMet('LVL', 5, ctx({ level: 10 })), true) // no distingue mayúsculas
})

test('prereqMet: stat compara contra ctx.statTotal(key)', () => {
  const c = ctx({ statTotal: k => (k === 'dex' ? 14 : 0) })
  assert.equal(prereqMet('dex', 14, c), true)
  assert.equal(prereqMet('dex', 15, c), false)
  assert.equal(prereqMet('str', 1, c), false)
})

test('prereqMet: armor prof compara contra el set, normalizado a minúsculas', () => {
  const c = ctx({ armorProfs: new Set(['medium armor']) })
  assert.equal(prereqMet('armor prof', 'Medium Armor', c), true)
  assert.equal(prereqMet('armor prof', 'heavy armor', c), false)
})

test('prereqMet: prerequisito desconocido no bloquea', () => {
  assert.equal(prereqMet('algo-que-no-existe', 99, ctx()), true)
})

test('featPrereqStatus: todo-o-nada, falla en el primero que no se cumpla', () => {
  const prereqs = [{ prereq: 'lvl', valor: 5 }, { prereq: 'dex', valor: 14 }]
  const bajo = featPrereqStatus(prereqs, ctx({ level: 3, statTotal: () => 14 }))
  assert.equal(bajo.met, false)
  assert.match(bajo.reason, /nivel/)

  const ok = featPrereqStatus(prereqs, ctx({ level: 5, statTotal: () => 14 }))
  assert.equal(ok.met, true)
  assert.equal(ok.reason, '')
})

test('featPrereqStatus: sin prerequisitos, siempre se cumple', () => {
  assert.deepEqual(featPrereqStatus([], ctx()), { met: true, reason: '' })
  assert.deepEqual(featPrereqStatus(undefined, ctx()), { met: true, reason: '' })
})

test('buildPrereqContext: statTotal suma base + bonus de tabla + bonos de stat de los feats', () => {
  const full = {
    personaje_level: 7,
    stats: { personaje_dex: 14, personaje_dex_bonus: 1 },
    extra_feats: [{ bonos: [{ type: 'stat', llave: 'dex', value: 2 }] }],
  }
  const c = buildPrereqContext(full)
  assert.equal(c.level, 7)
  assert.equal(c.statTotal('dex'), 17) // 14 + 1 + 2
  assert.equal(c.statTotal('str'), 0)  // sin datos, no revienta
})

test('buildPrereqContext: junta armor_profs y las cuatro proficiencias del background', () => {
  const full = {
    armor_profs: ['Light Armor'],
    background_armor_proficiencies_value_1: 'Medium Armor',
    background_armor_proficiencies_value_3: 'Heavy Armor',
  }
  const c = buildPrereqContext(full)
  assert.ok(c.armorProfs.has('light armor'))
  assert.ok(c.armorProfs.has('medium armor'))
  assert.ok(c.armorProfs.has('heavy armor'))
  assert.equal(c.armorProfs.size, 3)
})

test('buildPrereqContext: sin datos no revienta', () => {
  const c = buildPrereqContext(undefined)
  assert.equal(c.level, 0)
  assert.equal(c.statTotal('dex'), 0)
  assert.equal(c.armorProfs.size, 0)
})

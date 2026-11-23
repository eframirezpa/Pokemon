import test from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { PARCHES, PARCHE_ACTUAL } from '../src/lib/parches.js'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

test('el parche actual coincide con la versión de package.json', () => {
  assert.strictEqual(PARCHE_ACTUAL.version, pkg.version)
})

test('cada parche tiene versión X.Y.Z única, fecha y cambios', () => {
  const vistas = new Set()
  for (const p of PARCHES) {
    assert.match(p.version, /^\d+\.\d+\.\d+$/)
    assert.ok(!vistas.has(p.version), `versión repetida: ${p.version}`)
    vistas.add(p.version)
    assert.match(p.fecha, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(p.cambios.length > 0)
  }
})

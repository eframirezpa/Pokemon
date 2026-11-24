import test from 'node:test'
import assert from 'node:assert'
import { elementoDeProyectil, claseDeProyectil, claseDeArma, esCompatible, efectoDeProyectil, proyectilParaAtaque } from '../src/lib/proyectiles.js'

const item = (item_name, item_description) => ({ item_name, item_description })

test('elemental: tipo en el nombre y confirmado en la descripción', () => {
  assert.strictEqual(elementoDeProyectil(item('Fire Arrows', 'Conserva la cantidad de daño del arma y cambia su tipo a Fire.')), 'Fire')
  assert.strictEqual(elementoDeProyectil(item('Normal-Type Rifle Rounds', '… cambia su tipo a Normal. Si el arma…')), 'Normal')
  assert.strictEqual(elementoDeProyectil('Bug Shotgun Shells'), 'Bug')
  // Sin tipo en el nombre, no
  assert.strictEqual(elementoDeProyectil(item('Arrows', 'Inflige el tipo de daño habitual del arma')), null)
  assert.strictEqual(elementoDeProyectil(item('Explosive Arrows', '… 2d8 de daño de Fuego')), null)
  // Poison Darts: la descripción no cambia el tipo
  assert.strictEqual(elementoDeProyectil(item('Poison Darts', 'Si falla, queda Poisoned durante 1 minuto.')), null)
})

test('compatibilidad por clase de arma', () => {
  const arco = { weapon_type_name: 'Longbow' }, ballesta = { weapon_type_name: 'Hand Crossbow' }
  const honda = { weapon_type_name: 'Sling' }, rev = { weapon_type_name: 'Revolver' }
  assert.strictEqual(claseDeArma(arco), 'arrow')
  assert.strictEqual(claseDeArma(ballesta), 'bolt')
  assert.strictEqual(claseDeProyectil('Fire Crossbow Bolts'), 'bolt')
  assert.strictEqual(claseDeProyectil('Explosive Sling Pellets'), 'sling')
  assert.ok(esCompatible('Water Arrows', arco))
  assert.ok(!esCompatible('Water Arrows', ballesta))
  assert.ok(esCompatible('Smoke Pellets', honda))
  assert.ok(esCompatible('Ice Pistol Rounds', rev))
  assert.ok(!esCompatible('Ice Rifle Rounds', rev))
  // Lo desconocido se deja usar
  assert.ok(esCompatible('Rehabilita delincuientes', arco))
})

test('efectos no elementales', () => {
  assert.deepStrictEqual(efectoDeProyectil('Explosive Crossbow Bolts').tipoDano, 'Fire')
  assert.strictEqual(efectoDeProyectil('Poison Darts').estado, 'envenenado')
  assert.strictEqual(efectoDeProyectil('Antidote Darts').curaEstado, 'envenenado')
  assert.strictEqual(efectoDeProyectil('Sticky Pellets').salvacion, 'DEX')
  assert.ok(efectoDeProyectil('Smoke Pellets').nota)
  assert.strictEqual(efectoDeProyectil('Fire Arrows'), null)
  assert.strictEqual(proyectilParaAtaque(item('Smoke Pellets', 'Munición para honda. Cada ataque consume un pellet. Al impactar, crea humo.')).descripcion, 'Al impactar, crea humo.')
})

test('descripciones en inglés (producción)', () => {
  assert.strictEqual(elementoDeProyectil(item('Fire Arrows', 'Elemental arrows used by bows. Each attack made with a compatible bow consumes one arrow.')), 'Fire')
  assert.strictEqual(elementoDeProyectil(item('Normal-Type Rifle Rounds', 'Elemental rounds used by rifles. Each attack made with a compatible rifle consumes one round.')), 'Normal')
  assert.strictEqual(elementoDeProyectil(item('Poison Darts', 'Special darts used by blowguns. Each attack made with a blowgun consumes one dart.')), null)
  assert.strictEqual(elementoDeProyectil(item('Arrows', 'Arrows used by bows.')), null)
  assert.strictEqual(proyectilParaAtaque(item('Smoke Pellets', 'Special pellets used by slings. Each attack made with a sling consumes one pellet. On impact, creates smoke.')).descripcion, 'On impact, creates smoke.')
})

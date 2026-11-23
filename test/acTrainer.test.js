import test from 'node:test'
import assert from 'node:assert'
import { acDelTrainer } from '../src/lib/trainerCombatShared.js'

test('sin armadura: 10 + DEX', () => {
  assert.strictEqual(acDelTrainer({ armor: null, personaje_ac: null }, 2), 12)
  assert.strictEqual(acDelTrainer({ armor: null }, -1), 9)
})

test('con armadura: base + DEX topado + bono de la armadura', () => {
  const media = { armor_type_base_ac: 13, armor_type_uses_dex_modifier: 1, armor_type_max_dex_modifier: 2, armor_type_ac_bonus: null }
  assert.strictEqual(acDelTrainer({ armor: media }, 4), 15)
  // Medium Armor Master sube el tope a +3
  assert.strictEqual(acDelTrainer({ armor: media, extra_feats: [{ feat_id: 33 }] }, 4), 16)
  const pesada = { armor_type_base_ac: 18, armor_type_uses_dex_modifier: 0, armor_type_ac_bonus: 1 }
  assert.strictEqual(acDelTrainer({ armor: pesada }, 3), 19)
})

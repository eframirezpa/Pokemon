// Resistencias / vulnerabilidades / inmunidades de un Pokémon según su(s) tipo(s).
// Regla del juego (invertida respecto al daño de la tabla type_effectiveness):
//   multiplicador 0.5 → resiste · 2 → vulnerable · 0 → inmune · sin fila → neutral
// Doble tipo, por cada tipo atacante: si ambos coinciden (o solo uno tiene relación y
// el otro es neutral) manda esa relación; si difieren entre sí, se cancela (neutral).
import { apiFetch } from '../api'

const relOf = m => (m === 0.5 ? 'resist' : m === 2 ? 'vuln' : m === 0 ? 'immune' : 'neutral')

const combine = (a, b) => {
  if (!b || b === 'neutral') return a || 'neutral'
  if (!a || a === 'neutral') return b
  return a === b ? a : 'neutral'
}

// te: filas de type_effectiveness. matchDef*: predicado (row) => bool del tipo defensor.
function relationsFor(te, matchDef1, matchDef2) {
  const per = new Map() // nombre del atacante → { a, b }
  for (const r of te) {
    const rel = relOf(Number(r.type_effectiveness_multiplier))
    const atk = r.type_effectiveness_attacking_type
    if (matchDef1(r)) { const e = per.get(atk) || {}; e.a = rel; per.set(atk, e) }
    if (matchDef2 && matchDef2(r)) { const e = per.get(atk) || {}; e.b = rel; per.set(atk, e) }
  }
  const resist = [], vuln = [], immune = []
  for (const [atk, { a, b }] of per) {
    const r = combine(a, matchDef2 ? b : null)
    if (r === 'resist') resist.push(atk)
    else if (r === 'vuln') vuln.push(atk)
    else if (r === 'immune') immune.push(atk)
  }
  return { resist, vuln, immune }
}

/* Por ids de pokemon_types (personaje_pokemon_type_1 / _2) */
export function effectivenessByIds(te, id1, id2) {
  if (!te || id1 == null) return { resist: [], vuln: [], immune: [] }
  const n = v => Number(v)
  return relationsFor(te,
    r => n(r.type_effectiveness_defending_type_id) === n(id1),
    id2 != null ? r => n(r.type_effectiveness_defending_type_id) === n(id2) : null)
}

/* Por nombres de tipo (pokemon_type_1 / _2 del pokédex, usado en la creación) */
export function effectivenessByNames(te, name1, name2) {
  const norm = s => (s ?? '').toLowerCase().trim()
  if (!te || !name1) return { resist: [], vuln: [], immune: [] }
  return relationsFor(te,
    r => norm(r.type_effectiveness_defending_type) === norm(name1),
    name2 ? r => norm(r.type_effectiveness_defending_type) === norm(name2) : null)
}

// Carga (una sola vez por sesión) las 120 filas de type_effectiveness
let cache = null
export function getEffectivenessRows() {
  if (!cache) {
    cache = apiFetch('/types/effectiveness')
      .then(r => r.json())
      .then(rows => (Array.isArray(rows) ? rows : []))
      .catch(() => { cache = null; return [] })
  }
  return cache
}

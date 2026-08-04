// Proficiencias del personaje, re-evaluadas al mostrar.
//
// Regla común: un feat cuyos prerequisitos no se cumplen no otorga nada, así que
// las proficiencias que provengan de él quedan revocadas hasta que vuelva a
// cumplirlos. Lo que no viene de un feat es permanente:
//   · armadura → la que da el background
//   · arma     → la elegida al crear el personaje (prof_feat_id NULL)
import { featPrereqStatus, buildPrereqContext } from './featPrereq'

const norm = s => (s ?? '').toLowerCase().trim()

// Separador con el que se guardan varios textos en personaje_feat_bonus_value
const TEXT_SEP = String.fromCharCode(31)

// Llaves de bono que otorgan proficiencia con herramientas: "Artisans Tools Prof"
// (Crafter), "Musical Instrument Prof" (Musician) y "Tool Prof" (Skilled).
// Se excluyen las de arma, que llevan "weapon" en la llave.
const isToolProfKey = (llave) => {
  const k = norm(llave)
  if (!k.includes('prof') || k.includes('weapon')) return false
  return k.includes('tool') || k.includes('instrument')
}

// Los backgrounds guardan la categoría en plural ("shields") pero armor_types la
// tiene en singular ("Shield"), así que sin esto la proficiencia nunca casaba.
const ARMOR_ALIAS = { shields: 'shield' }
const normArmor = s => { const n = norm(s); return ARMOR_ALIAS[n] ?? n }

export function buildProfs(full) {
  const ctx = full ? buildPrereqContext(full) : null
  const featMet = (f) => !ctx || featPrereqStatus(f.prereqs, ctx).met

  // Feats vigentes: los que cumplen sus prerequisitos
  const featsVigentes = new Set(
    (full?.extra_feats || []).filter(featMet).map(f => Number(f.personaje_feat_id)))

  // ── Armadura ──
  const armors = new Set()
  for (const ef of (full?.extra_feats || [])) {
    if (!featMet(ef)) continue
    for (const a of (ef.armor_profs || [])) if (norm(a)) armors.add(normArmor(a))
  }
  // El background no tiene prerequisitos: siempre cuenta
  for (const v of [
    full?.background_armor_proficiencies_value_1, full?.background_armor_proficiencies_value_2,
    full?.background_armor_proficiencies_value_3, full?.background_armor_proficiencies_value_4,
  ]) if (norm(v)) armors.add(normArmor(v))

  // ── Arma ── la bandera vive en la fila de personaje_weapon
  const isWeaponProf = (w) => {
    if (!w?.personaje_weapon_prof) return false
    const featId = w.personaje_weapon_prof_feat_id
    return featId == null || featsVigentes.has(Number(featId)) // NULL = de la creación
  }

  // ── Herramientas ── la del background (background_tool_item_id) más las
  // elegidas en feats de proficiencia de herramienta. Se devuelve el origen
  // para poder mostrarlo, y se descartan duplicados por nombre.
  const tools = []
  const vistos = new Set()
  const addTool = (nombre, origen) => {
    const n = (nombre || '').trim()
    if (!n || vistos.has(norm(n))) return
    vistos.add(norm(n))
    tools.push({ name: n, source: origen })
  }
  // El background no tiene prerequisitos: siempre cuenta
  if (full?.background_tool_item_name) {
    addTool(full.background_tool_item_name, full.background_name || 'Background')
  }
  for (const ef of (full?.extra_feats || [])) {
    if (!featMet(ef)) continue
    for (const b of (ef.bonos || [])) {
      if (norm(b.type) !== 'text' || !isToolProfKey(b.llave)) continue
      for (const v of String(b.value ?? '').split(TEXT_SEP)) addTool(v, ef.feat_name)
    }
  }

  return {
    armors,
    isArmorProf: (category) => armors.has(normArmor(category)),
    isWeaponProf,
    tools,
    isToolProf: (nombre) => vistos.has(norm(nombre)),
  }
}

/* "heavy armor" → "Heavy Armor" (los valores llegan en minúsculas desde la BD) */
export const titleCase = s => (s ?? '')
  .split(/\s+/).filter(Boolean)
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ')

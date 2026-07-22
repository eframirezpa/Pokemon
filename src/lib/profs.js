// Proficiencias de armas y de tipos de armadura del personaje.
// Armas: bonos de tipo 'text' cuya llave habla de "weapon prof" (guardan los nombres elegidos).
// Armaduras: personaje_armor_prof (feats) + las que otorga el background.
import { featPrereqStatus, buildPrereqContext } from './featPrereq'

const TEXT_SEP = String.fromCharCode(31)
const norm = s => (s ?? '').toLowerCase().trim()

export function buildProfs(full) {
  const ctx = full ? buildPrereqContext(full) : null
  const weapons = new Set()   // nombres de arma, en minúsculas
  const armors  = new Set()   // tipos de armadura, en minúsculas

  for (const ef of (full?.extra_feats || [])) {
    // Los feats que no cumplen prerequisitos no otorgan nada (misma regla que el resto de bonos)
    if (ctx && !featPrereqStatus(ef.prereqs, ctx).met) continue
    for (const b of (ef.bonos || [])) {
      if (norm(b.type) !== 'text') continue
      const llave = norm(b.llave)
      if (!llave.includes('weapon') || !llave.includes('prof')) continue
      for (const v of String(b.value ?? '').split(TEXT_SEP)) if (norm(v)) weapons.add(norm(v))
    }
  }

  for (const a of (full?.armor_profs || [])) if (norm(a)) armors.add(norm(a))
  for (const v of [
    full?.background_armor_proficiencies_value_1, full?.background_armor_proficiencies_value_2,
    full?.background_armor_proficiencies_value_3, full?.background_armor_proficiencies_value_4,
  ]) if (norm(v)) armors.add(norm(v))

  return {
    weapons,
    armors,
    isWeaponProf: (name)     => weapons.has(norm(name)),
    isArmorProf:  (category) => armors.has(norm(category)),
  }
}

/* "heavy armor" → "Heavy Armor" (los valores llegan en minúsculas desde la BD) */
export const titleCase = s => (s ?? '')
  .split(/\s+/).filter(Boolean)
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ')

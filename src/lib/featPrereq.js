// Evaluación de prerequisitos de feats (nivel / stat / armor prof).
// Se usa tanto para deshabilitar "Agregar" como para no sumar bonos al mostrar la ficha.

const STAT_KEYS = ['dex', 'str', 'con', 'int', 'wis', 'cha']

// ctx: { level, statTotal(key)→num, armorProfs:Set<string minúsculas> }
export function prereqMet(prereq, valor, ctx) {
  const p = (prereq || '').toLowerCase().trim()
  if (!p) return true
  if (p === 'lvl') return (ctx.level || 0) >= (Number(valor) || 0)
  if (STAT_KEYS.includes(p)) return (ctx.statTotal(p) || 0) >= (Number(valor) || 0)
  if (p === 'armor prof') return ctx.armorProfs.has((valor || '').toLowerCase().trim())
  return true // prereq desconocido → no bloquea
}

function describePrereq(pr) {
  const p = (pr.prereq || '').toLowerCase().trim()
  if (p === 'lvl') return `Requiere nivel ${pr.valor}`
  if (STAT_KEYS.includes(p)) return `Requiere ${p.toUpperCase()} ${pr.valor}`
  if (p === 'armor prof') return `Requiere proficiencia en ${pr.valor}`
  return 'Prerequisito no cumplido'
}

// prereqs: [{ prereq, valor }] → { met, reason }. Todo-o-nada: falla si alguno no se cumple.
export function featPrereqStatus(prereqs, ctx) {
  for (const pr of (prereqs || [])) {
    if (!prereqMet(pr.prereq, pr.valor, ctx)) return { met: false, reason: describePrereq(pr) }
  }
  return { met: true, reason: '' }
}

// Construye el contexto de prereqs desde el objeto `full` (/personaje/:id/full)
export function buildPrereqContext(full) {
  const level = full?.personaje_level || 0
  const stats = full?.stats || {}
  const featStatAdd = {}
  for (const ef of (full?.extra_feats || [])) {
    for (const b of (ef.bonos || [])) {
      if ((b.type || '').toLowerCase() === 'stat') {
        const k = (b.llave || '').toLowerCase()
        featStatAdd[k] = (featStatAdd[k] || 0) + (Number(b.value) || 0)
      }
    }
  }
  const statTotal = (k) => (Number(stats[`personaje_${k}`]) || 0) + (Number(stats[`personaje_${k}_bonus`]) || 0) + (featStatAdd[k] || 0)

  const armorProfs = new Set((full?.armor_profs || []).map(a => (a || '').toLowerCase().trim()))
  for (const v of [
    full?.background_armor_proficiencies_value_1, full?.background_armor_proficiencies_value_2,
    full?.background_armor_proficiencies_value_3, full?.background_armor_proficiencies_value_4,
  ]) if (v) armorProfs.add(v.toLowerCase().trim())

  return { level, statTotal, armorProfs }
}

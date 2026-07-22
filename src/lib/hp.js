// HP efectivo del personaje: la vida guardada es solo la base (6 + healing de origen/background).
// Al mostrarla se le suma el modificador de CON y los bonos de healing de feats y especialidades.
// Los feats que no cumplen prerequisitos no aportan nada (misma regla que el resto de bonos).
import { featPrereqStatus, buildPrereqContext } from './featPrereq'

const norm = s => (s ?? '').toLowerCase()

/* Suma que hay que aplicar al HP guardado (máximo y actual) */
export function hpExtra(full) {
  if (!full) return 0
  const ctx   = buildPrereqContext(full)
  const stats = full.stats || {}
  let statAdd = 0, healing = 0

  for (const ef of (full.extra_feats || [])) {
    if (ctx && !featPrereqStatus(ef.prereqs, ctx).met) continue
    for (const b of (ef.bonos || [])) {
      const type = norm(b.type)
      if (type === 'stat' && norm(b.llave) === 'con') statAdd += Number(b.value) || 0
      else if (type === 'healing') healing += Number(b.value) || 0
    }
  }
  for (const sp of (full.specializations || [])) {
    for (const b of (sp.bonos || [])) {
      const type = norm(b.type)
      if (type === 'stat' && norm(b.llave) === 'con') statAdd += Number(b.value) || 0
      else if (type === 'healing') healing += Number(b.value) || 0
    }
  }

  const con = (Number(stats.personaje_con) || 0) + (Number(stats.personaje_con_bonus) || 0) + statAdd
  return Math.floor((con - 10) / 2) + healing
}

/* { max, cur }: el máximo es la base + bonos; el HP actual es un valor absoluto de combate */
export function hpValues(full) {
  const max = (Number(full?.personaje_hp) || 0) + hpExtra(full)
  return { max, cur: full?.personaje_current_hp ?? max }
}

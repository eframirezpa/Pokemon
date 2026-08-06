// HP efectivo del personaje: la vida guardada es solo la base (6 + healing de origen/background).
// Al mostrarla se le suma el modificador de CON y los bonos de healing de feats y especialidades.
// Los feats que no cumplen prerequisitos no aportan nada (misma regla que el resto de bonos).
import { featPrereqStatus, buildPrereqContext } from './featPrereq'

const norm = s => (s ?? '').toLowerCase()

/* Un bono de healing se escribe "2 per lvl" si escala con el nivel, o como un
   número suelto si es plano. Es la misma convención que usan los feats de
   Pokémon, y evita reconocer los feats por id. */
const PER_LVL = /(\d+)\s*per\s*l/i

/* Lo que aporta UNA instancia del bono, o sea su valor a nivel 1. Es lo que la
   creación del personaje hornea en personaje_hp. */
export function healingBase(value) {
  const m = PER_LVL.exec(String(value ?? ''))
  return m ? Number(m[1]) : (Number(value) || 0)
}

/* Lo que aporta el bono completo a un nivel dado. */
export function healingAtLevel(value, level) {
  const m = PER_LVL.exec(String(value ?? ''))
  return m ? Number(m[1]) * Math.max(1, Number(level) || 1) : (Number(value) || 0)
}

/* Suma que hay que aplicar al HP guardado (máximo y actual) */
export function hpExtra(full) {
  if (!full) return 0
  const ctx   = buildPrereqContext(full)
  const stats = full.stats || {}
  const level = Math.max(1, Number(full.personaje_level) || 1)
  let statAdd = 0, healing = 0

  for (const ef of (full.extra_feats || [])) {
    if (ctx && !featPrereqStatus(ef.prereqs, ctx).met) continue
    for (const b of (ef.bonos || [])) {
      const type = norm(b.type)
      if (type === 'stat' && norm(b.llave) === 'con') statAdd += Number(b.value) || 0
      else if (type === 'healing') healing += healingAtLevel(b.value, level)
    }
  }

  // Feats de origen/background: son los únicos que la creación ya aplicó, y lo
  // hizo horneando UNA instancia del bono (la de nivel 1) dentro de personaje_hp.
  // Aquí solo se repone lo que falta por los niveles restantes: un bono plano no
  // aporta nada extra, uno "N per lvl" aporta N × (nivel − 1).
  // Se filtra por llave 'hp' para calcar exactamente lo que hornea el wizard.
  for (const f of [full.origin_feat, full.background_feat]) {
    for (const b of (f?.bonos || [])) {
      if (norm(b.type) !== 'healing' || norm(b.llave) !== 'hp') continue
      healing += healingAtLevel(b.value, level) - healingBase(b.value)
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

/* ── HP de los Pokémon del entrenador (espejo de back/src/lib/hp.js) ──
   pokemon_hp guarda la base del pokédex más las tiradas de dado acumuladas al
   subir de nivel; el máximo mostrado le suma el modificador de CON por nivel.
   El backend ya devuelve pokemon_hp con ese extra aplicado: estos helpers son
   para las vistas que arman el valor desde los stats en crudo. */

/* CON total: base + bonus de la tabla + bonos de stat de los feats */
export function pokemonCon(stats, feats) {
  let featAdd = 0
  for (const f of (feats || [])) {
    for (const b of (f.bonos || [])) {
      if (norm(b.type) === 'stat' && norm(b.llave) === 'con') featAdd += Number(b.value) || 0
    }
  }
  return (Number(stats?.pokemon_con) || 0) + (Number(stats?.pokemon_con_bonus) || 0) + featAdd
}

// Healing que aportan los feats del Pokémon. Los feats de Pokémon no se hornean
// en ningún lado, así que van completos.
function pokemonHealing(feats, level) {
  let total = 0
  for (const f of (feats || [])) {
    for (const b of (f.bonos || [])) {
      if (norm(b.type) !== 'healing') continue
      total += healingAtLevel(b.value, level)
    }
  }
  return total
}

/* Suma en vivo al HP máximo: modificador de CON por nivel más el healing de feats.
   Un CON bajo (modificador negativo) no resta vida: el piso es 0. */
export function pokemonHpExtra({ stats, feats, level }) {
  const lvl = Math.max(1, Number(level) || 1)
  const mod = Math.max(0, Math.floor((pokemonCon(stats, feats) - 10) / 2))
  return mod * lvl + pokemonHealing(feats, lvl)
}

/* Tamaño del dado de golpe a partir del texto del pokédex: "d10" → 10 */
export function hitDiceMax(s) {
  const m = /(\d+)/.exec(s || '')
  return m ? Number(m[1]) : 0
}

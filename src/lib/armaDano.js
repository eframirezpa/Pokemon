// Daño de un arma del entrenador y su munición.
//
// - El daño sale de weapon_type_damage_dice: "1d8", "2d6", un número fijo
//   ("1", la cerbatana) o texto ("Special", la red), que no tiene daño propio.
// - Se le suma el modificador del stat con el que se atacó (5e: el mismo de la
//   tirada de ataque). La proficiencia y el Bonus de la ruta no entran: son de
//   la tirada de ataque, no del daño.
// - Crítico: se tiran el doble de dados; el modificador no se duplica.
// - Munición: solo las armas con la propiedad Ammunition (weapon_property_id 1).
//   Las propiedades vienen como id en weapon_type_property_1..6.

export const PROPIEDAD_MUNICION = 1

export const usaMunicion = (arma) => !!arma && [1, 2, 3, 4, 5, 6].some(i => {
  const p = String(arma[`weapon_type_property_${i}`] ?? '').trim().toLowerCase()
  return p === String(PROPIEDAD_MUNICION) || p === 'ammunition'
})

// "1d8" → { tipo: 'dados', n, caras } · "1" → { tipo: 'fijo', valor } · otro → null
export const dadosArma = (arma) => {
  const t = String(arma?.weapon_type_damage_dice ?? '').trim()
  let r = /^(\d+)\s*d\s*(\d+)$/i.exec(t)
  if (r) return { tipo: 'dados', n: Number(r[1]), caras: Number(r[2]) }
  r = /^(\d+)$/.exec(t)
  if (r) return { tipo: 'fijo', valor: Number(r[1]) }
  return null
}

// Qué se tira y entre qué valores puede salir, con el crítico ya aplicado
export const tiradaArma = (dados, critico = false) => {
  if (!dados || dados.tipo !== 'dados') return null
  const n = dados.n * (critico ? 2 : 1)
  return { notacion: `${n}d${dados.caras}`, min: n, max: n * dados.caras }
}

/**
 * Daño final. valor: lo que sumaron los dados (texto del input). Devuelve
 * null si todavía no hay un valor válido.
 */
export const danoArma = (dados, { valor = '', mod = 0, critico = false } = {}) => {
  if (!dados) return null
  if (dados.tipo === 'fijo') {
    return { total: Math.max(0, dados.valor + mod), dados: dados.valor, mod, notacion: String(dados.valor) }
  }
  const t = tiradaArma(dados, critico)
  if (valor === '' || valor == null) return null
  const v = Math.trunc(Number(valor))
  if (!Number.isFinite(v) || v < t.min || v > t.max) return null
  return { total: Math.max(0, v + mod), dados: v, mod, notacion: t.notacion }
}

// ── Con qué stat se ataca (reglas de la mesa) ──
//  - Arma de rango (weapon_type_dnd_category "… Ranged Weapons"): DEX.
//  - Arma cuerpo a cuerpo: STR, salvo con Finesse (weapon_property_id 3), que
//    usa el de mayor puntaje entre STR y DEX (empate: STR).
//  - Sin arma: STR.
export const PROPIEDAD_FINESSE = 3

const tienePropiedad = (arma, id, nombre) => !!arma && [1, 2, 3, 4, 5, 6].some(i => {
  const p = String(arma[`weapon_type_property_${i}`] ?? '').trim().toLowerCase()
  return p === String(id) || p === nombre
})

export const esArmaDeRango = (arma) => {
  const cat = String(arma?.weapon_type_dnd_category || '')
  if (/ranged/i.test(cat)) return true
  if (/melee/i.test(cat)) return false
  return Number(arma?.weapon_type_is_ranged) === 1
}

/** stats: [{ key: 'STR', valor, mod }, …] (los del entrenador). Devuelve el stat. */
export const statDeArma = (arma, stats = []) => {
  const st = (k) => stats.find(s => String(s.key).toUpperCase() === k) || null
  if (!arma) return st('STR')
  if (esArmaDeRango(arma)) return st('DEX')
  if (tienePropiedad(arma, PROPIEDAD_FINESSE, 'finesse')) {
    const str = st('STR'), dex = st('DEX')
    return Number(dex?.valor) > Number(str?.valor) ? dex : str
  }
  return st('STR')
}

// Golpe sin arma: 1 + STR, bludgeoning. Es fijo, así que no hay dados que
// doblar: el crítico no cambia el daño.
export const GOLPE_SIN_ARMA = { tipo: 'fijo', valor: 1 }
export const TIPO_GOLPE_SIN_ARMA = 'bludgeoning'

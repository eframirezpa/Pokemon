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

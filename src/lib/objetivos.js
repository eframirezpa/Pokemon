// Objetivo de un ataque y lo que su tipo hace con el daño.
//
// El daño no se aplica solo (el DM decide con dados o narrativa): esto solo
// calcula y anuncia. Reglas de la mesa, las mismas de la ficha de tipos:
//   vulnerable → ×2 · resistente → ÷2 hacia abajo · inmune → 0
// No hay ×4: con doble tipo la relación ya viene combinada (typeEffect.js).
// Las armas del entrenador no pasan por aquí: no hay bonos elementales.

// Lo que no está en el campo (otro entrenador, uno mismo, algo narrativo)
export const OTRO_OBJETIVO = { clave: 'otro', tipo: 'otro', nombre: 'Otro objetivo', nombreChat: null }

const norm = (s) => String(s ?? '').trim().toLowerCase()

/** Relación de un tipo de ataque con { resist, vuln, immune } (de effectivenessBy*) */
export const relacionContra = (relaciones, tipoAtaque) => {
  const t = norm(tipoAtaque)
  if (!t || !relaciones) return 'neutral'
  if ((relaciones.immune || []).some(x => norm(x) === t)) return 'immune'
  if ((relaciones.vuln || []).some(x => norm(x) === t)) return 'vuln'
  if ((relaciones.resist || []).some(x => norm(x) === t)) return 'resist'
  return 'neutral'
}

export const danoTrasRelacion = (dano, rel) => {
  const d = Math.max(0, Number(dano) || 0)
  if (rel === 'immune') return 0
  if (rel === 'vuln') return d * 2
  if (rel === 'resist') return Math.floor(d / 2)
  return d
}

const PALABRA = { vuln: 'vulnerable', resist: 'resistente', immune: 'inmune' }
const CUENTA = { vuln: '×2', resist: '÷2', immune: '×0' }

export const etiquetaRelacion = (rel) => PALABRA[rel] || null
export const cuentaRelacion = (rel) => CUENTA[rel] || null

/** Línea del chat; null si es neutral (no hay nada que avisar) */
export const textoRelacion = (nombre, rel, tipoAtaque, dano) => {
  if (!PALABRA[rel]) return null
  const sujeto = String(nombre).charAt(0).toUpperCase() + String(nombre).slice(1)
  return `${sujeto} es ${PALABRA[rel]} al ataque de tipo ${tipoAtaque}: el daño es ${danoTrasRelacion(dano, rel)} (${dano} ${CUENTA[rel]})`
}

/** STAB: el movimiento es de alguno de los tipos del Pokémon */
export const aplicaStab = (tipoMovimiento, tiposPokemon = []) => {
  const t = norm(tipoMovimiento)
  return !!t && tiposPokemon.some(x => norm(x) === t)
}

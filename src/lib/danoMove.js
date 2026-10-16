// Daño de un movimiento del Pokémon (tabla moves).
//
// - move_has_damage = 1 → hay ventana de daño.
// - Los dados salen de move_damage_level_{1,5,10,17} según el nivel del
//   Pokémon (1-4, 5-9, 10-16, 17+).
// - move_damage_modifier: MOVE suma el modificador del power elegido para el
//   ataque, LEVEL suma el nivel y "MOVE + x" suma el power más x.
// - Crítico: se tiran el doble de dados (el modificador no se duplica).
// - Casos raros de la tabla: número fijo (Sonic Boom 16), "Rd6" = un dado por
//   ronda (Outrage, Rollout) y texto libre (Magnitude), que va a mano.

export const tieneDano = (m) => Number(m?.move_has_damage) === 1

// Fling no tiene daño en la tabla: lanza el held item y el daño es su precio
// entre 100 (hacia abajo). Sin held item o con un precio raro, 0. Es informativo.
export const esFling = (m) => String(m?.move_name || '').trim().toLowerCase() === 'fling'
export const danoFling = (costo) => {
  const v = Math.floor(Number(costo) / 100)
  return Number.isFinite(v) && v > 0 ? v : 0
}

export const esCuracion = (m) => String(m?.move_damage_type || '').trim().toLowerCase() === 'healing'

// Texto de dados que toca según el nivel
export const dadosPorNivel = (m, nivel) => {
  const n = Number(nivel) || 1
  const col = n >= 17 ? 'move_damage_level_17' : n >= 10 ? 'move_damage_level_10' : n >= 5 ? 'move_damage_level_5' : 'move_damage_level_1'
  return String(m?.[col] ?? '').trim()
}

// "2d8" → dados | "16" → fijo | "Rd6" → por ronda | "2×dice" → magnitud | otro → a mano
export const parseDados = (texto) => {
  const t = String(texto || '').trim()
  // Magnitude: "dice", "2×dice"... el dado sale del d100 y el número multiplica
  let r = /^(?:(\d+)\s*[×x*]\s*)?dice$/i.exec(t)
  if (r) return { tipo: 'magnitud', factor: Number(r[1] || 1) }
  r = /^(\d+)\s*d\s*(\d+)$/i.exec(t)
  if (r) return { tipo: 'dados', n: Number(r[1]), caras: Number(r[2]) }
  if (/^\d+$/.test(t)) return { tipo: 'fijo', valor: Number(t) }
  r = /^R\s*d\s*(\d+)$/i.exec(t)
  if (r) return { tipo: 'ronda', caras: Number(r[1]) }
  return { tipo: 'manual', texto: t }
}

// Movimientos por ronda ("Rd6"): cuántos dados da la ronda R y hasta qué
// ronda llega. R nunca baja de 1.
//   Rollout: R dados, hasta la ronda 5
//   Outrage: 2^(R-1) dados (1, 2, 4), hasta la ronda 3
const REGLAS_RONDA = {
  rollout: { max: 5, dados: (r) => r, formula: 'R' },
  outrage: { max: 3, dados: (r) => 2 ** (r - 1), formula: '2^(R−1)' },
}
const REGLA_POR_DEFECTO = { max: null, dados: (r) => r, formula: 'R' }
export const reglaRonda = (m) =>
  REGLAS_RONDA[String(m?.move_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')] || REGLA_POR_DEFECTO

// Ronda válida: entera, de 1 al tope de la regla
export const rondaValida = (ronda, regla = REGLA_POR_DEFECTO) => {
  const r = Math.max(1, Math.floor(Number(ronda) || 1))
  return regla.max ? Math.min(r, regla.max) : r
}

// Magnitude: el d100 decide la magnitud y sus dados
const MAGNITUDES = [
  { hasta: 5,   magnitud: 4,  n: 1, caras: 4 },
  { hasta: 15,  magnitud: 5,  n: 1, caras: 8 },
  { hasta: 35,  magnitud: 6,  n: 1, caras: 10 },
  { hasta: 65,  magnitud: 7,  n: 1, caras: 12 },
  { hasta: 85,  magnitud: 8,  n: 2, caras: 6 },
  { hasta: 95,  magnitud: 9,  n: 2, caras: 8 },
  { hasta: 100, magnitud: 10, n: 2, caras: 12 },
]
export const magnitudDe = (d100) => {
  const v = Math.trunc(Number(d100))
  if (!Number.isInteger(v) || v < 1 || v > 100) return null
  return MAGNITUDES.find(m => v <= m.hasta)
}

// Cantidad de dados a tirar y rango válido del resultado
export const tirada = (dados, { critico = false, ronda = 1, regla = REGLA_POR_DEFECTO, d100 = null } = {}) => {
  let base, caras
  if (dados.tipo === 'dados') { base = dados.n; caras = dados.caras }
  else if (dados.tipo === 'ronda') { base = regla.dados(rondaValida(ronda, regla)); caras = dados.caras }
  else if (dados.tipo === 'magnitud') {
    // Los dados de la magnitud, por el factor del nivel (dice, 2×dice...)
    const mg = magnitudDe(d100)
    if (!mg) return null
    base = mg.n * dados.factor; caras = mg.caras
  } else return null
  const n = base * (critico ? 2 : 1)
  return { n, caras, notacion: `${n}d${caras}`, min: n, max: n * caras }
}

// Modificador del daño. modMove = modificador del power elegido (STR, DEX...)
export const modificadorDano = (m, { modMove = 0, nivel = 1 } = {}) => {
  const t = String(m?.move_damage_modifier || '').trim().toUpperCase().replace(/\s+/g, ' ')
  if (t === 'MOVE') return { valor: Number(modMove) || 0, etiqueta: 'Move' }
  if (t === 'LEVEL') return { valor: Number(nivel) || 0, etiqueta: 'Nivel' }
  const r = /^MOVE ?\+ ?(\d+)$/.exec(t)
  if (r) return { valor: (Number(modMove) || 0) + Number(r[1]), etiqueta: `Move + ${r[1]}` }
  return { valor: 0, etiqueta: null }
}

// El modificador depende del power elegido solo con MOVE / MOVE + x
export const usaPower = (m) => /^MOVE/i.test(String(m?.move_damage_modifier || '').trim())

// Experiencia que otorga un Pokémon salvaje al ser atrapado: 200 x nivel x SR.
//
// El SR sale de la pokédex como fracción en texto ("1/8", "1/4"...) o como
// número entero; "Varies" y similares no se pueden calcular y se descartan.
const parseSR = (sr) => {
  const s = String(sr ?? '').trim()
  if (!s) return null
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number)
    return (a && b) ? a / b : null
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export const xpAlAtrapar = (level, sr) => {
  const lvl = Number(level)
  const srNum = parseSR(sr)
  if (!Number.isFinite(lvl) || lvl <= 0 || srNum == null) return null
  return Math.round(200 * lvl * srNum)
}

// Línea de experiencia para el chat. El reparto lo hace el DM a mano; esto solo
// deja anotado cuánto da. Sin SR calculable ("Varies") queda a criterio del DM.
const formatoXp = (xp) => (xp != null ? `${xp.toLocaleString('es')} XP` : 'a criterio del DM')

export const textoXpDerrota = (nombre, xp) =>
  `¡${nombre} fue derrotado! Experiencia otorgada: ${formatoXp(xp)}`

export const textoXpCaptura = (nombre, xp) =>
  `Experiencia otorgada por atrapar ${nombre ? `a ${nombre}` : 'un Pokémon'}: ${formatoXp(xp)}`

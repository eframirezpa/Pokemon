// Experiencia que otorga un Pokémon (reglas de Pokémon 5e, poke5e.app):
//   derrotarlo → 200 x nivel x SR
//   atraparlo  → 1/5 de eso ("Catching a Pokémon also gives experience, but
//                at 1/5 the normal amount")
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

export const xpAlDerrotar = (level, sr) => {
  const lvl = Number(level)
  const srNum = parseSR(sr)
  if (!Number.isFinite(lvl) || lvl <= 0 || srNum == null || srNum <= 0) return null
  return Math.round(200 * lvl * srNum)
}

export const xpAlAtrapar = (level, sr) => {
  const xp = xpAlDerrotar(level, sr)
  return xp == null ? null : Math.round(xp / 5)
}

// Línea de experiencia para el chat. El reparto lo hace el DM a mano; esto solo
// deja anotado cuánto da. Sin SR calculable ("Varies") queda a criterio del DM.
const formatoXp = (xp) => (xp != null ? `${xp.toLocaleString('es')} XP` : 'a criterio del DM')

export const textoXpDerrota = (nombre, xp) =>
  `¡${nombre} fue derrotado! Experiencia otorgada: ${formatoXp(xp)}`

export const textoXpCaptura = (nombre, xp) =>
  `Experiencia otorgada por atrapar ${nombre ? `a ${nombre}` : 'un Pokémon'}: ${formatoXp(xp)}`

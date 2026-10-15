// Talla del Pokémon (pokemon.pokemon_size) agrupada en tres para lo visual:
// pequeño (Tiny, Small), mediano (Medium) y grande (Large, Huge, Gargantuan).
// "Varies" y lo desconocido quedan en mediano, que es el tamaño de siempre.
const GRUPOS = {
  tiny: 'pequeno', small: 'pequeno',
  medium: 'mediano',
  large: 'grande', huge: 'grande', gargantuan: 'grande',
}
const ESCALAS = { pequeno: 0.75, mediano: 1, grande: 1.35 }

export const grupoTalla = (size) => GRUPOS[String(size || '').trim().toLowerCase()] || 'mediano'

// Multiplicador sobre el tamaño base (el que ya usaba cada pantalla)
export const escalaTalla = (size) => ESCALAS[grupoTalla(size)]

// Lado en px para un sprite cuadrado de `base` px
export const ladoTalla = (base, size) => Math.round(base * escalaTalla(size))

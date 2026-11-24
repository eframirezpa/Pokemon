// Qué estado causa un movimiento, leído de su descripción (poke5e). Lo usa el
// ataque del DM para ponerle el estado al objetivo cuando falla la salvación
// o recibe el golpe.
//
//   estadoDeMovimiento(move) → null | { estado, auto: true } | { estado, auto: false, motivo }
//
// - auto: la frase es directa ("must make a CON save … or become paralyzed",
//   "On a hit, they become confused"): se aplica solo.
// - auto: false: el estado depende de algo que la app no sabe (fallar por 5 o
//   más, el clima, una tirada aparte, varios estados posibles, el propio
//   usuario): el DM lo revisa a mano.

const PATRONES = [
  ['envenenado_grave', /\bbadly poison(ed|s)?\b/i],
  ['paralizado', /\b(become|becomes|becoming|is|are|be)\s+(also\s+)?paralyzed\b|\bparalyzed on a (fail|failure|hit)\b|\bparalyz(e|es) (the|a|its) (target|creature)/i],
  ['dormido', /\bfall(s|ing)?\s+asleep\b|\b(become|becomes|becoming)\s+asleep\b|\bput (them|the target|it|a creature) to sleep\b/i],
  ['envenenado', /\b(become|becomes|becoming|is|are|be)\s+(also\s+)?poisoned\b|\bpoisoned on a (fail|failure|hit)\b/i],
  ['quemado', /\b(become|becomes|becoming|is|are|be)\s+(also\s+)?(burned|burnt)\b|\binflict(s|ing)?\s+a\s+burn\b|\bcausing\s+(a\s+)?burn\b|\bburning the target\b|\bburned on a (fail|failure|hit)\b/i],
  ['congelado', /\b(become|becomes|becoming|is|are|be)\s+(also\s+)?frozen\b|\bfrozen on a (fail|failure|hit)\b/i],
  ['confuso', /\b(become|becomes|becoming|is|are|be)\s+(also\s+)?confused\b|\bconfused on a (fail|failure|hit)\b/i],
  ['retroceso', /\bflinch(es|ed)?\b/i],
]

// Si la frase del estado tiene alguna de estas, no se aplica sola
const CONDICIONES = [
  [/by 5 or more|by 10 or more/i, 'solo si falla por 5 o más'],
  [/\b(rain|sunlight|sunny|hail|sandstorm|snow|weather|terrain)\b/i, 'depende del clima o el terreno'],
  [/\broll (a|an)?\s*\d*d\d+|\bnatural\b|\b\d+ or (higher|more)\b|\b19 or 20\b|\bchance\b|\bcritical\b/i, 'depende de otra tirada'],
  [/\bfor \d+d\d+ rounds\b/i, 'dura una cantidad de rondas que se tira'],
  [/\bin this manner\b|\breduced to\b/i, 'solo en una situación concreta'],
  [/\b(you|yourself|itself|the user)\s+(become|becomes|are|is|fall|falls)\b|\bbecome .* at the end of your turn/i, 'el estado es para quien lo usa'],
  [/\bif (the target|it|they|a creature) (is|are|was|has|have)\b|\bif\b/i, 'tiene una condición'],
  [/\bcannot\b|\bcan't\b|\bprevent|\bimmune\b|\bwakes?\b|\bcure|\bremove/i, 'no causa el estado (lo impide o lo quita)'],
]

// Casos que la lectura de la frase no distingue: van a mano
const A_MANO = {
  'stun spore': 'es una reacción',
  obstruct: 'es una reacción',
  sing: 'afecta según un pozo de 5d8 de vida',
  'electric terrain': 'impide dormir, no duerme',
  rest: 'el estado es para quien lo usa',
}
// Reacciones en general: no salen del ataque del DM
const REACCION = /\byour reaction\b|\bas a reaction\b/i

const frases = (texto) => String(texto || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)

export const estadoDeMovimiento = (move) => {
  const desc = String(move?.move_description || '')
  if (!desc) return null
  const hallados = []
  for (const [estado, re] of PATRONES) {
    if (estado === 'envenenado' && hallados.some(h => h.estado === 'envenenado_grave')) continue
    const frase = frases(desc).find(f => re.test(f))
    if (frase) hallados.push({ estado, frase })
  }
  if (!hallados.length) return null
  const manual = A_MANO[String(move?.move_name || '').trim().toLowerCase()] || (REACCION.test(desc) ? 'es una reacción' : null)
  if (manual) return { estado: hallados[0].estado, auto: false, motivo: manual }
  if (hallados.length > 1) {
    return { estado: hallados[0].estado, auto: false, motivo: `puede causar varios estados (${hallados.map(h => h.estado).join(', ')})` }
  }
  const { estado, frase } = hallados[0]
  const cond = CONDICIONES.find(([re]) => re.test(frase))
  if (cond) return { estado, auto: false, motivo: cond[1] }
  return { estado, auto: true }
}

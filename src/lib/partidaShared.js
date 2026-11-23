// Constantes y helpers compartidos entre PartidaRoom.jsx y los componentes
// extraídos de su panel de combate (tarjetas de HP, panel del master, etc).

// Sprite genérico de pokébola (mismo origen que los items de la mochila)
export const POKEBALL_SPRITE = 'https://raw.githubusercontent.com/Auroratide/poke5e/main/static/assets/items/poke-ball/sprite.png'

export const hpPct   = p => Math.max(0, Math.min(100, Math.round((p.hp_current / p.hp_max) * 100)))
export const hpColor = pct => pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444'

export const TYPE_COLORS = {
  Normal:{bg:'#A8A878',dark:false}, Fire:{bg:'#F08030',dark:false}, Water:{bg:'#6890F0',dark:false},
  Grass:{bg:'#78C850',dark:false}, Electric:{bg:'#F8D030',dark:true}, Ice:{bg:'#98D8D8',dark:true},
  Fighting:{bg:'#C03028',dark:false}, Poison:{bg:'#A040A0',dark:false}, Ground:{bg:'#E0C068',dark:true},
  Flying:{bg:'#A890F0',dark:false}, Psychic:{bg:'#F85888',dark:false}, Bug:{bg:'#A8B820',dark:false},
  Rock:{bg:'#B8A038',dark:false}, Ghost:{bg:'#705898',dark:false}, Dragon:{bg:'#7038F8',dark:false},
  Dark:{bg:'#705848',dark:false}, Steel:{bg:'#B8B8D0',dark:true}, Fairy:{bg:'#EE99AC',dark:true},
}

// Color del texto que se lee mejor sobre un fondo dado (para las etiquetas de
// tipo): casi negro sobre los tipos claros y blanco sobre los oscuros. Se
// decide por contraste (luminancia WCAG), no a mano, para que valga también
// con colores nuevos.
const lumCanal = v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
export function textoSobreColor(hex) {
  const h = String(hex || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(h)) return '#FFFFFF'
  const [r, g, b] = [0, 2, 4].map(i => lumCanal(parseInt(h.slice(i, i + 2), 16)))
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // Contraste contra blanco (L=1) y contra #1C1C1E (L≈0.0118)
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.0618) ? '#FFFFFF' : '#1C1C1E'
}

// Experiencia que da un Pokémon al atraparlo: 200 x nivel x SR.
//
// El SR viene de la especie como texto y puede ser una fracción ('1/2', '1/8'),
// así que hay que dividir antes de multiplicar. Se redondea hacia arriba porque
// la experiencia es un número natural y un SR pequeño en niveles bajos daría un
// decimal.
// Contadores por evento (fire/frost): mismo mecanismo up/down, distintas etiquetas
export const COUNTER_EVENTS = {
  fire:  { up: { label: 'UP',   tone: 'green' }, down: { label: 'DOWN',    tone: 'red'  } },
  frost: { up: { label: '0 °K', tone: 'gray'  }, down: { label: '-273 °C', tone: 'gray' } },
}

// Colores de cada tono de contador. Lo usan tanto el panel del master
// (EventosPanel) como el overlay flotante que ven trainer/espectador en
// PartidaRoom — el mismo contador, en dos sitios distintos.
export const TONE = {
  green: { box: 'bg-green-100 border-green-600', text: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700' },
  red:   { box: 'bg-red-100 border-red-600',     text: 'text-red-700',   btn: 'bg-red-600 hover:bg-red-700' },
  gray:  { box: 'bg-gray-200 border-gray-400',   text: 'text-gray-700',  btn: 'bg-gray-500 hover:bg-gray-600' },
}


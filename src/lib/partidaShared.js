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

export const expAlAtrapar = (level, sr) => {
  const txt = String(sr ?? '').trim()
  if (!txt) return null
  const [num, den] = txt.split('/')
  const valorSr = den ? Number(num) / Number(den) : Number(num)
  const nivel = Number(level)
  if (!Number.isFinite(valorSr) || !Number.isFinite(nivel) || valorSr <= 0 || nivel <= 0) return null
  return Math.ceil(200 * nivel * valorSr)
}

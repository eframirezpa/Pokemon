import { TYPE_COLORS, textoSobreColor } from '../../lib/partidaShared'

// Etiqueta de tipo de Pokémon. Es la única de la app: listas, fichas, sala y
// asistentes la usan. El texto sale casi negro sobre los tipos claros y blanco
// sobre los oscuros (Fighting, Poison, Ghost, Dragon, Dark), por contraste.
//
// tamano: 'xs' (9 px, tarjetas de la sala), 'sm' (11 px, listas), 'md' (12 px, fichas)
const TAMANOS = {
  xs: 'px-1.5 py-0.5 rounded text-[9px] leading-none',
  sm: 'px-2 py-0.5 rounded-full text-[11px] leading-[1.3]',
  md: 'px-2.5 py-0.5 rounded-full text-xs leading-[1.35]',
}

export function TypeBadge({ type, tamano = 'xs' }) {
  if (!type) return null
  const bg = TYPE_COLORS[type]?.bg ?? '#888888'
  return (
    <span className={`inline-block font-bold whitespace-nowrap ${TAMANOS[tamano] ?? TAMANOS.xs}`}
      style={{ backgroundColor: bg, color: textoSobreColor(bg) }}>
      {type}
    </span>
  )
}

/* Signo de interrogación estilo Pokémon (amarillo con contorno azul) */
export function MysteryMark({ size = 'text-4xl' }) {
  return (
    <span className={`${size} font-black text-yellow-400 leading-none`}
      style={{ WebkitTextStroke: '1.5px #1e3a5f', textShadow: '0 1px 0 #1e3a5f' }}>
      ?
    </span>
  )
}

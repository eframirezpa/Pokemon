import { TYPE_COLORS } from '../../lib/partidaShared'

export function TypeBadge({ type }) {
  if (!type) return null
  const c = TYPE_COLORS[type] ?? { bg: '#888', dark: false }
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold leading-none"
      style={{ backgroundColor: c.bg, color: c.dark ? '#374151' : '#fff' }}>
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

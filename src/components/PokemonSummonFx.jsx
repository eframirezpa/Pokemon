import { useMemo } from 'react'

/**
 * Efecto de invocación del Pokémon del entrenador: el mismo instante en que
 * aparece, no solo el sprite. Cuatro capas, todas puramente decorativas y sin
 * pointer-events, que se montan una vez y se quitan solas (el padre las
 * desmonta a los ~1.3s, ver el useEffect que dispara esto en TrainerPartida).
 *
 *  1. Destello inicial: un resplandor blanco que revienta y se apaga.
 *  2. Rayo de energía: una columna de luz que sube desde abajo, marca por
 *     dónde "baja" el Pokémon.
 *  3. Partículas de disolución: chispas que salen del centro y se apagan,
 *     como si el Pokémon se estuviera terminando de formar.
 *  4. El sprite: entra de opacidad y escala 0 a su tamaño real.
 *
 * Va centrado en pantalla y no sobre el avatar chico de abajo -a esa escala
 * el destello y el rayo se verían diminutos-; el avatar chico ya queda con
 * el sprite final en cuanto este efecto termina.
 */
export default function PokemonSummonFx({ sprite }) {
  // Fresca en cada montaje: como el componente se re-crea por invocación
  // (el padre le cambia la key), no hace falta más dependencia que la nada.
  const particulas = useMemo(() => Array.from({ length: 16 }, () => {
    const angulo = Math.random() * Math.PI * 2
    const radio = 50 + Math.random() * 60
    return {
      size: 3 + Math.random() * 4,
      delay: Math.random() * 0.25,
      duration: 0.7 + Math.random() * 0.4,
      dx: `${Math.round(Math.cos(angulo) * radio)}px`,
      dy: `${Math.round(Math.sin(angulo) * radio)}px`,
    }
  }), [])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none">
      <div className="relative w-36 h-36 flex items-center justify-center">

        {/* Rayo de energía: sube desde abajo, ancho y luego se apaga */}
        <div className="absolute bottom-1/2 left-1/2 w-8 h-[60vh] -translate-x-1/2 animate-summon-beam"
          style={{
            background: 'linear-gradient(to top, rgba(252,211,77,0) 0%, rgba(252,211,77,0.85) 45%, rgba(255,255,255,0.95) 100%)',
            filter: 'blur(2px)',
          }} />

        {/* Destello inicial */}
        <span className="absolute w-28 h-28 rounded-full animate-summon-flash"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(252,211,77,0.6) 45%, rgba(252,211,77,0) 75%)' }} />

        {/* Partículas de disolución */}
        {particulas.map((p, i) => (
          <span key={i} className="absolute rounded-full animate-summon-particle"
            style={{
              width: p.size, height: p.size,
              background: 'radial-gradient(circle, #fff 0%, #facc15 70%, rgba(250,204,21,0) 100%)',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--dx': p.dx, '--dy': p.dy,
            }} />
        ))}

        {/* El sprite: entra de la nada a su tamaño real */}
        <img src={sprite} alt="" className="relative w-28 h-28 object-contain animate-summon-pokemon drop-shadow-[0_4px_16px_rgba(252,211,77,0.6)]"
          onError={e => { e.target.style.opacity = '0' }} />
      </div>
    </div>
  )
}

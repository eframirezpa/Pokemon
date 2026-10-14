import { useEffect, useRef } from 'react'

// Lo que dura todo: alternancia (3.2 s), destello y la forma nueva a color
export const EVOLUCION_FX_MS = 5200

const SILUETA = { filter: 'brightness(0) invert(1) drop-shadow(0 0 18px rgba(255,255,255,0.9))' }

/**
 * La evolución como en los juegos: las siluetas blancas de la forma vieja y
 * la nueva se alternan cada vez más rápido, un destello lo cubre todo y
 * aparece la forma nueva a color. Toda la secuencia va en CSS (index.css,
 * "evo-*"); este componente solo la monta y avisa al terminar.
 */
export default function EvolucionFx({ spriteDe, spriteA, texto, onFin }) {
  // En una ref: si el padre se vuelve a pintar a mitad de la animación, un
  // onFin nuevo no debe reiniciar el temporizador.
  const finRef = useRef(onFin)
  useEffect(() => { finRef.current = onFin })
  useEffect(() => {
    const t = setTimeout(() => finRef.current?.(), EVOLUCION_FX_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-gray-950/90 pointer-events-none animate-bgfade">
      <div className="relative w-56 h-56 flex items-center justify-center">
        {/* Halo que crece mientras dura la alternancia */}
        <div className="absolute inset-0 rounded-full animate-evo-halo"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(147,197,253,0.25) 45%, rgba(147,197,253,0) 70%)' }} />
        {spriteDe && <img src={spriteDe} alt="" className="absolute w-48 h-48 object-contain animate-evo-viejo" style={SILUETA} />}
        <img src={spriteA} alt="" className="absolute w-48 h-48 object-contain animate-evo-nuevo-silueta" style={SILUETA} />
        <img src={spriteA} alt="" className="absolute w-48 h-48 object-contain animate-evo-revelar" />
      </div>
      <div className="fixed inset-0 bg-white animate-evo-destello" />
      {texto && (
        <p className="absolute bottom-[18%] left-0 right-0 text-center text-xl font-black text-white px-6 animate-evo-texto">
          {texto}
        </p>
      )}
    </div>
  )
}

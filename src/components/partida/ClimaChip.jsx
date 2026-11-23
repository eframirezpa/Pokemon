import { useRef, useState } from 'react'
import { climaPorClave } from '../../lib/clima'

/* El clima activo y, al pulsarlo, sus reglas. Lo ve toda la mesa. */
export function ClimaChip({ clima }) {
  const [abierto, setAbierto] = useState(false)
  const c = climaPorClave(clima)
  if (!c) return null
  return (
    <div className="pointer-events-auto flex flex-col items-center">
      <button onClick={() => setAbierto(a => !a)} title="Ver las reglas del clima"
        className="modo-oscuro cristal flex items-center gap-1.5 rounded-full h-8 px-3.5 text-[13px] font-semibold text-white"
        style={{ borderColor: c.color }}>
        <span aria-hidden>{c.icono}</span> {c.nombre}
      </button>
      {abierto && (
        <div className="modo-oscuro cristal mt-1.5 w-64 rounded-2xl px-3.5 py-2.5">
          <ul className="space-y-1">
            {c.reglas.map((r, i) => <li key={i} className="text-[13px] text-[#EBEBF5] leading-snug">• {r}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * El mismo aviso en forma de botón redondo, para la columna de iconos del
 * entrenador. Las reglas se abren a la derecha con posición fija: la columna
 * hace scroll y recortaría cualquier cosa que se saliera de ella.
 */
export function ClimaIcono({ clima, className = '' }) {
  const [pos, setPos] = useState(null) // { top, left } de las reglas abiertas
  const ref = useRef(null)
  const c = climaPorClave(clima)
  if (!c) return null
  const alternar = () => {
    if (pos) { setPos(null); return }
    const r = ref.current?.getBoundingClientRect()
    // Debajo del icono y centrado en él, sin salirse de la pantalla (va arriba
    // al centro de la sala; el panel mide w-64 = 256 px)
    if (r) setPos({ top: r.bottom + 8, left: Math.max(12, Math.min(r.left + r.width / 2 - 128, window.innerWidth - 268)) })
  }
  return (
    <>
      <button ref={ref} onClick={alternar} title={`${c.nombre} · ver sus reglas`}
        className={`modo-oscuro cristal shrink-0 flex items-center justify-center w-10 h-10 rounded-full !border-2 text-lg leading-none ${className}`}
        style={{ borderColor: c.color }}>
        <span aria-hidden>{c.icono}</span>
      </button>
      {pos && (
        <div className="modo-oscuro cristal fixed z-50 w-64 rounded-2xl px-3.5 py-2.5"
          style={{ top: pos.top, left: pos.left }} onClick={() => setPos(null)}>
          <p className="text-[13px] font-semibold text-white mb-1">{c.icono} {c.nombre}</p>
          <ul className="space-y-1">
            {c.reglas.map((r, i) => <li key={i} className="text-[13px] text-[#EBEBF5] leading-snug">• {r}</li>)}
          </ul>
        </div>
      )}
    </>
  )
}

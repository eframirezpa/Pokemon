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
        className="flex items-center gap-1.5 rounded-full border bg-gray-900/90 px-3 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-sm"
        style={{ borderColor: c.color }}>
        <span aria-hidden>{c.icono}</span> {c.nombre}
      </button>
      {abierto && (
        <div className="mt-1.5 w-64 rounded-xl border border-gray-700 bg-gray-900/95 px-3 py-2 shadow-2xl">
          <ul className="space-y-1">
            {c.reglas.map((r, i) => <li key={i} className="text-[11px] text-gray-200 leading-snug">• {r}</li>)}
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
    if (r) setPos({ top: r.top, left: r.right + 8 })
  }
  return (
    <>
      <button ref={ref} onClick={alternar} title={`${c.nombre} · ver sus reglas`}
        className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-gray-900/90 shadow-lg text-lg leading-none ${className}`}
        style={{ borderColor: c.color }}>
        <span aria-hidden>{c.icono}</span>
      </button>
      {pos && (
        <div className="fixed z-50 w-64 rounded-xl border border-gray-700 bg-gray-900/95 px-3 py-2 shadow-2xl"
          style={{ top: pos.top, left: pos.left }} onClick={() => setPos(null)}>
          <p className="text-xs font-bold text-white mb-1">{c.icono} {c.nombre}</p>
          <ul className="space-y-1">
            {c.reglas.map((r, i) => <li key={i} className="text-[11px] text-gray-200 leading-snug">• {r}</li>)}
          </ul>
        </div>
      )}
    </>
  )
}

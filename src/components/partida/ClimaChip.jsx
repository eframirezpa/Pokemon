import { useState } from 'react'
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

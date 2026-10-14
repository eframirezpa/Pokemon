import { useState } from 'react'
import { apiFetch } from '../../api'
import { CLIMAS } from '../../lib/clima'

/* Clima de combate (solo el máster). Se guarda en la partida y se avisa a la
   mesa; los jugadores lo ven como efecto en pantalla con sus reglas. */
export function ClimaPanel({ partidaId, clima, onCambio }) {
  const [busy, setBusy] = useState(false)

  const poner = async (clave) => {
    const nuevo = clave === clima ? null : clave
    setBusy(true)
    try {
      const res = await apiFetch(`/partida/${partidaId}/clima`, { method: 'PATCH', body: JSON.stringify({ clima: nuevo }) })
      if (res.ok) onCambio?.((await res.json()).clima ?? null)
    } finally { setBusy(false) }
  }

  return (
    <div className="shrink-0 px-4 pt-3">
      <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5">
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Clima de combate</p>
        <div className="flex flex-wrap gap-1.5">
          {CLIMAS.map(c => {
            const activo = clima === c.clave
            return (
              <button key={c.clave} onClick={() => poner(c.clave)} disabled={busy}
                title={activo ? 'Quitar el clima' : c.reglas.join(' ')}
                className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                  activo ? 'text-gray-900 border-transparent' : 'text-gray-200 border-gray-600 bg-gray-700 hover:bg-gray-600'}`}
                style={activo ? { backgroundColor: c.color } : undefined}>
                <span aria-hidden>{c.icono}</span> {c.nombre}
              </button>
            )
          })}
        </div>
        {clima && <p className="text-[10px] text-gray-500 mt-1.5">Pulsa el clima activo para quitarlo.</p>}
      </div>
    </div>
  )
}

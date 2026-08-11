import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

// Items del entrenador dentro del panel de combate.
//
// Solo se listan los que se consumen en mesa: medicinas y bayas. Las pokébolas,
// el equipo de entrenador, los objetos equipados y las piedras de evolución
// tienen sus propios flujos y no se gastan desde aquí.
//
// La app NO aplica el efecto: lo resuelve el DM en la mesa. Lo único que hace
// "Usar" es descontar una unidad, y por eso el aviso es parte del flujo y no
// una nota al pie.
const TIPOS = ['medicine', 'berry']

export default function ItemsPanel({ personajeId }) {
  const [items, setItems]     = useState(null)
  const [abierto, setAbierto] = useState(null) // id con el detalle desplegado
  const [usando, setUsando]   = useState(null) // item en confirmación
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    let vivo = true
    apiFetch(`/personaje/${personajeId}/equipo`)
      .then(r => r.json())
      .then(d => {
        if (!vivo) return
        const lista = (Array.isArray(d) ? d : [])
          .filter(i => TIPOS.includes(String(i.item_type || '').toLowerCase()))
          .filter(i => Number(i.cantidad) > 0)
        setItems(lista)
      })
      .catch(() => { if (vivo) { setItems([]); setError('No se pudieron cargar los items') } })
    return () => { vivo = false }
  }, [personajeId])

  const confirmarUso = async () => {
    if (!usando || busy) return
    setBusy(true); setError('')
    try {
      const restante = Math.max(0, Number(usando.cantidad) - 1)
      const res = await apiFetch(`/personaje/${personajeId}/equipo/${usando.id_personaje_equipo}`,
        { method: 'PATCH', body: JSON.stringify({ cantidad: restante }) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'No se pudo usar el item')
        return
      }
      // Gastado el último, el item deja de estar disponible
      setItems(prev => (prev || [])
        .map(i => i.id_personaje_equipo === usando.id_personaje_equipo ? { ...i, cantidad: restante } : i)
        .filter(i => Number(i.cantidad) > 0))
      setUsando(null)
    } catch { setError('No se pudo usar el item') }
    finally { setBusy(false) }
  }

  if (items === null) {
    return <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><PokeballSpinner size={12} /> Cargando…</p>
  }

  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <p className="text-[11px] text-gray-500 italic">Sin medicinas ni bayas.</p>
      ) : items.map(i => {
        const open = abierto === i.id_personaje_equipo
        return (
          <div key={i.id_personaje_equipo} className="bg-gray-700/50 rounded-lg px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setAbierto(open ? null : i.id_personaje_equipo)}
                className="min-w-0 flex-1 text-left text-white text-xs font-medium truncate hover:text-amber-300 transition-colors">
                {i.item_name}
              </button>
              {/* El tipo va fuera del botón: no debe desplegar la descripción */}
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-gray-400
                               bg-gray-800/60 border border-gray-600 rounded px-1.5 py-0.5">
                {i.item_type}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-black tabular-nums text-gray-300">x{i.cantidad}</span>
                <button onClick={() => { setUsando(i); setError('') }}
                  className="text-[10px] font-bold uppercase tracking-wide text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-md transition-colors">
                  Usar
                </button>
              </div>
            </div>
            {open && (
              <p className="mt-1 text-[11px] text-gray-400 whitespace-pre-line">
                {i.item_description || 'Sin descripción.'}
              </p>
            )}
          </div>
        )
      })}

      {error && !usando && <p className="text-[11px] text-red-400 font-medium">{error}</p>}

      {/* Confirmación: el efecto lo aplica el DM, aquí solo se descuenta */}
      {usando && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget && !busy) setUsando(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 truncate">{usando.item_name}</h3>
              <p className="text-[11px] text-gray-500">Quedan {usando.cantidad}</p>
            </div>
            <div className="px-5 py-4 overflow-y-auto space-y-3">
              <p className="text-xs text-gray-700 whitespace-pre-line">
                {usando.item_description || 'Sin descripción.'}
              </p>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-snug">
                  Los efectos deben aplicarse manualmente. Si esto no es posible plásmalo en tus Pokenotas
                  para que puedas recordarle al DM los efectos. Hazle saber al DM que usarás el item.
                </p>
              </div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setUsando(null)} disabled={busy}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
              <button onClick={confirmarUso} disabled={busy}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
                {busy && <PokeballSpinner size={14} />} Usar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

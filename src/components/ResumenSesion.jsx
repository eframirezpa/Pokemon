import { useState, useEffect } from 'react'
import { X, History } from 'lucide-react'
import { apiFetch } from '../api'

// Qué se cuenta y cómo se nombra en el resumen (tipos de partida_log_tipo)
const CONTEOS = [
  ['captura', 'Capturas', '#22c55e'],
  ['evolucion', 'Evoluciones', '#3b82f6'],
  ['nivel', 'Subidas de nivel', '#f59e0b'],
  ['aparicion', 'Apariciones', '#a855f7'],
  ['ataque', 'Ataques', '#ef4444'],
  ['item', 'Items usados', '#14b8a6'],
  ['tirada', 'Tiradas', '#9ca3af'],
  ['pokemon', 'Liberados / transferidos', '#eab308'],
]
const ICONO = { captura: '⚪', evolucion: '✨', nivel: '⬆️', pokemon: '🔄' }

const fecha = (iso) => new Date(iso).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * "En la sesión anterior…": lo que pasó la última vez que se jugó, armado con
 * el registro persistido (la sesión es un tramo de actividad sin pausas de más
 * de 6 horas; ver back/src/lib/sesiones.js). Se abre solo la primera vez que
 * cada usuario entra después de esa sesión, y queda el botón para verlo otra vez.
 */
export default function ResumenSesion({ partidaId, userId }) {
  const [sesion, setSesion] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const clave = `resumen-sesion-${partidaId}-${userId}`

  useEffect(() => {
    if (!partidaId || !userId) return
    let vivo = true
    apiFetch(`/partida/${partidaId}/log/resumen`).then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!vivo || !d?.sesion) return
        setSesion(d.sesion)
        let visto = null
        try { visto = localStorage.getItem(clave) } catch { /* sin almacenamiento: se muestra igual */ }
        if (visto !== String(d.sesion.id_inicio)) setAbierto(true)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [partidaId, userId, clave])

  if (!sesion) return null

  const cerrar = () => {
    try { localStorage.setItem(clave, String(sesion.id_inicio)) } catch { /* noop */ }
    setAbierto(false)
  }
  const conteos = CONTEOS.filter(([t]) => sesion.conteos?.[t])

  return (
    <>
      <button onClick={() => setAbierto(true)} title="Lo que pasó en la sesión anterior"
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-amber-300 transition-colors">
        <History size={12} /> Sesión anterior
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-white text-lg leading-tight">En la sesión anterior…</h3>
                <p className="text-xs text-gray-400 first-letter:uppercase">{fecha(sesion.desde)}</p>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-white shrink-0"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {conteos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {conteos.map(([t, label, color]) => (
                    <div key={t} className="rounded-xl border px-3 py-2"
                      style={{ borderColor: `${color}55`, backgroundColor: `${color}14` }}>
                      <p className="text-2xl font-black tabular-nums" style={{ color }}>{sesion.conteos[t]}</p>
                      <p className="text-[11px] font-bold text-gray-300">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Hubo {sesion.total} movimientos en el registro.</p>
              )}

              {sesion.destacados.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Momentos destacados</p>
                  <div className="space-y-1.5">
                    {sesion.destacados.map((d, i) => (
                      <p key={i} className="text-sm text-gray-200 bg-gray-900/60 rounded-lg px-3 py-1.5 flex gap-2">
                        <span aria-hidden>{ICONO[d.tipo] || '•'}</span><span>{d.texto}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-700 flex justify-end">
              <button onClick={cerrar} className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg">
                ¡A jugar!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

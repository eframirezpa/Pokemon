import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  ['feat', 'Feats extra', '#c084fc'],
]
const ICONO = { captura: '⚪', evolucion: '✨', nivel: '⬆️', pokemon: '🔄', feat: '🎓' }

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
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-texto-2 hover:text-tinte transition-colors">
        <History size={12} /> Sesión anterior
      </button>

      {/* Portal a <body>: el botón vive en el panel de actividad, que es de
          cristal (backdrop-filter) y encerraría la ventana dentro de él. Fuera
          de la sala pierde la clase del contenedor, así que lleva la suya. */}
      {abierto && createPortal(
        <div className="modo-oscuro fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
          onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-md max-h-[85vh] flex flex-col shadow-hoja overflow-hidden">
            <div className="px-5 py-4 border-b border-separador flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-white text-lg leading-tight">En la sesión anterior…</h3>
                <p className="text-xs text-texto-2 first-letter:uppercase">{fecha(sesion.desde)}</p>
              </div>
              <button onClick={cerrar} aria-label="Cerrar" className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2 hover:text-texto shrink-0 disabled:opacity-40"><X size={16} strokeWidth={2.4} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {conteos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {conteos.map(([t, label, color]) => (
                    <div key={t} className="rounded-xl border px-3 py-2"
                      style={{ borderColor: `${color}55`, backgroundColor: `${color}14` }}>
                      <p className="text-2xl font-black tabular-nums" style={{ color }}>{sesion.conteos[t]}</p>
                      <p className="text-[11px] font-bold text-texto">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-texto-2">Hubo {sesion.total} movimientos en el registro.</p>
              )}

              {sesion.destacados.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-texto-2 mb-1.5">Momentos destacados</p>
                  <div className="space-y-1.5">
                    {sesion.destacados.map((d, i) => (
                      <p key={i} className="text-sm text-texto bg-superficie rounded-lg px-3 py-1.5 flex gap-2">
                        <span aria-hidden>{ICONO[d.tipo] || '•'}</span><span>{d.texto}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-separador flex justify-end">
              <button onClick={cerrar} className="h-10 px-6 rounded-full text-[15px] font-semibold text-white bg-acento hover:bg-acento-hover">
                ¡A jugar!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

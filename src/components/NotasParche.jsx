import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { PARCHES, PARCHE_ACTUAL } from '../lib/parches'

// Notas del parche actual, con los anteriores plegados debajo.
//
// NotasParche es la ventana: se monta una vez por pantalla y, con `auto`, se
// abre sola la primera vez que cada usuario entra con una versión nueva
// (localStorage, igual que el resumen de sesión). BotonParche la reabre desde
// cualquier sitio con un evento de window, para no tener que pasar estado
// entre el panel de actividad y la sala.

const EVENTO = 'abrir-notas-parche'
const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })

export function BotonParche({ className = '' }) {
  return (
    <button onClick={() => window.dispatchEvent(new Event(EVENTO))} title="Novedades de la versión actual"
      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-amber-300 transition-colors ${className}`}>
      <Sparkles size={12} /> Parche {PARCHE_ACTUAL.version}
    </button>
  )
}

// ¿Ya vio este usuario el parche actual? Sin almacenamiento cuenta como visto:
// mejor no abrirla sola en cada entrada que no poder cerrarla para siempre.
const yaVisto = (clave) => {
  try { return localStorage.getItem(clave) === PARCHE_ACTUAL.version } catch { return true }
}

export default function NotasParche({ userId = null, auto = false }) {
  const clave = `parche-visto-${userId ?? 'anon'}`
  const [abierto, setAbierto] = useState(() => auto && userId != null && !yaVisto(clave))
  const [verAnteriores, setVerAnteriores] = useState(false)

  useEffect(() => {
    const abrir = () => setAbierto(true)
    window.addEventListener(EVENTO, abrir)
    return () => window.removeEventListener(EVENTO, abrir)
  }, [])

  if (!abierto) return null

  const cerrar = () => {
    try { localStorage.setItem(clave, PARCHE_ACTUAL.version) } catch { /* noop */ }
    setAbierto(false)
  }
  const anteriores = PARCHES.slice(1)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">Parche actual</p>
            <h3 className="font-black text-white text-lg leading-tight">Versión {PARCHE_ACTUAL.version}</h3>
            <p className="text-xs text-gray-400">{fecha(PARCHE_ACTUAL.fecha)}</p>
          </div>
          <button onClick={cerrar} className="text-gray-400 hover:text-white shrink-0"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <ul className="space-y-1.5">
            {PARCHE_ACTUAL.cambios.map((c, i) => (
              <li key={i} className="text-sm text-gray-200 bg-gray-900/60 rounded-lg px-3 py-1.5 flex gap-2">
                <span aria-hidden className="text-amber-400">•</span><span>{c}</span>
              </li>
            ))}
          </ul>

          {anteriores.length > 0 && (
            <div>
              <button onClick={() => setVerAnteriores(v => !v)}
                className="text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300">
                {verAnteriores ? 'Ocultar' : 'Ver'} parches anteriores
              </button>
              {verAnteriores && anteriores.map(p => (
                <div key={p.version} className="mt-3">
                  <p className="text-xs font-black text-gray-300">{p.version} <span className="font-normal text-gray-500">· {fecha(p.fecha)}</span></p>
                  <ul className="mt-1 space-y-0.5">
                    {p.cambios.map((c, i) => <li key={i} className="text-xs text-gray-400">• {c}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex justify-end">
          <button onClick={cerrar} className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg">
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

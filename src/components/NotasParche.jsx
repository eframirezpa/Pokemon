import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import Hoja from './ui/Hoja'
import Boton from './ui/Boton'
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

// variante 'plano' (por defecto): texto gris pequeño que se tiñe al pasar.
// variante 'banda': texto claro subrayado, para ir sobre la banda morada.
export function BotonParche({ className = '', variante = 'plano' }) {
  const estilo = variante === 'banda'
    ? 'text-[15px] text-[#F0DCFA] underline decoration-white/40 underline-offset-[3px] hover:text-white'
    : 'text-[11px] font-semibold uppercase tracking-[.08em] text-texto-2 hover:text-tinte'
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(EVENTO))} title="Novedades de la versión actual"
      className={`inline-flex items-center gap-1 transition-colors ${estilo} ${className}`}>
      <Sparkles size={variante === 'banda' ? 14 : 12} aria-hidden /> Parche {PARCHE_ACTUAL.version}
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
    <Hoja z="z-[90]" onClose={cerrar} ancho="sm:max-w-md"
      titulo={
        <span className="block">
          <small className="block text-[11px] font-semibold uppercase tracking-[.06em] text-tinte">Parche actual</small>
          <span className="block">Versión {PARCHE_ACTUAL.version}</span>
          <small className="block text-xs font-normal text-texto-2 tracking-normal">{fecha(PARCHE_ACTUAL.fecha)}</small>
        </span>
      }
      pie={<Boton tamano="lg" onClick={cerrar}>Entendido</Boton>}>
      <div className="flex flex-col gap-4">
        <ul className="bg-superficie rounded-grupo divide-y divide-separador overflow-hidden">
          {PARCHE_ACTUAL.cambios.map((c, i) => (
            <li key={i} className="text-[15px] leading-snug text-texto px-4 py-2.5 flex gap-2.5">
              <span aria-hidden className="text-tinte">•</span><span>{c}</span>
            </li>
          ))}
        </ul>

        {anteriores.length > 0 && (
          <div>
            <button type="button" onClick={() => setVerAnteriores(v => !v)}
              className="text-[15px] text-tinte hover:opacity-75 px-1">
              {verAnteriores ? 'Ocultar' : 'Ver'} parches anteriores
            </button>
            {verAnteriores && anteriores.map(p => (
              <div key={p.version} className="mt-3">
                <p className="text-[13px] font-semibold text-texto-2 uppercase tracking-[.03em] px-4 pb-1.5">
                  {p.version} <span className="font-normal normal-case tracking-normal">· {fecha(p.fecha)}</span>
                </p>
                <ul className="bg-superficie rounded-grupo divide-y divide-separador overflow-hidden">
                  {p.cambios.map((c, i) => <li key={i} className="text-[13px] text-texto-2 px-4 py-2">{c}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Hoja>
  )
}

import { X } from 'lucide-react'
import { ESTADOS, leerEstados } from '../lib/estados'

/**
 * Los estados de alguien, en pequeño y de solo lectura (party, tarjetas).
 *
 * Con `iconPx` se pinta solo el icono, sin borde de texto ni etiqueta, del
 * tamaño exacto que se le pida: es lo que va debajo del avatar del entrenador
 * y del Pokémon, donde tienen que verse a la mitad del tamaño del avatar.
 */
export function EstadosChips({ estados, size = 'normal', iconPx }) {
  const lista = leerEstados(estados)
  if (!lista.length) return null

  if (iconPx) {
    return (
      <span className="inline-flex items-center justify-center gap-0.5">
        {lista.map(e => (
          <span key={e.clave} title={e.label} aria-hidden="true"
            className="inline-flex items-center justify-center rounded-full border shrink-0"
            style={{
              width: iconPx, height: iconPx, lineHeight: 1,
              fontSize: Math.round(iconPx * 0.62),
              color: e.color, borderColor: `${e.color}66`, backgroundColor: `${e.color}1A`,
            }}>
            {e.icono}
          </span>
        ))}
      </span>
    )
  }

  const chico = size === 'chico'
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {lista.map(e => (
        <span key={e.clave} title={e.label}
          className={`inline-flex items-center gap-0.5 rounded-full border font-bold leading-none ${
            chico ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'}`}
          style={{ color: e.color, borderColor: `${e.color}66`, backgroundColor: `${e.color}1A` }}>
          <span aria-hidden>{e.icono}</span>
          {!chico && e.label}
        </span>
      ))}
    </span>
  )
}

/** El botón que abre el selector: una carita, del tamaño exacto que se le pida. */
export function EstadoTrigger({ size = 22, onClick, title = 'Estados' }) {
  return (
    <button onClick={onClick} title={title}
      className="flex items-center justify-center rounded-full bg-gray-800/90 border border-gray-600
                 hover:border-amber-400 hover:bg-gray-700 transition-colors shrink-0 text-yellow-400"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.62), lineHeight: 1 }}>
      ☣
    </button>
  )
}

/**
 * Botonera para ponerse y quitarse estados. Se pulsa y se apaga: no hay guardar,
 * porque en mesa el estado cambia a mitad de un turno y nadie va a confirmar un
 * formulario para decir que se quemó.
 */
export default function EstadosControl({ estados, onChange, disabled = false }) {
  const activos = new Set(leerEstados(estados).map(e => e.clave))

  const alternar = (clave) => {
    if (disabled) return
    const siguiente = new Set(activos)
    if (siguiente.has(clave)) siguiente.delete(clave)
    else siguiente.add(clave)
    onChange?.(ESTADOS.filter(e => siguiente.has(e.clave)).map(e => e.clave))
  }

  return (
    <div className="flex flex-wrap gap-1">
      {ESTADOS.map(e => {
        const on = activos.has(e.clave)
        return (
          <button key={e.clave} onClick={() => alternar(e.clave)} disabled={disabled}
            title={on ? `Quitar ${e.label.toLowerCase()}` : e.label}
            className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-bold
                        transition-colors disabled:opacity-40 ${on ? '' : 'border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
            style={on ? { color: e.color, borderColor: `${e.color}99`, backgroundColor: `${e.color}26` } : undefined}>
            <span aria-hidden>{e.icono}</span> {e.label}
          </button>
        )
      })}
    </div>
  )
}

/** El selector en un popup, para abrirlo desde la carita junto al avatar. */
export function EstadosPopup({ titulo, estados, onChange, onClose }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">{titulo}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">
          <EstadosControl estados={estados} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}

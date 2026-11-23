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
 * Botonera para ponerse y quitarse el estado. Un ser vivo tiene un solo estado
 * a la vez: elegir otro reemplaza al que tenía, pulsar el que ya tiene lo
 * quita y "Ninguno" lo limpia. No hay guardar: en mesa el estado cambia a
 * mitad de un turno y nadie va a confirmar un formulario para decir que se quemó.
 */
export default function EstadosControl({ estados, onChange, disabled = false }) {
  // Si quedaron varios de antes, cuenta el primero
  const actual = leerEstados(estados)[0]?.clave ?? null

  const elegir = (clave) => {
    if (disabled) return
    onChange?.(clave && clave !== actual ? [clave] : [])
  }

  return (
    <div className="flex flex-wrap gap-1">
      <button onClick={() => elegir(null)} disabled={disabled} title="Sin estado"
        className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-40 ${
          actual ? 'border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500'
                 : 'border-gray-300 bg-gray-200/15 text-white'}`}>
        <span aria-hidden>⊘</span> Ninguno
      </button>
      {ESTADOS.map(e => {
        const on = actual === e.clave
        return (
          <button key={e.clave} onClick={() => elegir(e.clave)} disabled={disabled}
            title={on ? `Quitar ${e.label.toLowerCase()}` : actual ? `Cambiar a ${e.label.toLowerCase()}` : e.label}
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

/**
 * Aro de estados alrededor del avatar (entrenador o Pokémon invocado): negro,
 * con el icono del estado arriba y su nombre en naranja abajo, siguiendo la
 * curva. Con varios estados van todos los iconos arriba y los nombres juntos.
 *
 * Se monta dentro del contenedor `relative` del avatar y se centra sobre él;
 * no captura clics, el avatar sigue abriendo su panel. `px` es el lado del
 * avatar; el aro sobresale una banda por cada lado.
 */
export function EstadosAro({ estados, px = 44 }) {
  const lista = leerEstados(estados)
  if (!lista.length) return null

  const banda = Math.round(px * 0.15)          // grosor del aro
  const lado = px + banda * 2 + 4              // un respiro entre avatar y aro
  const c = lado / 2
  const r = c - banda / 2                      // radio al centro de la banda
  // La letra cabe dentro de la banda; el icono no se encoge con el aro y
  // puede sobresalir de él
  const fuente = Math.max(5, Math.round(banda * 0.8))
  const icono = Math.round(px * 0.23)
  const texto = lista.map(e => e.label.toUpperCase()).join(' · ')
  // Mitad inferior del aro, de izquierda a derecha: el texto queda derecho
  const arco = `M ${c - r} ${c} A ${r} ${r} 0 0 0 ${c + r} ${c}`
  const largoArco = Math.PI * r
  // Si los nombres no caben en la mitad de abajo, se aprietan para que quepan
  const largoTexto = texto.length * fuente * 0.66
  const ajustar = largoTexto > largoArco * 0.92
  const idArco = `aro-estado-${px}-${lista.map(e => e.clave).join('-')}`

  return (
    <span aria-label={`Estados: ${lista.map(e => e.label).join(', ')}`}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ width: lado, height: lado }}>
      <svg width={lado} height={lado} viewBox={`0 0 ${lado} ${lado}`} className="absolute inset-0 overflow-visible">
        <defs><path id={idArco} d={arco} /></defs>
        {/* El aro: negro, con un filo naranja tenue para que se despegue del fondo */}
        <circle cx={c} cy={c} r={r} fill="none" stroke="#0a0a0a" strokeOpacity="0.92" strokeWidth={banda} />
        <circle cx={c} cy={c} r={r + banda / 2} fill="none" stroke="#FF9F1C" strokeOpacity="0.45" strokeWidth="1" />
        <circle cx={c} cy={c} r={r - banda / 2} fill="none" stroke="#FF9F1C" strokeOpacity="0.3" strokeWidth="1" />
        <text fill="#FF9F1C" fontSize={fuente} fontWeight="800" letterSpacing="0.04em" dominantBaseline="central"
          style={{ fontFamily: 'system-ui, sans-serif' }}>
          <textPath href={`#${idArco}`} startOffset="50%" textAnchor="middle"
            {...(ajustar ? { textLength: largoArco * 0.9, lengthAdjust: 'spacingAndGlyphs' } : {})}>
            {texto}
          </textPath>
        </text>
      </svg>
      {/* Iconos arriba, sobre la banda */}
      <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-px leading-none"
        style={{ top: banda / 2, fontSize: icono }}>
        {lista.map(e => <span key={e.clave} title={e.label}>{e.icono}</span>)}
      </span>
    </span>
  )
}

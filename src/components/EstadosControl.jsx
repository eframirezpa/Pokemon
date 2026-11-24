import { useState } from 'react'
import Hoja from './ui/Hoja'
import Boton from './ui/Boton'
import { textoSobreColor } from '../lib/partidaShared'
import { ESTADOS, leerEstados, clavesEstados, alternarEstado, enGracia } from '../lib/estados'

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
      className="flex items-center justify-center rounded-full bg-relleno border border-separador
                 hover:border-tinte hover:bg-relleno-2 transition-colors shrink-0 text-amber-400"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.62), lineHeight: 1 }}>
      ☣
    </button>
  )
}

/**
 * Botonera para poner y quitar estados. Puede tener uno no volátil y uno
 * volátil (Confuso, Retroceso) a la vez: elegir otro de la misma clase
 * reemplaza al que tenía, pulsar el que ya tiene lo quita y "Ninguno" limpia
 * todo. No hay guardar: en mesa el estado cambia a mitad de un turno.
 *
 * inmunes: no se pueden poner por su tipo · meta: sus datos (periodo de
 * gracia: recién curado, no puede volver a sufrirlo todavía).
 * Congelado pide el DC para liberarse (dcSugerido de entrada).
 * onChange(lista, { dc })
 *
 * Mismo aspecto que las cápsulas de filtro (ui/Pagina): redondas, en relleno,
 * y la activa con el color del estado.
 */
export default function EstadosControl({ estados, meta = null, onChange, disabled = false, inmunes = [], dcSugerido = 12 }) {
  const actuales = clavesEstados(estados)
  const [pidiendoDc, setPidiendoDc] = useState(false)
  const [dc, setDc] = useState(String(dcSugerido))

  const elegir = (clave) => {
    if (disabled) return
    if (clave === 'congelado' && !actuales.includes('congelado')) { setPidiendoDc(true); return }
    setPidiendoDc(false)
    onChange?.(clave ? alternarEstado(actuales, clave) : [], {})
  }

  const capsula = 'shrink-0 h-[30px] px-3 rounded-full text-[13px] inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const grupo = (volatil) => ESTADOS.filter(e => !!e.volatil === volatil).map(e => {
    const on = actuales.includes(e.clave)
    const inmune = inmunes.includes(e.clave) && !on
    const gracia = !on && enGracia(meta, e.clave)
    return (
      <button key={e.clave} type="button" onClick={() => elegir(e.clave)} disabled={disabled || inmune || gracia} aria-pressed={on}
        title={inmune ? `Inmune a ${e.label.toLowerCase()} por su tipo`
          : gracia ? 'Se acaba de recuperar: no puede volver a sufrirlo hasta el final de su siguiente turno'
          : on ? `Quitar ${e.label.toLowerCase()}` : e.label}
        style={on ? { backgroundColor: e.color, color: textoSobreColor(e.color) } : undefined}
        className={`${capsula} ${on ? 'font-semibold' : 'font-medium bg-relleno text-texto hover:bg-relleno-2'} ${inmune ? 'line-through' : ''}`}>
        <span aria-hidden>{e.icono}</span>{e.label}{gracia && <span aria-hidden>⏳</span>}
      </button>
    )
  })
  const titulo = 'text-[12px] font-semibold uppercase tracking-[.06em] text-texto-2 mb-1.5'

  return (
    <div className="space-y-4">
      <div>
        <p className={titulo}>Estado</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => elegir(null)} disabled={disabled} aria-pressed={!actuales.length} title="Sin estados"
            className={`${capsula} ${actuales.length ? 'font-medium bg-relleno text-texto hover:bg-relleno-2' : 'font-semibold bg-acento text-white'}`}>
            Ninguno
          </button>
          {grupo(false)}
        </div>
      </div>
      <div>
        <p className={titulo}>Volátil <span className="normal-case tracking-normal font-normal">· se suma al de arriba</span></p>
        <div className="flex flex-wrap gap-1.5">{grupo(true)}</div>
      </div>
      {pidiendoDc && (
        <div className="rounded-xl bg-superficie px-3 py-2.5 space-y-2">
          <p className="text-[15px] font-semibold">❄️ Congelado</p>
          <label className="flex items-center justify-between gap-3 text-[13px] text-texto-2">
            DC para liberarse (10 + proficiencia de quien lo congeló)
            <input type="number" min={1} max={40} inputMode="numeric" value={dc} onChange={e => setDc(e.target.value)} aria-label="DC de Congelado"
              className="w-16 h-9 rounded-lg bg-relleno text-center text-[15px] font-semibold tabular-nums text-texto focus:outline-none focus:ring-2 focus:ring-tinte/50" />
          </label>
          <div className="flex justify-end gap-2">
            <Boton variante="tintado" onClick={() => setPidiendoDc(false)}>Cancelar</Boton>
            <Boton onClick={() => { setPidiendoDc(false); onChange?.(alternarEstado(actuales, 'congelado'), { dc: Number(dc) || 12 }) }}>Congelar</Boton>
          </div>
        </div>
      )}
    </div>
  )
}

/** El selector en una ventana como las demás (Hoja), para abrirlo desde ☣. */
export function EstadosPopup({ titulo, estados, meta = null, onChange, onClose, inmunes = [], nota = null, dcSugerido = 12 }) {
  return (
    <Hoja titulo={titulo} onClose={onClose} ancho="sm:max-w-md" z="z-[95]"
      pie={<div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-texto-2">Los cambios se guardan al tocarlos.</p>
        <Boton onClick={onClose}>Listo</Boton>
      </div>}>
      <EstadosControl estados={estados} meta={meta} onChange={onChange} inmunes={inmunes} dcSugerido={dcSugerido} />
      {nota && <p className="mt-3 text-[12px] text-texto-2">{nota}</p>}
    </Hoja>
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

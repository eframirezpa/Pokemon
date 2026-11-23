import { ChevronRight, ChevronDown } from 'lucide-react'

// Lista agrupada al estilo de Ajustes de iOS: un bloque blanco redondeado con
// filas separadas por una línea fina que no llega al borde izquierdo.
//
//   <ListaAgrupada titulo="Habilidades">
//     <Celda titulo="Static" detalle="…" />
//     <Celda titulo="Pokédex" onClick={…} chevron />
//   </ListaAgrupada>
//
// La línea entre filas la pone `divide-y` sobre los hijos directos, así que
// cada Celda (o cualquier hijo) queda separado sin que tenga que saberlo.
export function ListaAgrupada({ titulo = null, pie = null, className = '', children }) {
  return (
    <section className={className}>
      {titulo && (
        <h3 className="text-[13px] font-semibold text-texto-2 uppercase tracking-[.03em] px-4 pb-1.5">{titulo}</h3>
      )}
      <div className="bg-superficie rounded-grupo overflow-hidden divide-y divide-separador">
        {children}
      </div>
      {pie && <p className="text-xs text-texto-2 px-4 pt-1.5">{pie}</p>}
    </section>
  )
}

// Fila de una lista agrupada.
//
//   icono     — nodo a la izquierda (sprite, icono en cuadro…)
//   titulo    — texto principal; subtitulo debajo, en gris
//   valor     — texto o nodo a la derecha, en gris
//   chevron   — flecha a la derecha (navega)
//   onClick   — la fila entera es un botón
//   activa    — resaltada (fila seleccionada)
//   children  — contenido libre en lugar de titulo/subtitulo
export function Celda({ icono = null, titulo = null, subtitulo = null, valor = null, chevron = false,
                        onClick = null, activa = false, className = '', children }) {
  const contenido = (
    <>
      {icono && <span className="shrink-0 flex items-center">{icono}</span>}
      <span className="flex-1 min-w-0">
        {children ?? (
          <>
            {titulo && <span className="block font-medium text-[15px] text-texto truncate">{titulo}</span>}
            {subtitulo && <span className="block text-xs text-texto-2 truncate">{subtitulo}</span>}
          </>
        )}
      </span>
      {valor != null && (
        <span className="shrink-0 flex items-center gap-1.5 text-[15px] text-texto-2 tabular-nums">{valor}</span>
      )}
      {chevron && <ChevronRight size={16} className="shrink-0 text-texto-2 opacity-60" aria-hidden />}
    </>
  )
  const base = `w-full min-h-11 px-4 py-2 flex items-center gap-3 text-left ${activa ? 'bg-tinte/10' : ''} ${className}`
  if (!onClick) return <div className={base}>{contenido}</div>
  return (
    <button type="button" onClick={onClick}
      className={`${base} transition-colors ${activa ? '' : 'hover:bg-relleno'} focus-visible:outline-none focus-visible:bg-relleno`}>
      {contenido}
    </button>
  )
}

// Fila que se despliega al tocarla y muestra el detalle debajo, dentro del
// mismo bloque. La usan los catálogos (orígenes, rasgos, naturalezas…).
export function CeldaDesplegable({ titulo, subtitulo = null, valor = null, icono = null, abierta, onToggle, children }) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={abierta}
        className={`w-full min-h-11 px-4 py-2 flex items-center gap-3 text-left transition-colors
                    ${abierta ? 'bg-tinte/[.07]' : 'hover:bg-relleno'} focus-visible:outline-none focus-visible:bg-relleno`}>
        {icono && <span className="shrink-0 flex items-center">{icono}</span>}
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[15px] text-texto">{titulo}</span>
          {/* Abierta, el detalle ya lo cuenta: el resumen sobraría */}
          {subtitulo && !abierta && <span className="block text-xs text-texto-2 truncate">{subtitulo}</span>}
        </span>
        {valor != null && <span className="shrink-0 flex items-center gap-1.5 text-sm text-texto-2">{valor}</span>}
        <ChevronDown size={16} aria-hidden
          className={`shrink-0 text-texto-2 opacity-70 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`} />
      </button>
      {abierta && (
        <div className="px-4 pb-4 pt-1 text-[13px] leading-relaxed text-texto-2 bg-tinte/[.07]">
          {children}
        </div>
      )}
    </div>
  )
}

// Fila gris de carga para las listas
export function CeldaEsqueleto({ conIcono = false }) {
  return (
    <div className="min-h-11 px-4 py-3 flex items-center gap-3 animate-pulse">
      {conIcono && <span className="w-9 h-9 rounded-full bg-relleno shrink-0" />}
      <span className="h-3 rounded bg-relleno w-1/3" />
      <span className="h-3 rounded bg-relleno w-1/5 ml-auto" />
    </div>
  )
}

// "Etiqueta: valor" para el detalle desplegado de un catálogo
export function Dato({ etiqueta, children, className = '' }) {
  return (
    <p className={className}>
      <span className="font-semibold text-texto">{etiqueta}: </span>{children}
    </p>
  )
}

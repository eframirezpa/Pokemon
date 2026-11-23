import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { CeldaEsqueleto } from './ListaAgrupada'

// Piezas de las pantallas de consulta: título grande, buscador, cápsulas de
// filtro y paginación. Las comparten la Pokédex, items, movimientos y los
// catálogos cortos para que todas se vean igual.

// Título grande con subtítulo gris y, a la derecha, lo que se pase en `accion`
// (normalmente el buscador). En el celular la acción baja debajo del título.
export function CabeceraPagina({ titulo, subtitulo = null, accion = null, children = null }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] sm:text-[34px] leading-[1.05] font-bold tracking-[-.022em] text-texto">{titulo}</h1>
          {subtitulo && <p className="text-[13px] text-texto-2 mt-1">{subtitulo}</p>}
        </div>
        {accion}
      </div>
      {children}
    </header>
  )
}

// Buscador gris redondeado con lupa y botón para borrar
export function Buscador({ valor, onChange, onEnter = null, placeholder = 'Buscar', etiqueta = 'Buscar', className = 'sm:w-64' }) {
  return (
    <label className={`relative flex items-center gap-1.5 w-full h-9 px-2.5 rounded-[10px] bg-relleno text-texto-2
                       focus-within:ring-2 focus-within:ring-tinte/50 ${className}`}>
      <Search size={16} className="shrink-0" aria-hidden />
      <input type="text" value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={etiqueta}
        onKeyDown={onEnter ? (e => { if (e.key === 'Enter') onEnter() }) : undefined}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-texto placeholder:text-texto-2" />
      {valor && (
        <button type="button" onClick={() => onChange('')} aria-label="Borrar búsqueda"
          className="shrink-0 w-4 h-4 rounded-full bg-texto-2/60 text-fondo grid place-items-center">
          <X size={10} strokeWidth={3} />
        </button>
      )}
    </label>
  )
}

// Fila de cápsulas de filtro. `color` pinta la cápsula activa con un color
// propio (tipos de Pokémon, tipos de item); sin él, la activa va en morado.
// En el celular la fila se desliza de lado en vez de ocupar varias líneas.
export function Capsulas({ children, className = '' }) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5
                     [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      {children}
    </div>
  )
}

export function Capsula({ activa, onClick, color = null, colorTexto = '#fff', children }) {
  const estilo = activa && color ? { backgroundColor: color, color: colorTexto } : undefined
  return (
    <button type="button" onClick={onClick} aria-pressed={activa} style={estilo}
      className={`shrink-0 h-[30px] px-3.5 rounded-full text-[13px] transition-colors
                  ${activa
                    ? `font-semibold ${color ? '' : 'bg-acento text-white'}`
                    : 'font-medium bg-relleno text-texto hover:bg-relleno-2'}`}>
      {children}
    </button>
  )
}

// Paginación: anterior / páginas / siguiente. `pagina` empieza en 1.
export function Paginacion({ pagina, total, onCambiar, className = '' }) {
  if (total <= 1) return null
  const ventana = Math.min(5, total)
  const primera = total <= 5 || pagina <= 3 ? 1 : pagina >= total - 2 ? total - 4 : pagina - 2
  const paginas = Array.from({ length: ventana }, (_, i) => primera + i)
  const flecha = 'w-9 h-9 rounded-full grid place-items-center text-tinte hover:bg-relleno disabled:opacity-30 disabled:cursor-not-allowed'
  return (
    <nav aria-label="Paginación" className={`flex items-center justify-center gap-1 ${className}`}>
      <button type="button" onClick={() => onCambiar(pagina - 1)} disabled={pagina <= 1} aria-label="Página anterior" className={flecha}>
        <ChevronLeft size={18} />
      </button>
      {paginas.map(p => (
        <button key={p} type="button" onClick={() => onCambiar(p)} aria-current={p === pagina ? 'page' : undefined}
          className={`min-w-9 h-9 px-2 rounded-full text-sm tabular-nums transition-colors ${
            p === pagina ? 'bg-acento text-white font-semibold' : 'text-texto hover:bg-relleno'}`}>
          {p}
        </button>
      ))}
      <button type="button" onClick={() => onCambiar(pagina + 1)} disabled={pagina >= total} aria-label="Página siguiente" className={flecha}>
        <ChevronRight size={18} />
      </button>
    </nav>
  )
}

// Contenedor de las pantallas de consulta: ancho máximo y márgenes
export function Pagina({ className = '', children }) {
  return (
    <div className={`w-full max-w-5xl mx-auto px-4 sm:px-7 pt-4 sm:pt-6 pb-10 flex flex-col gap-4 ${className}`}>
      {children}
    </div>
  )
}

// Aviso cuando una lista sale vacía o falla
export function Vacio({ titulo, detalle = null, accion = null }) {
  return (
    <div className="bg-superficie rounded-grupo px-6 py-12 flex flex-col items-center gap-2 text-center">
      <p className="text-[15px] font-semibold text-texto">{titulo}</p>
      {detalle && <p className="text-[13px] text-texto-2">{detalle}</p>}
      {accion}
    </div>
  )
}

// Lista de un catálogo: filas grises mientras carga, aviso si sale vacía y,
// si no, el bloque blanco con las filas separadas.
export function ListaCatalogo({ cargando, vacio = 'No hay resultados', filas = 8, children }) {
  const base = 'bg-superficie rounded-grupo overflow-hidden divide-y divide-separador'
  if (cargando) {
    return <div className={base}>{Array.from({ length: filas }).map((_, i) => <CeldaEsqueleto key={i} />)}</div>
  }
  const hay = Array.isArray(children) ? children.some(Boolean) : !!children
  if (!hay) return <Vacio titulo={vacio} />
  return <div className={base}>{children}</div>
}

import { useState, useEffect, useRef } from 'react'
import { Pencil, Plus, Package, ChevronRight } from 'lucide-react'
import ItemDetailPanel from '../components/ItemDetailPanel'
import ItemTypeBadge from '../components/pokedex/ItemTypeBadge'
import { apiFetch } from '../api'
import { ITEM_TYPES } from '../lib/tiposItem'
import { textoSobreColor } from '../lib/partidaShared'
import { CabeceraPagina, Buscador, Capsulas, Capsula, Paginacion, Pagina, Vacio } from '../components/ui/Pagina'
import { CeldaEsqueleto } from '../components/ui/ListaAgrupada'
import Boton from '../components/ui/Boton'
import Hoja from '../components/ui/Hoja'
import useEsEscritorio from '../hooks/useEsEscritorio'

const LIMIT = 20

/* Fila del catálogo: sprite, nombre, tipo, costo y (para el master) editar */
function FilaItem({ item, activa, onClick, onEdit }) {
  return (
    <div className={`relative flex items-center transition-colors ${activa ? 'bg-tinte/10' : 'hover:bg-relleno'}
                     before:absolute before:left-[62px] before:right-0 before:top-0 before:border-t before:border-separador first:before:hidden`}>
      <button type="button" onClick={onClick} aria-current={activa ? 'true' : undefined}
        className="flex-1 min-w-0 min-h-[52px] pl-3 pr-4 py-1.5 grid items-center gap-x-2.5 text-left
                   grid-cols-[40px_minmax(0,1fr)_auto_14px] sm:grid-cols-[40px_minmax(0,5fr)_minmax(0,3fr)_88px_14px]
                   focus-visible:outline-none focus-visible:bg-relleno">
        <span className="w-10 h-10 grid place-items-center">
          {item.item_media_sprite
            ? <img src={item.item_media_sprite} alt="" loading="lazy" className="w-8 h-8 object-contain [image-rendering:pixelated]"
                onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
            : <Package size={18} className="text-texto-2" aria-hidden />}
        </span>
        <span className="min-w-0 leading-tight">
          <span className={`block font-semibold text-[15px] truncate ${activa ? 'text-tinte' : 'text-texto'}`}>{item.item_name}</span>
          <small className="sm:hidden block text-xs text-texto-2 tabular-nums">
            {item.item_cost != null ? `${item.item_cost.toLocaleString()} po` : '—'}
          </small>
        </span>
        <span className="flex justify-end sm:justify-start"><ItemTypeBadge type={item.item_type} /></span>
        <span className="hidden sm:block text-[13px] text-texto-2 tabular-nums text-right">
          {item.item_cost != null ? `${item.item_cost.toLocaleString()} po` : '—'}
        </span>
        <ChevronRight size={14} className="text-texto-2 opacity-60" aria-hidden />
      </button>
      {onEdit && (
        // Botón aparte: la fila entera abre el detalle
        <button type="button" onClick={() => onEdit(item)} title={`Editar ${item.item_name}`} aria-label={`Editar ${item.item_name}`}
          className="shrink-0 mr-2 w-9 h-9 rounded-full grid place-items-center text-tinte hover:bg-relleno-2 transition-colors">
          <Pencil size={15} />
        </button>
      )}
    </div>
  )
}

/**
 * Listado de items con buscador, filtros por tipo y paginación.
 *
 * La usan tres pantallas: el catálogo del home, el selector de la mochila
 * (`onPick`) y el panel del máster en la partida, que además edita (`onEdit`) y
 * crea (`onAdd`). `refreshKey` es para esa última: al crear o editar un item,
 * el padre cambia el número y la lista se vuelve a pedir.
 *
 * `pagina`: se monta como pantalla de la app y crece con la ventana. Sin ella
 * va dentro de una ventana de alto fijo y la lista se desplaza por dentro.
 */
export default function ItemsList({ title = 'Items', onPick = null, excludeType = '',
                                    onEdit = null, onAdd = null, refreshKey = 0, pagina = false }) {
  const [items, setItems]               = useState([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [page, setPage]                 = useState(1)
  const [selectedId, setSelectedId]     = useState(null)
  const esEscritorio = useEsEscritorio()

  const debounceRef = useRef(null)

  /* debounce search */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebounced(search); setPage(1) }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const handleTypeSelect = (val) => {
    setSelectedType(prev => prev === val ? '' : val)
    setPage(1)
  }

  /* fetch items */
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, offset: (page - 1) * LIMIT })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedType)    params.set('type',   selectedType)
    if (excludeType)     params.set('excludeType', excludeType)
    apiFetch(`/items?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotal(d.total ?? 0) })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [debouncedSearch, selectedType, page, excludeType, refreshKey])

  const totalPages = Math.ceil(total / LIMIT)
  const fromItem   = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const toItem     = Math.min(page * LIMIT, total)
  const cambiarBusqueda = (v) => { setSearch(v); if (!v) setPage(1) }

  /* ── cabecera + filtros ── */
  const Header = (
    <CabeceraPagina titulo={title}
      subtitulo={loading ? 'Cargando…' : `Mostrando ${fromItem}–${toItem} de ${total}`}
      accion={
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onAdd && <Boton tamano="md" onClick={onAdd} className="shrink-0"><Plus size={16} /> Agregar</Boton>}
          <Buscador valor={search} onChange={cambiarBusqueda} placeholder="Buscar ítem" etiqueta="Buscar ítem" />
        </div>
      }>
      <Capsulas>
        <Capsula activa={selectedType === ''} onClick={() => handleTypeSelect('')}>Todos</Capsula>
        {ITEM_TYPES.map(t => (
          <Capsula key={t.value} activa={selectedType === t.value} onClick={() => handleTypeSelect(t.value)}
            color={t.bg} colorTexto={textoSobreColor(t.bg)}>
            {t.label}
          </Capsula>
        ))}
      </Capsulas>
    </CabeceraPagina>
  )

  /* ── lista ── */
  const Lista = loading
    ? (
      <div className="bg-superficie rounded-grupo overflow-hidden divide-y divide-separador">
        {Array.from({ length: 10 }).map((_, i) => <CeldaEsqueleto key={i} conIcono />)}
      </div>
    )
    : items.length === 0
      ? <Vacio titulo="No se encontraron ítems" detalle="Prueba con otro nombre o quita el filtro de tipo." />
      : (
        <div className="bg-superficie rounded-grupo overflow-hidden">
          {items.map(item => {
            const isSelected = item.item_id === selectedId
            return (
              <FilaItem key={item.item_id} item={item} activa={isSelected} onEdit={onEdit}
                onClick={() => onPick ? onPick(item) : setSelectedId(isSelected ? null : item.item_id)} />
            )
          })}
        </div>
      )

  const Paginas = !loading && totalPages > 1 && (
    <Paginacion pagina={page} total={totalPages} onCambiar={setPage} />
  )

  const detalle = selectedId && <ItemDetailPanel id={selectedId} onClose={() => setSelectedId(null)} />

  // Celular: el detalle sube en una hoja inferior
  const hojaDetalle = selectedId && !esEscritorio && (
    <Hoja onClose={() => setSelectedId(null)} sinRelleno alto="max-h-[90dvh]" z="z-[60]">
      {detalle}
    </Hoja>
  )

  if (pagina) {
    return (
      <Pagina className={selectedId && esEscritorio ? 'max-w-7xl' : ''}>
        <div className="flex gap-5 items-start">
          {selectedId && esEscritorio && (
            <aside className="w-[400px] shrink-0 sticky top-6 max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden bg-superficie rounded-grupo [&>*]:min-h-0">
              {detalle}
            </aside>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {Header}
            {Lista}
            {Paginas}
          </div>
        </div>
        {hojaDetalle}
      </Pagina>
    )
  }

  // Dentro de una ventana de alto fijo: la lista se desplaza por dentro
  return (
    <div className="flex h-full overflow-hidden bg-fondo text-texto">
      {selectedId && esEscritorio && (
        <div className="w-[420px] shrink-0 border-r border-separador flex flex-col overflow-hidden bg-superficie">
          {detalle}
        </div>
      )}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* pr-14: deja libre la X de cerrar que pone la ventana arriba a la derecha */}
        <div className="shrink-0 px-4 pt-4 pb-3 pr-14">{Header}</div>
        <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col gap-3 [&>*]:shrink-0">
          {Lista}
          {Paginas}
        </div>
      </div>
      {hojaDetalle}
    </div>
  )
}

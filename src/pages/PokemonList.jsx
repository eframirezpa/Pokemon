import { useState, useEffect, useRef } from 'react'
import PokemonDetailPanel from '../components/PokemonDetailPanel'
import FichaPokemonCompleta from '../components/pokedex/FichaPokemonCompleta'
import { apiFetch } from '../api'
import { TYPE_COLORS, textoSobreColor } from '../lib/partidaShared'
import { TypeBadge } from '../components/partida/TypeBadge'
import { CabeceraPagina, Buscador, Capsulas, Capsula, Paginacion, Pagina, Vacio } from '../components/ui/Pagina'
import { CeldaEsqueleto } from '../components/ui/ListaAgrupada'
import Hoja from '../components/ui/Hoja'
import useEsEscritorio from '../hooks/useEsEscritorio'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const LIMIT = 20

// Como página, la lista recuerda búsqueda, filtros y página durante la sesión:
// al tocar un Pokémon se va a su ficha completa y, al volver, sigue donde estaba.
const CLAVE_ESTADO = 'pokedex-estado'
const VACIO = { search: '', type: '', size: '', page: 1 }
function leerEstado(pagina) {
  if (!pagina) return VACIO
  try { return { ...VACIO, ...JSON.parse(sessionStorage.getItem(CLAVE_ESTADO)) } } catch { return VACIO }
}
const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

const numero = (n) => n != null ? `#${String(n).padStart(4, '0')}` : ''

/* Fila de la Pokédex: sprite, nombre y número, tipos, SR */
function FilaPokemon({ pk, activa, onClick }) {
  const sprite = pk.pokemon_media_sprite
  return (
    <button type="button" onClick={onClick} aria-current={activa ? 'true' : undefined}
      className={`relative w-full min-h-[52px] pl-3 pr-4 py-1.5 grid
                  before:absolute before:left-[62px] before:right-0 before:top-0 before:border-t before:border-separador first:before:hidden items-center gap-x-2.5 text-left transition-colors
                  grid-cols-[40px_minmax(0,1fr)_auto_14px] sm:grid-cols-[40px_minmax(0,4fr)_minmax(0,5fr)_56px_14px]
                  ${activa ? 'bg-tinte/10' : 'hover:bg-relleno'} focus-visible:outline-none focus-visible:bg-relleno`}>
      <span className="w-10 h-10 grid place-items-center">
        {sprite
          ? <img src={sprite} alt="" loading="lazy" className="w-10 h-10 object-contain [image-rendering:pixelated]"
              onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
          : <span className="w-7 h-7 rounded-full bg-relleno" />}
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`font-semibold text-[15px] truncate block sm:inline ${activa ? 'text-tinte' : 'text-texto'}`}>{pk.pokemon_name}</span>
        <small className="block sm:inline sm:ml-1.5 text-xs font-medium text-texto-2 tabular-nums">
          {numero(pk.pokemon_number)}<span className="sm:hidden"> · SR {pk.pokemon_sr}</span>
        </small>
      </span>
      <span className="flex flex-wrap gap-1 justify-end sm:justify-start">
        <TypeBadge type={pk.pokemon_type_1} tamano="sm" />
        <TypeBadge type={pk.pokemon_type_2} tamano="sm" />
      </span>
      <span className="hidden sm:block text-[13px] text-texto-2 tabular-nums">SR {pk.pokemon_sr}</span>
      <ChevronRight size={14} className="text-texto-2 opacity-60" aria-hidden />
    </button>
  )
}

/* ── Lista + panel de detalle ── */
// onReady: avisa cada vez que termina una consulta, incluida la primera. Lo usa
// quien monta esta lista dentro de una ventana propia (la Pokédex de la
// partida) para no enseñarla vacía mientras carga; a ese le basta con la
// primera y las siguientes le dan igual. Opcional: como página suelta nadie lo
// pasa y no cambia nada.
//
// pagina: se monta como pantalla de la app (con la barra lateral) y crece con
// la ventana. Sin ella va dentro de una ventana de alto fijo (sala, creación
// del Pokémon) y la lista se desplaza por dentro.
export default function PokemonList({ title = 'Pokémon', onPick = null, starter = false, onChoose = null, moveDetail = false, onReady = null, initialSelectedId = null, initialInvokedLevel = null, pagina = false }) {
  const navigate = useNavigate()
  const [inicial] = useState(() => leerEstado(pagina))
  const [pokemon, setPokemon]           = useState([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState(inicial.search)
  const [debouncedSearch, setDebouncedSearch] = useState(inicial.search)
  const [selectedType, setSelectedType] = useState(inicial.type)
  const [selectedSize, setSelectedSize] = useState(inicial.size)
  const [page, setPage]                 = useState(inicial.page)
  const [types, setTypes]               = useState([])
  // Abre ya con el detalle de una especie puesto (p. ej. desde el Pokémon que
  // el máster invocó en la mesa). Quien monta esto con un id fijo lo hace
  // dentro de un modal que se remonta entero al reabrir, así que basta con
  // el valor inicial: no hace falta un efecto para seguir cambios.
  // En la partida (sin onChoose ni onPick) tocar un Pokémon abre directo la
  // ficha ampliada; el panel lateral queda para elegir (creación del Pokémon,
  // asistente del master), donde lleva el botón "Seleccionar".
  const directoAmpliada = !pagina && !onChoose && !onPick
  const [selectedId, setSelectedId]     = useState(directoAmpliada ? null : initialSelectedId)
  // Ficha completa abierta encima (solo dentro de una ventana: partida o
  // creación del Pokémon). Como página no hace falta: se navega a /pokemon/:id.
  const [ampliado, setAmpliado]         = useState(directoAmpliada ? initialSelectedId : null)
  const esEscritorio = useEsEscritorio()

  const debounceRef = useRef(null)
  // Última búsqueda aplicada: solo un texto nuevo vuelve a la página 1 (al
  // montar con el estado guardado no hay que perder la página en que iba)
  const buscadoRef  = useRef(inicial.search)
  const onReadyRef  = useRef(onReady)
  useEffect(() => { onReadyRef.current = onReady })

  useEffect(() => {
    apiFetch('/types').then(r => r.json()).then(d => setTypes(Array.isArray(d) ? d : (d.value ?? []))).catch(() => {})
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (buscadoRef.current === search) return
      buscadoRef.current = search
      setDebouncedSearch(search); setPage(1)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const handleTypeSelect = (typeName) => {
    setSelectedType(prev => prev === typeName ? '' : typeName)
    setPage(1)
  }

  const handleSizeSelect = (size) => {
    setSelectedSize(prev => prev === size ? '' : size)
    setPage(1)
  }

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, offset: (page - 1) * LIMIT })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedType)    params.set('type',   selectedType)
    if (selectedSize)    params.set('size',   selectedSize)
    if (starter)         params.set('starter', '1')
    // vigente: al escribir o cambiar de página rápido, una respuesta lenta de
    // una consulta anterior no pisa a la nueva.
    let vigente = true
    apiFetch(`/pokemon?${params}`)
      .then(r => r.json())
      .then(d => { if (vigente) { setPokemon(d.data ?? []); setTotal(d.total ?? 0) } })
      .catch(() => { if (vigente) setPokemon([]) })
      // onReadyRef y no onReady: si quien nos monta pasa una función nueva en
      // cada render, tenerla como dependencia relanzaría la consulta en bucle.
      .finally(() => { if (vigente) { setLoading(false); onReadyRef.current?.() } })
    return () => { vigente = false }
  }, [debouncedSearch, selectedType, selectedSize, page, starter])

  useEffect(() => {
    if (!pagina) return
    try {
      sessionStorage.setItem(CLAVE_ESTADO, JSON.stringify({ search: debouncedSearch, type: selectedType, size: selectedSize, page }))
    } catch { /* sin almacenamiento: no se recuerda, nada más */ }
  }, [pagina, debouncedSearch, selectedType, selectedSize, page])

  const totalPages = Math.ceil(total / LIMIT)
  const fromItem   = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const toItem     = Math.min(page * LIMIT, total)
  const cambiarBusqueda = (v) => { setSearch(v); if (!v) setPage(1) }

  /* ── cabecera + filtros ── */
  const Header = (
    <CabeceraPagina titulo={title}
      subtitulo={loading ? 'Cargando…' : `Mostrando ${fromItem}–${toItem} de ${total}`}
      accion={<Buscador valor={search} onChange={cambiarBusqueda} placeholder="Buscar pokémon" etiqueta="Buscar pokémon" />}>
      <Capsulas>
        <Capsula activa={selectedType === ''} onClick={() => handleTypeSelect('')}>Todos</Capsula>
        {types.map(t => {
          const bg = TYPE_COLORS[t.pokemon_types_name]?.bg ?? '#888888'
          return (
            <Capsula key={t.pokemon_types_id} activa={selectedType === t.pokemon_types_name}
              onClick={() => handleTypeSelect(t.pokemon_types_name)} color={bg} colorTexto={textoSobreColor(bg)}>
              {t.pokemon_types_name}
            </Capsula>
          )
        })}
      </Capsulas>
      {/* Talla: segunda fila, debajo de los tipos */}
      <Capsulas>
        <Capsula activa={selectedSize === ''} onClick={() => handleSizeSelect('')}>Todas las tallas</Capsula>
        {SIZES.map(sz => (
          <Capsula key={sz} activa={selectedSize === sz} onClick={() => handleSizeSelect(sz)}>{sz}</Capsula>
        ))}
      </Capsulas>
    </CabeceraPagina>
  )

  /* ── lista de pokémon ── */
  const Lista = loading
    ? (
      <div className="bg-superficie rounded-grupo overflow-hidden divide-y divide-separador">
        {Array.from({ length: 10 }).map((_, i) => <CeldaEsqueleto key={i} conIcono />)}
      </div>
    )
    : pokemon.length === 0
      ? <Vacio titulo="No se encontraron pokémon" detalle="Prueba con otro nombre o quita algún filtro." />
      : (
        <div className="bg-superficie rounded-grupo overflow-hidden">
          {pokemon.map(pk => {
            const isSelected = pk.pokemon_id === selectedId
            return (
              <FilaPokemon key={pk.pokemon_id} pk={pk} activa={isSelected}
                onClick={() => onPick ? onPick(pk)
                  : directoAmpliada ? setAmpliado(pk.pokemon_id)
                  : pagina ? navigate(`/pokemon/${pk.pokemon_id}`)   // página: directo a la ficha completa
                  : setSelectedId(isSelected ? null : pk.pokemon_id)} />
            )
          })}
        </div>
      )

  const Paginas = !loading && totalPages > 1 && (
    <Paginacion pagina={page} total={totalPages} onCambiar={setPage} />
  )

  const detalle = selectedId && (
    <PokemonDetailPanel id={selectedId} onClose={() => setSelectedId(null)} onSelectId={setSelectedId} onChoose={onChoose} moveDetail={moveDetail}
      invokedLevel={selectedId === initialSelectedId ? initialInvokedLevel : null}
      onAmpliar={pagina ? null : setAmpliado} />
  )

  // Celular: el detalle sube en una hoja inferior
  const hojaDetalle = selectedId && !esEscritorio && (
    <Hoja onClose={() => setSelectedId(null)} sinRelleno alto="max-h-[90dvh]" z="z-[60]">
      {detalle}
    </Hoja>
  )

  if (pagina) {
    return (
      <Pagina>
        {Header}
        {Lista}
        {Paginas}
      </Pagina>
    )
  }

  // Dentro de una ventana de alto fijo: la lista se desplaza por dentro
  return (
    <div className="flex h-full overflow-hidden bg-fondo text-texto">
      {/* Ficha completa a pantalla completa, sin salir de la partida. `key`:
          al pasar a una evolución vuelve a empezar desde arriba. */}
      {ampliado && (
        <div key={ampliado} className="fixed inset-0 z-[66] overflow-y-auto bg-fondo text-texto animate-velo">
          <FichaPokemonCompleta id={ampliado} etiquetaVolver="Volver a la Pokédex"
            nivel={ampliado === initialSelectedId ? initialInvokedLevel : null}
            onVolver={() => setAmpliado(null)} onIrA={setAmpliado} />
        </div>
      )}
      {selectedId && esEscritorio && (
        <div className="w-[420px] shrink-0 border-r border-separador flex flex-col overflow-hidden bg-superficie">
          {detalle}
        </div>
      )}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* pr-14: deja libre la X de cerrar que pone la ventana arriba a la derecha */}
        <div className="shrink-0 px-4 pt-4 pb-3 pr-14">{Header}</div>
        {/* [&>*]:shrink-0: en una columna flex la lista (overflow-hidden por las
            esquinas) se encogía hasta caber y recortaba las filas sin dejar
            desplazarse: solo se veían ~9 de las 20 de la página. */}
        <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col gap-3 [&>*]:shrink-0">
          {Lista}
          {Paginas}
        </div>
      </div>
      {hojaDetalle}
    </div>
  )
}

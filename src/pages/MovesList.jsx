import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import { TYPE_COLORS, textoSobreColor } from '../lib/partidaShared'
import { TypeBadge } from '../components/partida/TypeBadge'
import { CabeceraPagina, Buscador, Capsulas, Capsula, Paginacion, Pagina, Vacio } from '../components/ui/Pagina'
import { CeldaDesplegable, CeldaEsqueleto, Dato } from '../components/ui/ListaAgrupada'
import Boton from '../components/ui/Boton'

const TYPES = Object.keys(TYPE_COLORS)
const PAGE_SIZE = 30

export default function MovesList() {
  const [items, setItems]     = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [inputVal, setInputVal] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage]       = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [detail, setDetail]   = useState({})

  const fetchMoves = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(search    && { search }),
      ...(typeFilter && { type: typeFilter }),
    })
    // vigente: se busca en cada tecla, y una respuesta lenta de una búsqueda
    // anterior no debe pisar a la nueva. Devuelve con qué descartarla.
    let vigente = true
    apiFetch(`/moves?${qs}`)
      .then(r => r.json())
      .then(d => { if (vigente) { setItems(d.data ?? []); setTotal(d.total ?? 0) } })
      .catch(() => { if (vigente) setItems([]) })
      .finally(() => { if (vigente) setLoading(false) })
    return () => { vigente = false }
  }, [page, search, typeFilter])

  useEffect(() => fetchMoves(), [fetchMoves])

  const handleSearch = () => { setPage(0); setSearch(inputVal) }

  const toggleRow = async (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!detail[id]) {
      const r = await apiFetch(`/moves/${id}`)
      const d = await r.json()
      setDetail(prev => ({ ...prev, [id]: d }))
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <Pagina>
      <CabeceraPagina titulo="Movimientos" subtitulo={loading ? 'Cargando…' : `${total} movimientos`}
        accion={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Buscador valor={inputVal} onEnter={handleSearch} placeholder="Buscar movimiento" etiqueta="Buscar movimiento"
              onChange={v => { setInputVal(v); if (!v) { setSearch(''); setPage(0) } }} />
            <Boton tamano="md" onClick={handleSearch} className="shrink-0">Buscar</Boton>
          </div>
        }>
        <Capsulas>
          <Capsula activa={!typeFilter} onClick={() => { setTypeFilter(''); setPage(0) }}>Todos</Capsula>
          {TYPES.map(t => (
            <Capsula key={t} activa={typeFilter === t} color={TYPE_COLORS[t].bg} colorTexto={textoSobreColor(TYPE_COLORS[t].bg)}
              onClick={() => { setTypeFilter(t === typeFilter ? '' : t); setPage(0) }}>
              {t}
            </Capsula>
          ))}
        </Capsulas>
      </CabeceraPagina>

      {loading ? (
        <div className="bg-superficie rounded-grupo overflow-hidden divide-y divide-separador">
          {Array.from({ length: 10 }).map((_, i) => <CeldaEsqueleto key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <Vacio titulo="No se encontraron movimientos" detalle="Prueba con otro nombre o quita el filtro de tipo." />
      ) : (
        <div className="bg-superficie rounded-grupo overflow-hidden divide-y divide-separador">
          {items.map(m => {
            const open = expandedId === m.move_id
            const d    = detail[m.move_id]
            const resumen = [m.move_power_1 && m.move_power_1 !== 'None' && `Poder ${m.move_power_1}`, m.move_pp != null && `PP ${m.move_pp}`,
                             m.move_time, m.move_range].filter(Boolean).join(' · ')
            return (
              <CeldaDesplegable key={m.move_id} titulo={m.move_name} subtitulo={resumen || null}
                valor={<TypeBadge type={m.move_type} tamano="sm" />}
                abierta={open} onToggle={() => toggleRow(m.move_id)}>
                {!d
                  ? <p className="animate-pulse">Cargando…</p>
                  : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                      {d.move_description    && <p className="col-span-full mb-1 text-texto">{d.move_description}</p>}
                      {d.move_power_1        && <Dato etiqueta="Poder 1">{d.move_power_1}</Dato>}
                      {d.move_power_2        && <Dato etiqueta="Poder 2">{d.move_power_2}</Dato>}
                      {d.move_pp             && <Dato etiqueta="PP">{d.move_pp}</Dato>}
                      {d.move_time           && <Dato etiqueta="Tiempo">{d.move_time}</Dato>}
                      {d.move_range          && <Dato etiqueta="Rango">{d.move_range}</Dato>}
                      {d.move_has_damage != null && <Dato etiqueta="Daño">{d.move_has_damage ? 'Sí' : 'No'}</Dato>}
                      {d.move_effect         && <Dato etiqueta="Efecto" className="col-span-full">{d.move_effect}</Dato>}
                      {d.move_notes          && <Dato etiqueta="Notas" className="col-span-full">{d.move_notes}</Dato>}
                    </div>
                  )}
              </CeldaDesplegable>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-1">
          <Paginacion pagina={page + 1} total={totalPages} onCambiar={p => setPage(p - 1)} />
          <p className="text-xs text-texto-2 tabular-nums">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
        </div>
      )}
    </Pagina>
  )
}

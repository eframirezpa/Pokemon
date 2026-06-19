import { useState, useEffect, useCallback } from 'react'
import { Search, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch } from '../api'

const TYPE_COLORS = {
  Normal:   'bg-gray-400',   Fire:     'bg-orange-500', Water:    'bg-blue-500',
  Electric: 'bg-yellow-400', Grass:    'bg-green-500',  Ice:      'bg-cyan-400',
  Fighting: 'bg-red-700',    Poison:   'bg-purple-500', Ground:   'bg-yellow-600',
  Flying:   'bg-indigo-400', Psychic:  'bg-pink-500',   Bug:      'bg-lime-500',
  Rock:     'bg-yellow-700', Ghost:    'bg-violet-600', Dragon:   'bg-indigo-600',
  Dark:     'bg-gray-700',   Steel:    'bg-slate-400',  Fairy:    'bg-pink-400',
}

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
    apiFetch(`/moves?${qs}`)
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotal(d.total ?? 0) })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [page, search, typeFilter])

  useEffect(() => { fetchMoves() }, [fetchMoves])

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Movimientos</h1>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Cargando...' : `${total} movimientos`}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar..."
                className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              {inputVal && (
                <button onClick={() => { setInputVal(''); setSearch(''); setPage(0) }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>
              )}
            </div>
            <button onClick={handleSearch}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl transition-colors shrink-0">
              Buscar
            </button>
          </div>
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => { setTypeFilter(''); setPage(0) }}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${!typeFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Todos
          </button>
          {TYPES.map(t => (
            <button key={t}
              onClick={() => { setTypeFilter(t === typeFilter ? '' : t); setPage(0) }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium text-white transition-opacity ${TYPE_COLORS[t]} ${typeFilter && typeFilter !== t ? 'opacity-30' : 'opacity-100'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Nombre</th>
              <th className="py-3 px-3 font-medium">Tipo</th>
              <th className="py-3 px-3 font-medium hidden sm:table-cell">Poder</th>
              <th className="py-3 px-3 font-medium hidden sm:table-cell">PP</th>
              <th className="py-3 px-3 font-medium hidden md:table-cell">Tiempo</th>
              <th className="py-3 px-3 font-medium hidden md:table-cell">Rango</th>
              <th className="py-3 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-32" /></td>
                  <td className="py-3 px-3"><div className="h-4 bg-gray-200 rounded-full w-16" /></td>
                  <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-10" /></td>
                  <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-8" /></td>
                  <td className="py-3 px-3 hidden md:table-cell"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                  <td className="py-3 px-3 hidden md:table-cell"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                  <td />
                </tr>
              ))
              : items.map(m => {
                const open = expandedId === m.move_id
                const d    = detail[m.move_id]
                return [
                  <tr key={m.move_id} onClick={() => toggleRow(m.move_id)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4 font-semibold text-gray-800">{m.move_name}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-white text-[11px] font-medium ${TYPE_COLORS[m.move_type] ?? 'bg-gray-400'}`}>
                        {m.move_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 hidden sm:table-cell text-xs text-gray-600">{m.move_power_1 ?? '—'}</td>
                    <td className="py-2 px-3 hidden sm:table-cell text-xs text-gray-600">{m.move_pp ?? '—'}</td>
                    <td className="py-2 px-3 hidden md:table-cell text-xs text-gray-500">{m.move_time ?? '—'}</td>
                    <td className="py-2 px-3 hidden md:table-cell text-xs text-gray-500">{m.move_range ?? '—'}</td>
                    <td className="py-2 px-3"><ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} /></td>
                  </tr>,
                  open && (
                    <tr key={`${m.move_id}-detail`} className="bg-red-50">
                      <td colSpan={7} className="px-6 pb-3 text-xs text-gray-600">
                        {!d
                          ? <p className="py-2 text-gray-400">Cargando...</p>
                          : (
                            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                              {d.move_description    && <p className="col-span-full mb-1 leading-relaxed">{d.move_description}</p>}
                              {d.move_power_1        && <p><span className="font-semibold text-gray-800">Poder 1: </span>{d.move_power_1}</p>}
                              {d.move_power_2        && <p><span className="font-semibold text-gray-800">Poder 2: </span>{d.move_power_2}</p>}
                              {d.move_pp             && <p><span className="font-semibold text-gray-800">PP: </span>{d.move_pp}</p>}
                              {d.move_time           && <p><span className="font-semibold text-gray-800">Tiempo: </span>{d.move_time}</p>}
                              {d.move_range          && <p><span className="font-semibold text-gray-800">Rango: </span>{d.move_range}</p>}
                              {d.move_has_damage != null && <p><span className="font-semibold text-gray-800">Daño: </span>{d.move_has_damage ? 'Sí' : 'No'}</p>}
                              {d.move_effect         && <p className="col-span-full"><span className="font-semibold text-gray-800">Efecto: </span>{d.move_effect}</p>}
                              {d.move_notes          && <p className="col-span-full"><span className="font-semibold text-gray-800">Notas: </span>{d.move_notes}</p>}
                            </div>
                          )}
                      </td>
                    </tr>
                  )
                ]
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white shrink-0">
          <p className="text-xs text-gray-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 text-sm font-medium">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

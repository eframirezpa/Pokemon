import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import ItemDetailPanel from '../components/ItemDetailPanel'
import { apiFetch } from '../api'

const LIMIT = 20

const ITEM_TYPES = [
  { value: 'berry',        label: 'Berry',            bg: '#78C850' },
  { value: 'evolution',    label: 'Evolución',        bg: '#7038F8' },
  { value: 'held item',    label: 'Objeto Equipado',  bg: '#6890F0' },
  { value: 'medicine',     label: 'Medicina',         bg: '#F85888' },
  { value: 'pokeball',     label: 'Pokéball',         bg: '#C03028' },
  { value: 'trainer gear', label: 'Equipo',           bg: '#F08030' },
]

function TypeBadge({ type }) {
  const t = ITEM_TYPES.find(x => x.value === type)
  if (!t) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700">{type}</span>
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: t.bg, color: '#fff' }}>
      {t.label}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 animate-pulse">
      <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-36" /></td>
      <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>
      <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-16" /></td>
    </tr>
  )
}

export default function ItemsList() {
  const [items, setItems]               = useState([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [page, setPage]                 = useState(1)
  const [selectedId, setSelectedId]     = useState(null)

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
    apiFetch(`/items?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.data ?? []); setTotal(d.total ?? 0) })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [debouncedSearch, selectedType, page])

  const totalPages = Math.ceil(total / LIMIT)
  const fromItem   = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const toItem     = Math.min(page * LIMIT, total)
  const clearSearch = () => { setSearch(''); setPage(1) }

  /* ── cabecera + filtros ── */
  const Header = (
    <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Items</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : `Mostrando ${fromItem}–${toItem} de ${total}`}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ítem..."
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-xl bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder-gray-400" />
          {search && (
            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => handleTypeSelect('')}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            selectedType === '' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          Todos
        </button>
        {ITEM_TYPES.map(t => (
          <button key={t.value} onClick={() => handleTypeSelect(t.value)}
            className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
            style={{
              backgroundColor: selectedType === t.value ? t.bg   : 'white',
              color:           selectedType === t.value ? '#fff'  : '#4B5563',
              borderColor:     selectedType === t.value ? t.bg    : '#E5E7EB',
            }}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )

  /* ── tabla ── */
  const Table = (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
            <th className="py-3 px-4 font-medium">Nombre</th>
            <th className="py-3 px-3 font-medium">Tipo</th>
            <th className="py-3 px-3 font-medium hidden sm:table-cell">Costo</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            : items.length === 0
              ? (
                <tr><td colSpan={3} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">🎒</span>
                    <span className="text-sm">No se encontraron ítems</span>
                  </div>
                </td></tr>
              )
              : items.map(item => {
                const isSelected = item.item_id === selectedId
                return (
                  <tr key={item.item_id}
                    onClick={() => setSelectedId(isSelected ? null : item.item_id)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected ? 'bg-red-50 border-l-2 border-red-500' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4">
                      <span className={`font-semibold transition-colors ${isSelected ? 'text-red-700' : 'text-gray-800 group-hover:text-red-700'}`}>
                        {item.item_name}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {item.item_type && <TypeBadge type={item.item_type} />}
                    </td>
                    <td className="py-2 px-3 hidden sm:table-cell text-gray-600 tabular-nums">
                      {item.item_cost != null ? `${item.item_cost.toLocaleString()} po` : '—'}
                    </td>
                  </tr>
                )
              })
          }
        </tbody>
      </table>
    </div>
  )

  /* ── paginación ── */
  const Pagination = !loading && totalPages > 1 && (
    <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between gap-2 shrink-0">
      <span className="text-xs text-gray-500 hidden sm:block">
        Pág. <span className="font-medium text-gray-800">{page}</span> / {totalPages}
      </span>
      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} /> Ant.
        </button>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p
            if (totalPages <= 5)             p = i + 1
            else if (page <= 3)              p = i + 1
            else if (page >= totalPages - 2) p = totalPages - 4 + i
            else                             p = page - 2 + i
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {p}
              </button>
            )
          })}
        </div>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Sig. <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop: panel izquierdo + lista derecha ── */}
      <div className="hidden lg:flex h-full overflow-hidden">
        {selectedId && (
          <div className="w-[420px] shrink-0 border-r border-gray-200 flex flex-col overflow-hidden bg-white">
            <ItemDetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {Header}
          {Table}
          {Pagination}
        </div>
      </div>

      {/* ── Móvil: lista + bottom sheet ── */}
      <div className="lg:hidden flex flex-col h-full overflow-hidden">
        {Header}
        {Table}
        {Pagination}
        {selectedId && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedId(null) }}>
            <div className="bg-white rounded-t-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: '90dvh' }}>
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <ItemDetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

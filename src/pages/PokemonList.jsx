import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import PokemonDetailPanel from '../components/PokemonDetailPanel'
import { apiFetch } from '../api'

const LIMIT = 20

const TYPE_COLORS = {
  Normal:   { bg: '#A8A878', dark: false }, Fire:     { bg: '#F08030', dark: false },
  Water:    { bg: '#6890F0', dark: false }, Grass:    { bg: '#78C850', dark: false },
  Electric: { bg: '#F8D030', dark: true  }, Ice:      { bg: '#98D8D8', dark: true  },
  Fighting: { bg: '#C03028', dark: false }, Poison:   { bg: '#A040A0', dark: false },
  Ground:   { bg: '#E0C068', dark: true  }, Flying:   { bg: '#A890F0', dark: false },
  Psychic:  { bg: '#F85888', dark: false }, Bug:      { bg: '#A8B820', dark: false },
  Rock:     { bg: '#B8A038', dark: false }, Ghost:    { bg: '#705898', dark: false },
  Dragon:   { bg: '#7038F8', dark: false }, Dark:     { bg: '#705848', dark: false },
  Steel:    { bg: '#B8B8D0', dark: true  }, Fairy:    { bg: '#EE99AC', dark: true  },
}

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] ?? { bg: '#888', dark: false }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide"
      style={{ backgroundColor: color.bg, color: color.dark ? '#374151' : '#fff' }}>
      {type}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 animate-pulse">
      <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-28" /></td>
      <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>
      <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-8" /></td>
    </tr>
  )
}

/* ── Lista + panel de detalle ── */
export default function PokemonList({ title = 'Pokémon', onPick = null }) {
  const [pokemon, setPokemon]           = useState([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [page, setPage]                 = useState(1)
  const [types, setTypes]               = useState([])
  const [selectedId, setSelectedId]     = useState(null)

  const debounceRef = useRef(null)

  useEffect(() => {
    apiFetch('/types').then(r => r.json()).then(d => setTypes(d.value ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const handleTypeSelect = (typeName) => {
    setSelectedType(prev => prev === typeName ? '' : typeName)
    setPage(1)
  }

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, offset: (page - 1) * LIMIT })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedType)    params.set('type',   selectedType)
    apiFetch(`/pokemon?${params}`)
      .then(r => r.json())
      .then(d => { setPokemon(d.data ?? []); setTotal(d.total ?? 0) })
      .catch(() => setPokemon([]))
      .finally(() => setLoading(false))
  }, [debouncedSearch, selectedType, page])

  const totalPages = Math.ceil(total / LIMIT)
  const fromItem   = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const toItem     = Math.min(page * LIMIT, total)
  const clearSearch = () => { setSearch(''); setPage(1) }

  /* ── cabecera + filtros (compartida) ── */
  const Header = (
    <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : `Mostrando ${fromItem}–${toItem} de ${total}`}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pokémon..."
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-xl bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder-gray-400" />
          {search && (
            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => handleTypeSelect('')}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            selectedType === '' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          Todos
        </button>
        {types.map(t => {
          const color  = TYPE_COLORS[t.pokemon_types_name] ?? { bg: '#888' }
          const active = selectedType === t.pokemon_types_name
          return (
            <button key={t.pokemon_types_id} onClick={() => handleTypeSelect(t.pokemon_types_name)}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={{ backgroundColor: active ? color.bg : 'white', color: active ? '#fff' : '#4B5563', borderColor: active ? color.bg : '#E5E7EB' }}>
              {t.pokemon_types_name}
            </button>
          )
        })}
      </div>
    </div>
  )

  /* ── tabla de pokémon ── */
  const Table = (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
            <th className="py-3 px-4 font-medium">Nombre</th>
            <th className="py-3 px-3 font-medium">Tipo</th>
            <th className="py-3 px-3 font-medium hidden sm:table-cell">SR</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            : pokemon.length === 0
              ? (
                <tr><td colSpan={3} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">🔍</span>
                    <span className="text-sm">No se encontraron pokémon</span>
                  </div>
                </td></tr>
              )
              : pokemon.map(pk => {
                const isSelected = pk.pokemon_id === selectedId
                return (
                  <tr key={pk.pokemon_id}
                    onClick={() => onPick ? onPick(pk) : setSelectedId(isSelected ? null : pk.pokemon_id)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected ? 'bg-red-50 border-l-2 border-red-500' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4">
                      <span className={`font-semibold transition-colors ${isSelected ? 'text-red-700' : 'text-gray-800 group-hover:text-red-700'}`}>
                        {pk.pokemon_name}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {pk.pokemon_type_1 && <TypeBadge type={pk.pokemon_type_1} />}
                        {pk.pokemon_type_2 && <TypeBadge type={pk.pokemon_type_2} />}
                      </div>
                    </td>
                    <td className="py-2 px-3 hidden sm:table-cell text-gray-600 font-medium">{pk.pokemon_sr}</td>
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
            if (totalPages <= 5)                p = i + 1
            else if (page <= 3)                 p = i + 1
            else if (page >= totalPages - 2)    p = totalPages - 4 + i
            else                                p = page - 2 + i
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
      {/* ════════════════════════════════════════════
          Layout desktop: panel izquierdo + lista derecha
          Umbral: lg (1024px)
         ════════════════════════════════════════════ */}
      <div className="hidden lg:flex h-full overflow-hidden">

        {/* Panel de detalle – izquierda */}
        {selectedId && (
          <div className="w-[420px] shrink-0 border-r border-gray-200 flex flex-col overflow-hidden bg-white">
            <PokemonDetailPanel id={selectedId} onClose={() => setSelectedId(null)} onSelectId={setSelectedId} />
          </div>
        )}

        {/* Lista – derecha (o ancho completo sin selección) */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {Header}
          {Table}
          {Pagination}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          Layout móvil: lista normal + modal bottom sheet
         ════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col h-full overflow-hidden">
        {Header}
        {Table}
        {Pagination}

        {/* Bottom sheet modal */}
        {selectedId && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedId(null) }}
          >
            <div className="bg-white rounded-t-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: '90dvh' }}>
              {/* drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <PokemonDetailPanel id={selectedId} onClose={() => setSelectedId(null)} onSelectId={setSelectedId} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

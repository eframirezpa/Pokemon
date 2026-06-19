import { useState, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api'

export default function FeatsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [searchParams] = useSearchParams()
  const typeFilter = searchParams.get('type') ?? ''

  useEffect(() => {
    setLoading(true)
    const qs = typeFilter ? `&type=${encodeURIComponent(typeFilter)}` : ''
    apiFetch(`/feats?limit=200${qs}`)
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [typeFilter])

  const filtered = items.filter(n =>
    !search || n.feat_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rasgos</h1>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Cargando...' : `${filtered.length} rasgos`}</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Nombre</th>
              <th className="py-3 px-3 font-medium hidden sm:table-cell">Tipo</th>
              <th className="py-3 px-3 font-medium hidden md:table-cell">Prerrequisito</th>
              <th className="py-3 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100">
                  <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-36" /></td>
                  <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                  <td className="py-3 px-3 hidden md:table-cell"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                  <td />
                </tr>
              ))
              : filtered.map(n => {
                const open = expandedId === n.feat_id
                return [
                  <tr key={n.feat_id} onClick={() => setExpandedId(open ? null : n.feat_id)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4 font-semibold text-gray-800">{n.feat_name}</td>
                    <td className="py-2 px-3 hidden sm:table-cell text-xs text-gray-500">{n.feat_type}</td>
                    <td className="py-2 px-3 hidden md:table-cell text-xs text-gray-500">{n.feat_prerequisite || '—'}</td>
                    <td className="py-2 px-3"><ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} /></td>
                  </tr>,
                  open && (
                    <tr key={`${n.feat_id}-detail`} className="bg-red-50">
                      <td colSpan={4} className="px-6 pb-3 text-xs text-gray-600 space-y-1">
                        {n.feat_benefits && <p className="pt-2"><span className="font-semibold text-gray-800">Beneficios: </span>{n.feat_benefits}</p>}
                        {n.feat_ability_score_increase && <p><span className="font-semibold text-gray-800">Aumento de atributo: </span>{n.feat_ability_score_increase}</p>}
                        {n.feat_is_repeatable === 1 && <p className="text-green-700 font-medium">✓ Repetible</p>}
                        {n.feat_notes && <p><span className="font-semibold text-gray-800">Notas: </span>{n.feat_notes}</p>}
                      </td>
                    </tr>
                  )
                ]
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

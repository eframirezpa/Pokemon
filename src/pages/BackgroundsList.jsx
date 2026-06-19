import { useState, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { apiFetch } from '../api'

export default function BackgroundsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/backgrounds?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.background_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trasfondos</h1>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Cargando...' : `${filtered.length} trasfondos`}</p>
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
              <th className="py-3 px-3 font-medium hidden sm:table-cell">Descripción</th>
              <th className="py-3 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100">
                  <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-36" /></td>
                  <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-64" /></td>
                  <td />
                </tr>
              ))
              : filtered.map(n => {
                const open = expandedId === n.background_id
                return [
                  <tr key={n.background_id} onClick={() => setExpandedId(open ? null : n.background_id)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4 font-semibold text-gray-800">{n.background_name}</td>
                    <td className="py-2 px-3 hidden sm:table-cell text-xs text-gray-500 max-w-xs truncate">{n.background_description}</td>
                    <td className="py-2 px-3"><ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} /></td>
                  </tr>,
                  open && (
                    <tr key={`${n.background_id}-detail`} className="bg-red-50">
                      <td colSpan={3} className="px-6 pb-4 text-xs text-gray-600">
                        <div className="pt-2 space-y-2">
                          {n.background_description && <p className="leading-relaxed">{n.background_description}</p>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {n.background_ability_scores_name && (
                              <div className="bg-white rounded-lg p-2 border border-gray-100">
                                <p className="font-semibold text-gray-800 mb-0.5">{n.background_ability_scores_name}</p>
                                <p className="text-gray-500">{n.background_ability_scores_description}</p>
                                <p className="text-gray-700 mt-0.5">{[n.background_ability_scores_value_1, n.background_ability_scores_value_2, n.background_ability_scores_value_3].filter(Boolean).join(', ')}</p>
                              </div>
                            )}
                            {n.background_skill_proficiencies_name && (
                              <div className="bg-white rounded-lg p-2 border border-gray-100">
                                <p className="font-semibold text-gray-800 mb-0.5">{n.background_skill_proficiencies_name}</p>
                                <p className="text-gray-700">{[n.background_skill_proficiencies_value_1, n.background_skill_proficiencies_value_2].filter(Boolean).join(', ')}</p>
                              </div>
                            )}
                            {n.background_feat_name && (
                              <div className="bg-white rounded-lg p-2 border border-gray-100">
                                <p className="font-semibold text-gray-800 mb-0.5">Rasgo</p>
                                <p className="text-gray-700">{n.background_feat_name}</p>
                              </div>
                            )}
                          </div>
                          {n.background_notes && <p className="pt-1"><span className="font-semibold text-gray-800">Notas: </span>{n.background_notes}</p>}
                        </div>
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

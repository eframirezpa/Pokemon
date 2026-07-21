import { useState, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { apiFetch } from '../api'

const TYPE_COLORS = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', grass:'#78C850', electric:'#F8D030',
  ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0', ground:'#E0C068', flying:'#A890F0',
  psychic:'#F85888', bug:'#A8B820', rock:'#B8A038', ghost:'#705898', dragon:'#7038F8',
  dark:'#705848', steel:'#B8B8D0', fairy:'#EE99AC',
}
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export default function SpecializationsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/specializations?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search ||
    n.specialization_name?.toLowerCase().includes(search.toLowerCase()) ||
    n.specialization_pokemon_type_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Especializaciones</h1>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Cargando...' : `${filtered.length} especializaciones`}</p>
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
              <th className="py-3 px-3 font-medium">Tipo</th>
              <th className="py-3 px-3 font-medium hidden sm:table-cell">Beneficio</th>
              <th className="py-3 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100">
                  <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-32" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                  <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                  <td />
                </tr>
              ))
              : filtered.map(n => {
                const open = expandedId === n.specialization_id
                const tipo = n.specialization_pokemon_type_name
                const asi  = n.specialization_ability_score_increase
                const skill = n.specialization_skill_proficiency
                return [
                  <tr key={n.specialization_id} onClick={() => setExpandedId(open ? null : n.specialization_id)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4 font-semibold text-gray-800">{n.specialization_name}</td>
                    <td className="py-2 px-3">
                      {tipo && (
                        <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5"
                          style={{ backgroundColor: TYPE_COLORS[tipo.toLowerCase()] || '#9CA3AF' }}>{cap(tipo)}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 hidden sm:table-cell text-xs text-gray-500">
                      {asi && <span className="font-semibold text-green-700 mr-2">{asi.toUpperCase()} +{n.specialization_ability_score_increase_value ?? 1}</span>}
                      {skill && <span className="text-amber-700">prof: {cap(skill)}</span>}
                      {!asi && !skill && '—'}
                    </td>
                    <td className="py-2 px-3"><ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} /></td>
                  </tr>,
                  open && (
                    <tr key={`${n.specialization_id}-detail`} className="bg-red-50">
                      <td colSpan={4} className="px-6 pb-3 text-xs text-gray-600 space-y-1.5">
                        {n.specialization_description && <p className="pt-2 leading-relaxed">{n.specialization_description}</p>}
                        {asi && (
                          <p><span className="font-semibold text-gray-800">Aumento de atributo: </span>
                            {asi.toUpperCase()} +{n.specialization_ability_score_increase_value ?? 1}</p>
                        )}
                        {skill && (
                          <p><span className="font-semibold text-gray-800">Proficiencia: </span>{cap(skill)}
                            {n.specialization_grants_expertise_if_proficient === 1 && ' (experto si ya es proficiente)'}</p>
                        )}
                        {n.specialization_notes && <p><span className="font-semibold text-gray-800">Notas: </span>{n.specialization_notes}</p>}
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

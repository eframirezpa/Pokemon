import { useState, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { apiFetch } from '../api'

export default function WeaponPropertiesList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/weapon-properties?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.weapon_property_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Propiedades de Arma</h1>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Cargando...' : `${filtered.length} propiedades`}</p>
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
              ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100">
                  <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-32" /></td>
                  <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-64" /></td>
                  <td />
                </tr>
              ))
              : filtered.map(n => {
                const open = expandedId === n.weapon_property_id
                return [
                  <tr key={n.weapon_property_id} onClick={() => setExpandedId(open ? null : n.weapon_property_id)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4 font-semibold text-gray-800">{n.weapon_property_name}</td>
                    <td className="py-2 px-3 hidden sm:table-cell text-xs text-gray-500 max-w-sm truncate">{n.weapon_property_description}</td>
                    <td className="py-2 px-3"><ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} /></td>
                  </tr>,
                  open && (
                    <tr key={`${n.weapon_property_id}-detail`} className="bg-red-50">
                      <td colSpan={3} className="px-6 pb-3 text-xs text-gray-600">
                        {n.weapon_property_description && <p className="pt-2 leading-relaxed">{n.weapon_property_description}</p>}
                        {n.weapon_property_notes && <p className="mt-1"><span className="font-semibold text-gray-800">Notas: </span>{n.weapon_property_notes}</p>}
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

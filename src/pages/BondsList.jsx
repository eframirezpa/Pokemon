import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { apiFetch } from '../api'

export default function BondsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/bonds?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Vínculos</h1>
        <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Cargando...' : `${items.length} vínculos`}</p>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Nivel</th>
              <th className="py-3 px-3 font-medium">Nombre</th>
              <th className="py-3 px-3 font-medium hidden sm:table-cell">Puntos</th>
              <th className="py-3 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100">
                  <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-8" /></td>
                  <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-32" /></td>
                  <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-12" /></td>
                  <td />
                </tr>
              ))
              : items.map(n => {
                const open = expandedId === n.bond_id
                return [
                  <tr key={n.bond_id} onClick={() => setExpandedId(open ? null : n.bond_id)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4 font-bold text-red-700">{n.bond_level}</td>
                    <td className="py-2 px-3 font-semibold text-gray-800">{n.bond_name}</td>
                    <td className="py-2 px-3 hidden sm:table-cell text-gray-600">{n.bond_points}</td>
                    <td className="py-2 px-3"><ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} /></td>
                  </tr>,
                  open && (
                    <tr key={`${n.bond_id}-detail`} className="bg-red-50">
                      <td colSpan={4} className="px-6 pb-3 text-xs text-gray-600 space-y-1.5">
                        {n.bond_description && <p className="pt-2 leading-relaxed">{n.bond_description}</p>}
                        {n.bond_mechanical_effect && <p><span className="font-semibold text-gray-800">Efecto mecánico: </span>{n.bond_mechanical_effect}</p>}
                        {n.bond_command_roll_required && (
                          <div>
                            <p><span className="font-semibold text-gray-800">Tirada de comando requerida</span></p>
                            {n.bond_command_failure_threshold && <p><span className="font-semibold text-gray-800">Umbral de fallo: </span>{n.bond_command_failure_threshold}</p>}
                            {n.bond_command_failure_effect && <p><span className="font-semibold text-gray-800">Efecto de fallo: </span>{n.bond_command_failure_effect}</p>}
                          </div>
                        )}
                        {n.bond_notes && <p><span className="font-semibold text-gray-800">Notas: </span>{n.bond_notes}</p>}
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

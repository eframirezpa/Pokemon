import { useState, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { apiFetch } from '../api'

export default function WeaponTypesList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/weapon-types?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.weapon_type_name?.toLowerCase().includes(search.toLowerCase())
  )

  const tag = (label) => (
    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{label}</span>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tipos de Arma</h1>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Cargando...' : `${filtered.length} tipos`}</p>
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
              <th className="py-3 px-3 font-medium hidden sm:table-cell">Daño</th>
              <th className="py-3 px-3 font-medium hidden md:table-cell">Rango</th>
              <th className="py-3 px-3 w-8" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100">
                  <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-36" /></td>
                  <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                  <td className="py-3 px-3 hidden md:table-cell"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                  <td />
                </tr>
              ))
              : filtered.map(n => {
                const open = expandedId === n.weapon_type_id
                return [
                  <tr key={n.weapon_type_id} onClick={() => setExpandedId(open ? null : n.weapon_type_id)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="py-2 px-4">
                      <p className="font-semibold text-gray-800">{n.weapon_type_name}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {n.weapon_type_is_simple === 1 && tag('Simple')}
                        {n.weapon_type_is_martial === 1 && tag('Marcial')}
                        {n.weapon_type_is_melee === 1 && tag('Cuerpo a cuerpo')}
                        {n.weapon_type_is_ranged === 1 && tag('A distancia')}
                        {n.weapon_type_is_firearm === 1 && tag('Arma de fuego')}
                      </div>
                    </td>
                    <td className="py-2 px-3 hidden sm:table-cell text-xs text-gray-600 font-mono">{n.weapon_type_damage_dice} {n.weapon_type_damage_type}</td>
                    <td className="py-2 px-3 hidden md:table-cell text-xs text-gray-500">{n.weapon_type_range || '—'}</td>
                    <td className="py-2 px-3"><ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} /></td>
                  </tr>,
                  open && (
                    <tr key={`${n.weapon_type_id}-detail`} className="bg-red-50">
                      <td colSpan={4} className="px-6 pb-3 text-xs text-gray-600">
                        <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {n.weapon_type_dnd_category && <div><span className="font-semibold text-gray-800">Categoría D&D: </span>{n.weapon_type_dnd_category}</div>}
                          {n.weapon_type_damage && <div><span className="font-semibold text-gray-800">Daño: </span>{n.weapon_type_damage}</div>}
                          {n.weapon_type_damage_dice && <div><span className="font-semibold text-gray-800">Dados: </span>{n.weapon_type_damage_dice}</div>}
                          {n.weapon_type_damage_type && <div><span className="font-semibold text-gray-800">Tipo daño: </span>{n.weapon_type_damage_type}</div>}
                          {n.weapon_type_weight && <div><span className="font-semibold text-gray-800">Peso: </span>{n.weapon_type_weight} {n.weapon_type_weight_lb && `(${n.weapon_type_weight_lb} lb)`}</div>}
                          {n.weapon_type_hand_use && <div><span className="font-semibold text-gray-800">Uso: </span>{n.weapon_type_hand_use}</div>}
                        </div>
                        {n.weapon_type_concept && <p className="mt-2"><span className="font-semibold text-gray-800">Concepto: </span>{n.weapon_type_concept}</p>}
                        {n.weapon_type_description && <p className="mt-1 leading-relaxed">{n.weapon_type_description}</p>}
                        {n.weapon_type_notes && <p className="mt-1"><span className="font-semibold text-gray-800">Notas: </span>{n.weapon_type_notes}</p>}
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

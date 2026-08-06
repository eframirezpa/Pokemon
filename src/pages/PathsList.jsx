import { useState, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { apiFetch } from '../api'

// Las rutas otorgan sus rasgos en estos cuatro niveles, siempre los mismos.
const NIVELES = [2, 5, 9, 15]

// Etiquetas de path_bonus_type / target, que en la BD vienen en snake_case
const TIPO = {
  resource:               'Recurso',
  resource_die:           'Dado de recurso',
  feature_uses:           'Usos',
  ability_score_increase: 'Aumento de atributo',
  skill_proficiency:      'Proficiencia',
  skill_expertise:        'Experiencia',
  stab_bonus:             'Bono STAB',
  saving_throw:           'Tirada de salvación',
}
const TARGET = {
  trainer:     'Entrenador',
  all_pokemon: 'Todos los Pokémon',
  pokemon:     'Pokémon',
}
const legible = (s) => (s ?? '').replace(/_/g, ' ')

/* Un rasgo (nivel + nombre + descripción) con los bonos que otorga */
function Rasgo({ nivel, nombre, descripcion, bonos }) {
  if (!nombre && !descripcion) return null
  return (
    <div className="border-l-2 border-red-200 pl-3 py-1">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-white bg-red-600 rounded px-1.5 py-0.5 shrink-0">Nivel {nivel}</span>
        <span className="text-xs font-bold text-gray-800">{nombre}</span>
      </div>
      {descripcion && <p className="text-xs text-gray-600 leading-relaxed mt-1">{descripcion}</p>}
      {bonos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {bonos.map(b => (
            <span key={b.id} title={b.notes || undefined}
              className="text-[10px] font-semibold text-gray-700 bg-white border border-gray-300 rounded-md px-1.5 py-0.5">
              <span className="text-red-700">{TIPO[b.type] || legible(b.type)}</span>
              {b.key && <span className="text-gray-500"> · {legible(b.key)}</span>}
              {b.value && <span className="text-green-700"> {b.value}</span>}
              {b.resource_die && <span className="text-blue-700"> {b.resource_die}</span>}
              {b.target && b.target !== 'trainer' && (
                <span className="text-gray-400"> ({TARGET[b.target] || legible(b.target)})</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PathsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    apiFetch('/paths')
      .then(r => { if (!r.ok) throw new Error(`El servidor respondió ${r.status}`); return r.json() })
      .then(d => { if (vivo) setItems(Array.isArray(d) ? d : []) })
      .catch(e => { if (vivo) { setItems([]); setLoadError(e.message || 'No se pudieron cargar las rutas') } })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [intento])

  const q = search.toLowerCase()
  const filtered = items.filter(p =>
    !search ||
    p.path_name?.toLowerCase().includes(q) ||
    NIVELES.some(n => p[`path_level_${n}_feature_name`]?.toLowerCase().includes(q))
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rutas de Entrenador</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading ? 'Cargando...' : `${filtered.length} rutas · rasgos en los niveles 2, 5, 9 y 15`}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full pl-8 pr-7 py-1.5 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="text-sm font-semibold text-red-600">No se pudieron cargar las rutas</p>
          <p className="text-xs text-gray-500">{loadError}</p>
          <button onClick={() => { setLoading(true); setLoadError(''); setIntento(n => n + 1) }}
            className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg transition-colors">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Ruta</th>
                <th className="py-3 px-3 font-medium hidden sm:table-cell">Rasgos</th>
                <th className="py-3 px-3 w-8" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-gray-100">
                    <td className="py-3 px-4"><div className="h-3 bg-gray-200 rounded w-32" /></td>
                    <td className="py-3 px-3 hidden sm:table-cell"><div className="h-3 bg-gray-200 rounded w-48" /></td>
                    <td />
                  </tr>
                ))
                : filtered.map(p => {
                  const open  = expandedId === p.path_id
                  const bonos = p.bonos || []
                  return [
                    <tr key={p.path_id} onClick={() => setExpandedId(open ? null : p.path_id)}
                      className={`cursor-pointer transition-colors ${open ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="py-2 px-4 font-semibold text-gray-800">{p.path_name}</td>
                      <td className="py-2 px-3 hidden sm:table-cell text-xs text-gray-500">
                        {NIVELES.map(n => p[`path_level_${n}_feature_name`]).filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="py-2 px-3"><ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} /></td>
                    </tr>,
                    open && (
                      <tr key={`${p.path_id}-detail`} className="bg-red-50">
                        <td colSpan={3} className="px-6 pb-4 pt-2 space-y-2.5">
                          {p.path_full_description && (
                            <p className="text-xs text-gray-600 leading-relaxed">{p.path_full_description}</p>
                          )}
                          {NIVELES.map(n => (
                            <Rasgo key={n} nivel={n}
                              nombre={p[`path_level_${n}_feature_name`]}
                              descripcion={p[`path_level_${n}_description`]}
                              bonos={bonos.filter(b => Number(b.level) === n)} />
                          ))}
                          {p.path_notes && (
                            <p className="text-xs text-gray-500 italic">
                              <span className="font-semibold not-italic text-gray-700">Notas: </span>{p.path_notes}
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  ]
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

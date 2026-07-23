import { useState, useEffect } from 'react'
import { X, Loader2, Search } from 'lucide-react'
import { apiFetch, API_BASE_URL } from '../api'

const TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC',
}
function TypeBadge({ type }) {
  if (!type) return null
  return <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5"
    style={{ backgroundColor: TYPE_COLORS[type] || '#9CA3AF' }}>{type}</span>
}
function Sprite({ src }) {
  if (!src) return <div className="w-11 h-11 bg-gray-100 rounded-lg shrink-0" />
  const url = src.startsWith('http') ? src : `${API_BASE_URL}${src}`
  return <img src={url} alt="" className="w-11 h-11 object-contain bg-gray-100 rounded-lg shrink-0"
    onError={e => { e.target.style.opacity = '0.2' }} />
}

/* Selector de Pokémon del master para ponerlos en el campo de la partida.
   Lista los Pokémon del master (nombre, apodo, tipos) con buscador. */
export default function MasterFieldPicker({ disabled = false, usedIds = [], onPick, onClose }) {
  const [pokemons, setPokemons] = useState([])
  const [loading, setLoading]   = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    apiFetch('/master/pokemon')
      .then(r => r.json())
      .then(d => setPokemons(Array.isArray(d) ? d : []))
      .catch(() => setPokemons([]))
      .finally(() => setLoading(false))
  }, [])

  // Excluye los que ya están en el campo
  const used = new Set(usedIds)
  const available = pokemons.filter(p => !used.has(p.id_master_pokemon))
  const term = q.trim().toLowerCase()
  const list = term
    ? available.filter(p =>
        (p.pokemon_apodo || '').toLowerCase().includes(term) ||
        (p.pokemon_name || '').toLowerCase().includes(term))
    : available

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">Mis Pokémon</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="px-5 pt-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o apodo..." autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          {disabled && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">Ya alcanzaste el máximo de 6 Pokémon en el campo.</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="animate-spin mr-2" size={18} /> Cargando...</div>
          ) : list.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-10">
              {pokemons.length === 0 ? 'No tienes Pokémon.'
                : available.length === 0 ? 'Todos tus Pokémon ya están en el campo.'
                : 'Sin resultados.'}
            </p>
          ) : (
            <div className="space-y-2">
              {list.map(p => (
                <button key={p.id_master_pokemon} onClick={() => !disabled && onPick(p)} disabled={disabled}
                  className="w-full flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-left transition-colors hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Sprite src={p.pokemon_media_sprite || p.pokemon_media_main} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="font-bold text-gray-800 text-sm truncate">{p.pokemon_apodo || p.pokemon_name}</span>
                      <TypeBadge type={p.type_1_name} />
                      <TypeBadge type={p.type_2_name} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">{p.pokemon_name} · Lv.{p.pokemon_level}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

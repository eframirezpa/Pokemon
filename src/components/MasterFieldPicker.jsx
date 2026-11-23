import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { apiFetch, API_BASE_URL } from '../api'
import PokeballSpinner from './PokeballSpinner'
import { TypeBadge as TypeBadgeBase } from './partida/TypeBadge'

// Etiqueta de tipo compartida (texto oscuro sobre los tipos claros)
const TypeBadge = ({ type }) => <TypeBadgeBase type={type} tamano="sm" />
function Sprite({ src }) {
  if (!src) return <div className="w-11 h-11 bg-relleno rounded-lg shrink-0" />
  const url = src.startsWith('http') ? src : `${API_BASE_URL}${src}`
  return <img src={url} alt="" className="w-11 h-11 object-contain bg-relleno rounded-lg shrink-0"
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-lg max-h-[85vh] flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
          <h3 className="font-bold text-texto">Mis Pokémon</h3>
          <button onClick={onClose} className="text-texto-2 hover:text-texto"><X size={18} /></button>
        </div>

        <div className="px-5 pt-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o apodo..." autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50" />
          </div>
          {disabled && <p className="text-xs text-aviso bg-aviso/10 border border-aviso/30 rounded-lg px-3 py-1.5 mt-2">Ya alcanzaste el máximo de 6 Pokémon en el campo.</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-texto-2"><PokeballSpinner size={18} className="mr-2" /> Cargando...</div>
          ) : list.length === 0 ? (
            <p className="text-sm text-texto-2 italic text-center py-10">
              {pokemons.length === 0 ? 'No tienes Pokémon.'
                : available.length === 0 ? 'Todos tus Pokémon ya están en el campo.'
                : 'Sin resultados.'}
            </p>
          ) : (
            <div className="space-y-2">
              {list.map(p => (
                <button key={p.id_master_pokemon} onClick={() => !disabled && onPick(p)} disabled={disabled}
                  className="w-full flex items-center gap-3 bg-superficie border border-separador rounded-xl px-3 py-2 text-left transition-colors hover:border-tinte/40 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Sprite src={p.pokemon_media_sprite || p.pokemon_media_main} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="font-bold text-texto text-sm truncate">{p.pokemon_apodo || p.pokemon_name}</span>
                      <TypeBadge type={p.type_1_name} />
                      <TypeBadge type={p.type_2_name} />
                    </div>
                    <p className="text-xs text-texto-2 truncate">{p.pokemon_name} · Lv.{p.pokemon_level}</p>
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

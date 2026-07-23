import { useState, useEffect } from 'react'
import { X, Loader2, Plus, Pencil, Copy, Trash2, AlertTriangle } from 'lucide-react'
import { apiFetch, API_BASE_URL } from '../api'
import MasterPokemonWizard from './MasterPokemonWizard'

function Sprite({ src }) {
  if (!src) return <div className="w-11 h-11 bg-gray-100 rounded-lg shrink-0" />
  const url = src.startsWith('http') ? src : `${API_BASE_URL}${src}`
  return <img src={url} alt="" className="w-11 h-11 object-contain bg-gray-100 rounded-lg shrink-0"
    onError={e => { e.target.style.opacity = '0.2' }} />
}

/* Confirmación de borrado de un Pokémon del master */
function ConfirmDelete({ pokemon, busy, error, onCancel, onConfirm }) {
  const nombre = pokemon.pokemon_apodo || pokemon.pokemon_name
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900 truncate">Eliminar Pokémon</h3>
          <button onClick={onCancel} disabled={busy} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2 disabled:opacity-40"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700">¿Eliminar a <span className="font-bold text-gray-900">{nombre}</span>?</p>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">Esta acción <span className="font-bold">no se puede deshacer</span>.</p>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onCancel} disabled={busy}
            className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Lista de Pokémon del master logueado. Por ahora solo funciona el borrado. */
export default function MasterPokemonPanel({ onClose }) {
  const [pokemons, setPokemons] = useState([])
  const [loading, setLoading]   = useState(true)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busyDel, setBusyDel]   = useState(false)
  const [errorDel, setErrorDel] = useState('')
  const [wizard, setWizard]     = useState(null) // { mode, sourceId } | null

  const load = () => {
    setLoading(true)
    apiFetch('/master/pokemon')
      .then(r => r.json())
      .then(d => setPokemons(Array.isArray(d) ? d : []))
      .catch(() => setPokemons([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const doDelete = async (p) => {
    setBusyDel(true); setErrorDel('')
    try {
      const res = await apiFetch(`/master/pokemon/${p.id_master_pokemon}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrorDel(j.error || 'No se pudo eliminar el Pokémon')
        return
      }
      setPokemons(prev => prev.filter(x => x.id_master_pokemon !== p.id_master_pokemon))
      setConfirmDel(null)
    } catch {
      setErrorDel('No se pudo eliminar el Pokémon')
    } finally {
      setBusyDel(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">Mis Pokémon</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {/* Agregar (pendiente de implementar) */}
        <div className="px-5 pt-4 shrink-0">
          <button
            onClick={() => setWizard({ mode: 'create' })}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300
                       text-gray-500 hover:border-red-400 hover:text-red-600 text-sm font-semibold rounded-xl transition-colors">
            <Plus size={15} /> Agregar Pokémon
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
            </div>
          ) : pokemons.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-10">Aún no tienes Pokémon.</p>
          ) : (
            <div className="space-y-2">
              {pokemons.map(p => (
                <div key={p.id_master_pokemon} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Sprite src={p.pokemon_media_sprite || p.pokemon_media_main} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-gray-800 text-sm truncate">{p.pokemon_apodo || p.pokemon_name}</span>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-200 rounded px-1.5 py-0.5 shrink-0">Lv.{p.pokemon_level}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{p.pokemon_name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setWizard({ mode: 'edit', sourceId: p.id_master_pokemon })} title="Editar"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setWizard({ mode: 'clone', sourceId: p.id_master_pokemon })} title="Clonar"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Copy size={15} />
                    </button>
                    <button onClick={() => { setErrorDel(''); setConfirmDel(p) }} title="Eliminar"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDel && (
        <ConfirmDelete pokemon={confirmDel} busy={busyDel} error={errorDel}
          onCancel={() => { if (!busyDel) { setConfirmDel(null); setErrorDel('') } }}
          onConfirm={() => doDelete(confirmDel)} />
      )}

      {wizard && (
        <MasterPokemonWizard
          mode={wizard.mode}
          sourceId={wizard.sourceId}
          onClose={() => setWizard(null)}
          onCreated={() => { setWizard(null); load() }}
        />
      )}
    </div>
  )
}

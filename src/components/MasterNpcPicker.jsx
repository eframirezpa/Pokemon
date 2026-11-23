import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

/* Elegir cuál de los NPC del máster sale al campo. Los que ya están invocados
   se muestran apagados: uno mismo no puede estar dos veces en la mesa. */
export default function MasterNpcPicker({ usedIds = [], disabled = false, onPick, onClose }) {
  const [npcs, setNpcs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca]   = useState('')

  useEffect(() => {
    apiFetch('/master/npc').then(r => r.json())
      .then(d => setNpcs(Array.isArray(d) ? d : []))
      .catch(() => setNpcs([]))
      .finally(() => setLoading(false))
  }, [])

  const usados = new Set(usedIds)
  const lista = npcs.filter(n =>
    !busca || (n.master_npc_apodo || '').toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-md max-h-[80vh] flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
          <h3 className="font-bold text-texto">Invocar NPC</h3>
          <button onClick={onClose} className="text-texto-2 hover:text-texto"><X size={18} /></button>
        </div>

        <div className="px-5 pt-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-2" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar NPC..."
              className="w-full pl-8 pr-3 py-1.5 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-texto-2">
              <PokeballSpinner size={18} className="mr-2" /> Cargando...
            </div>
          ) : lista.length === 0 ? (
            <p className="text-sm text-texto-2 italic text-center py-8">
              {npcs.length === 0 ? 'Aún no tienes NPC. Créalos desde tu panel.' : 'Sin resultados.'}
            </p>
          ) : (
            <div className="space-y-2">
              {lista.map(n => {
                const yaEsta = usados.has(n.id_master_npc)
                const noSePuede = yaEsta || disabled
                return (
                  <button key={n.id_master_npc} disabled={noSePuede}
                    onClick={() => onPick(n)}
                    title={yaEsta ? 'Ya está invocado' : disabled ? 'Ya alcanzaste el máximo' : `Invocar a ${n.master_npc_apodo}`}
                    className={`w-full flex items-center gap-3 border rounded-xl px-3 py-2 text-left transition-colors ${
                      noSePuede ? 'bg-superficie border-separador opacity-50 cursor-not-allowed'
                                : 'bg-superficie border-separador hover:border-tinte/40 hover:bg-tinte/10'}`}>
                    <img src={`/avatars/${n.master_npc_avatar}`} alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-relleno shrink-0"
                      onError={e => { e.currentTarget.style.opacity = '0.2' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-texto text-sm truncate">{n.master_npc_apodo}</span>
                        <span className="text-[10px] font-bold text-texto-2 bg-relleno-2 rounded px-1.5 py-0.5 shrink-0">Lv.{n.master_npc_level}</span>
                      </div>
                      <p className="text-xs text-texto-2">HP {n.master_npc_current_hp}/{n.master_npc_hp}</p>
                    </div>
                    {yaEsta && <span className="text-[10px] font-bold text-texto-2 shrink-0">En el campo</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

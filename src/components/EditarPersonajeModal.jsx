import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Plus, Search, Info } from 'lucide-react'
import { apiFetch } from '../api'
import FeatInfoModal from './FeatInfoModal'

/* Ventana de edición del jugador. Por ahora solo permite agregar feats (tipo General).
   onChanged: se llama tras agregar un feat (para refrescar la ficha / party). */
export default function EditarPersonajeModal({ personajeId, nombre, onClose, onChanged }) {
  const [full, setFull]       = useState(null)   // personaje completo (feats asignados)
  const [catalog, setCatalog] = useState([])     // catálogo de feats General
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [adding, setAdding]   = useState(null)    // feat_id que se está agregando
  const [error, setError]     = useState('')
  const [featInfo, setFeatInfo] = useState(null)  // detalle de un feat

  const loadFull = useCallback(() => {
    return apiFetch(`/personaje/${personajeId}/full`)
      .then(r => r.json())
      .then(setFull)
      .catch(() => {})
  }, [personajeId])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadFull(),
      apiFetch('/feats?type=General&limit=300').then(r => r.json())
        .then(d => setCatalog(d.data ?? [])).catch(() => setCatalog([])),
    ]).finally(() => setLoading(false))
  }, [loadFull])

  // Feats ya asignados (origen + background + extra); los no repetibles se ocultan del selector
  const assigned = new Set([
    full?.origin_feat?.feat_id,
    full?.background_feat?.feat_id,
    ...(full?.extra_feats || []).map(f => f.feat_id),
  ].filter(Boolean))

  const available = catalog
    .filter(f => Number(f.feat_is_repeatable) === 1 || !assigned.has(f.feat_id))
    .filter(f => !search || f.feat_name?.toLowerCase().includes(search.toLowerCase()))

  const extraFeats = full?.extra_feats || []

  const addFeat = async (feat) => {
    if (adding) return
    setAdding(feat.feat_id); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/feats`, {
        method: 'POST', body: JSON.stringify({ feat_id: feat.feat_id }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'No se pudo agregar el rasgo')
        return
      }
      await loadFull()
      onChanged?.()
    } catch {
      setError('No se pudo agregar el rasgo')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900 truncate">Editar jugador{nombre ? ` — ${nombre}` : ''}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Rasgos extra ya agregados */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Rasgos extra</p>
              {extraFeats.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aún no hay rasgos extra.</p>
              ) : (
                <div className="space-y-1.5">
                  {extraFeats.map((f, i) => (
                    <div key={f.personaje_feat_id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        <span className="text-gray-400 font-normal mr-1.5">Rasgo extra {i + 1}:</span>{f.feat_name}
                      </span>
                      <button onClick={() => setFeatInfo(f)} title="Ver detalle" className="text-gray-400 hover:text-red-600 shrink-0">
                        <Info size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agregar un rasgo (feats General) */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Agregar rasgo</p>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar rasgo..."
                  className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
              </div>
              {error && <p className="text-xs text-red-600 font-medium mb-2">{error}</p>}
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-3 py-3">Sin rasgos disponibles.</p>
                ) : available.map(f => (
                  <div key={f.feat_id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50">
                    <button onClick={() => setFeatInfo(f)} title="Ver detalle"
                      className="text-left min-w-0 flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800 truncate underline decoration-dotted decoration-gray-300 underline-offset-2 hover:text-red-700">{f.feat_name}</span>
                      {Number(f.feat_is_repeatable) === 1 && <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1 shrink-0">repetible</span>}
                    </button>
                    <button onClick={() => addFeat(f)} disabled={!!adding}
                      className="shrink-0 flex items-center gap-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-md transition-colors">
                      {adding === f.feat_id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Agregar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detalle de un rasgo */}
      {featInfo && <FeatInfoModal feat={featInfo} theme="light" onClose={() => setFeatInfo(null)} />}
    </div>
  )
}

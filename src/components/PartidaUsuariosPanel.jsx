import { useState, useEffect } from 'react'
import { X, UserPlus, Trash2 } from 'lucide-react'
import { apiFetch } from '../api'

export default function PartidaUsuariosPanel({ partida, onClose }) {
  const [miembros, setMiembros]       = useState([])
  const [disponibles, setDisponibles] = useState([])
  const [selectedId, setSelectedId]   = useState('')
  const [loading, setLoading]         = useState(true)
  const [adding, setAdding]           = useState(false)
  const [error, setError]             = useState('')

  const load = async () => {
    setLoading(true)
    const [m, d] = await Promise.all([
      apiFetch(`/partida/${partida.id_partida}/usuarios`).then(r => r.json()),
      apiFetch(`/partida/${partida.id_partida}/usuarios/available`).then(r => r.json()),
    ])
    setMiembros(m)
    setDisponibles(d)
    setSelectedId('')
    setLoading(false)
  }

  useEffect(() => { load() }, [partida.id_partida])

  const handleAdd = async () => {
    if (!selectedId) return
    setAdding(true); setError('')
    try {
      const res = await apiFetch(`/partida/${partida.id_partida}/usuarios`, {
        method: 'POST',
        body: JSON.stringify({ user_id: Number(selectedId) }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return }
      await load()
    } catch { setError('Error de conexión') }
    finally { setAdding(false) }
  }

  const handleRemove = async (user_id) => {
    await apiFetch(`/partida/${partida.id_partida}/usuarios/${user_id}`, { method: 'DELETE' })
    await load()
  }

  const ROLE_BADGE = {
    trainer:    'bg-blue-100 text-blue-700',
    espectador: 'bg-relleno text-texto-2',
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja shadow-hoja w-full max-w-md">
        <div className="bg-superficie px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-white font-bold">Usuarios de la partida</h2>
            <p className="text-texto-2 text-xs mt-0.5">{partida.nombre_partida}</p>
          </div>
          <button onClick={onClose} className="text-texto-2 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Agregar usuario */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-texto-2 uppercase tracking-wide">Agregar usuario</p>
            <div className="flex gap-2">
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="flex-1 px-3 py-2 border border-separador rounded-xl text-sm bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50"
              >
                <option value="">Seleccionar usuario...</option>
                {disponibles.map(u => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.user_name} ({u.role_name})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedId || adding}
                className="px-3 py-2 bg-acento hover:bg-acento-hover text-white rounded-xl transition-colors disabled:opacity-50"
              >
                <UserPlus size={16} />
              </button>
            </div>
            {disponibles.length === 0 && !loading && (
              <p className="text-xs text-texto-2">No hay usuarios disponibles para agregar.</p>
            )}
            {error && <p className="text-xs text-peligro">{error}</p>}
          </div>

          {/* Lista de miembros */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-texto-2 uppercase tracking-wide">
              Miembros ({miembros.length})
            </p>
            {loading
              ? <p className="text-xs text-texto-2">Cargando...</p>
              : miembros.length === 0
                ? <p className="text-xs text-texto-2">No hay usuarios en esta partida aún.</p>
                : (
                  <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                    {miembros.map(u => (
                      <li key={u.user_id} className="flex items-center justify-between px-3 py-2 bg-superficie rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-texto">{u.user_name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role_name] ?? 'bg-relleno text-texto-2'}`}>
                            {u.role_name}
                          </span>
                        </div>
                        <button onClick={() => handleRemove(u.user_id)}
                          className="text-texto-2 hover:text-tinte transition-colors p-1">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )
            }
          </div>

          <button onClick={onClose}
            className="w-full py-2 border border-separador rounded-xl text-sm text-texto-2 hover:bg-relleno transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

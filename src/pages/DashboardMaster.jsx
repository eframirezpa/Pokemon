import { useState, useEffect } from 'react'
import { Plus, Pencil, Power, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch, API_BASE_URL } from '../api'
import PartidaForm from '../components/PartidaForm'
import PartidaUsuariosPanel from '../components/PartidaUsuariosPanel'

function SpriteImg({ src }) {
  if (!src) return <div className="w-16 h-16 bg-gray-100 rounded-lg" />
  const url = src.startsWith('http') ? src : `${API_BASE_URL}${src}`
  return <img src={url} alt="" className="w-16 h-16 object-contain rounded-lg bg-gray-100" />
}

function PartidaCard({ partida, onEdit, onToggle, onUsers }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 transition-all
      ${partida.activada_partida ? 'border-green-200' : 'border-gray-200 opacity-70'}`}>

      {/* Sprites */}
      <div className="flex gap-2">
        <SpriteImg src={partida.sprite1_partida} />
        <SpriteImg src={partida.sprite2_partida} />
        <SpriteImg src={partida.sprite3_partida} />
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-800 text-sm leading-tight">{partida.nombre_partida}</h3>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full
            ${partida.activada_partida ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {partida.activada_partida ? 'Activa' : 'Cerrada'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{partida.descripcion_partida}</p>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-500">
        {[1, 2, 3].map(n => (
          <div key={n} className="bg-gray-50 rounded-lg p-1.5">
            <p className="font-semibold text-gray-700 truncate">{partida[`titulo${n}_partida`]}</p>
            <p className="truncate">{partida[`leyenda${n}_partida`]}</p>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <button onClick={() => onEdit(partida)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600
                     hover:bg-gray-100 rounded-lg transition-colors">
          <Pencil size={13} /> Editar
        </button>
        <button onClick={() => onUsers(partida)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600
                     hover:bg-gray-100 rounded-lg transition-colors">
          <Users size={13} /> Usuarios
        </button>
        <button onClick={() => onToggle(partida)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-colors
            ${partida.activada_partida
              ? 'text-red-600 hover:bg-red-50'
              : 'text-green-600 hover:bg-green-50'}`}>
          <Power size={13} /> {partida.activada_partida ? 'Cerrar' : 'Abrir'}
        </button>
      </div>
    </div>
  )
}

export default function DashboardMaster() {
  const { user } = useAuth()
  const [partidas, setPartidas]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [formPartida, setFormPartida] = useState(null)  // null=cerrado, false=nueva, obj=editar
  const [usersPartida, setUsersPartida] = useState(null)

  const load = async () => {
    setLoading(true)
    const res  = await apiFetch('/partida')
    const data = await res.json()
    setPartidas(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSaved = (saved) => {
    setPartidas(prev => {
      const idx = prev.findIndex(p => p.id_partida === saved.id_partida)
      return idx >= 0 ? prev.map((p, i) => i === idx ? saved : p) : [saved, ...prev]
    })
    setFormPartida(null)
  }

  const handleToggle = async (partida) => {
    const res  = await apiFetch(`/partida/${partida.id_partida}/toggle`, { method: 'PATCH' })
    const data = await res.json()
    setPartidas(prev => prev.map(p => p.id_partida === data.id_partida ? data : p))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Partidas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bienvenido, <span className="font-medium text-gray-700">{user?.user_name}</span></p>
        </div>
        <button
          onClick={() => setFormPartida(false)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white
                     px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Nueva partida
        </button>
      </div>

      {/* Grid */}
      {loading
        ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse space-y-3">
                <div className="flex gap-2">
                  {[1,2,3].map(n => <div key={n} className="w-16 h-16 bg-gray-200 rounded-lg" />)}
                </div>
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        )
        : partidas.length === 0
          ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium">No tienes partidas aún</p>
              <p className="text-sm mt-1">Crea tu primera partida con el botón de arriba</p>
            </div>
          )
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {partidas.map(p => (
                <PartidaCard
                  key={p.id_partida}
                  partida={p}
                  onEdit={setFormPartida}
                  onToggle={handleToggle}
                  onUsers={setUsersPartida}
                />
              ))}
            </div>
          )
      }

      {/* Modales */}
      {formPartida !== null && (
        <PartidaForm
          partida={formPartida || null}
          onClose={() => setFormPartida(null)}
          onSaved={handleSaved}
        />
      )}
      {usersPartida && (
        <PartidaUsuariosPanel
          partida={usersPartida}
          onClose={() => setUsersPartida(null)}
        />
      )}
    </div>
  )
}

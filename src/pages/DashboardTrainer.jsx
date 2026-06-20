import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import PartidaPresentacion from '../components/PartidaPresentacion'

export default function DashboardTrainer() {
  const { user } = useAuth()
  const [partidas, setPartidas]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [presentacion, setPresentacion]   = useState(null)  // partida activa en presentación
  const [panelPartida, setPanelPartida]   = useState(null)  // partida cuyo panel se muestra

  useEffect(() => {
    apiFetch('/partida/mis-partidas')
      .then(r => r.json())
      .then(d => setPartidas(Array.isArray(d) ? d : []))
      .catch(() => setPartidas([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (partida) => {
    setPresentacion(partida)
    setPanelPartida(null)
  }

  const handleFinishPresentacion = () => {
    setPanelPartida(presentacion)
    setPresentacion(null)
  }

  // ── Panel de la partida ──────────────────────────────────────────────────
  if (panelPartida) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <h1 className="text-2xl font-bold text-gray-800">Panel del Trainer</h1>
        <p className="text-gray-500 text-sm">{panelPartida.nombre_partida}</p>
        <button
          onClick={() => setPanelPartida(null)}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          ← Volver a mis partidas
        </button>
      </div>
    )
  }

  // ── Presentación ─────────────────────────────────────────────────────────
  if (presentacion) {
    return (
      <PartidaPresentacion
        partida={presentacion}
        onFinish={handleFinishPresentacion}
      />
    )
  }

  // ── Lista de partidas ────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Partidas</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Bienvenido, <span className="font-medium text-gray-700">{user?.user_name}</span>
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : partidas.length === 0 ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Sin partidas asignadas</p>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
              Actualmente no estás asociado a ninguna partida activa.
              Comunícate con tu Master para que te agregue a una partida.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {partidas.map(p => (
            <button
              key={p.id_partida}
              onClick={() => handleSelect(p)}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4
                         hover:border-red-300 hover:shadow-md hover:-translate-y-0.5
                         transition-all duration-200 group"
            >
              <p className="font-semibold text-gray-800 group-hover:text-red-700 transition-colors">
                {p.nombre_partida}
              </p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.descripcion_partida}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

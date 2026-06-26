import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { LogOut, Plus, UserCircle, Check, LogIn, Loader2, Eye } from 'lucide-react'
import { apiFetch } from '../api'
import CharacterWizard from '../components/CharacterWizard'
import CharacterSheet from '../components/CharacterSheet'

export default function PartidaLobby() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const location  = useLocation()
  const nombre    = location.state?.nombre || `Partida #${id}`

  const [personajes, setPersonajes] = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [showWizard, setShowWizard] = useState(false)
  const [viewChar, setViewChar]     = useState(null)

  const load = () => {
    setLoading(true)
    apiFetch(`/personaje?id_partida=${id}`)
      .then(r => r.json())
      .then(d => setPersonajes(Array.isArray(d) ? d : []))
      .catch(() => setPersonajes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleCreated = (personaje) => {
    setShowWizard(false)
    setPersonajes(prev => [...prev, personaje])
    setSelected(personaje.id_personaje)
  }

  const handleEnter = () => {
    const personaje = personajes.find(p => p.id_personaje === selected)
    navigate(`/trainer-partida/${id}`, { state: { nombre, personaje } })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div>
          <p className="text-white font-semibold text-sm">{nombre}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lobby — Selecciona tu personaje</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/trainer')}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-all"
        >
          <LogOut size={14} /> Salir
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold">Tus personajes</h1>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Crear personaje
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
          </div>
        ) : personajes.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 border border-gray-700 rounded-2xl">
            <UserCircle size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-300 font-medium">Aún no tienes personajes</p>
            <p className="text-gray-500 text-sm mt-1">Crea uno para poder ingresar a la partida.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personajes.map(p => {
              const isSel = selected === p.id_personaje
              return (
                <div key={p.id_personaje} className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setSelected(p.id_personaje)}
                    className={`text-left rounded-2xl border p-4 transition-all flex items-center gap-3 ${
                      isSel ? 'border-red-400 bg-red-900/20 ring-1 ring-red-400' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSel ? 'bg-red-500' : 'bg-gray-700'}`}>
                      {isSel ? <Check size={18} /> : <UserCircle size={20} className="text-gray-300" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.nombre_personaje || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-400">Nivel {p.personaje_level ?? 1}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setViewChar(p.id_personaje)}
                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400
                               hover:text-white hover:bg-gray-800 border border-gray-700 rounded-xl py-1.5 transition-colors"
                  >
                    <Eye size={13} /> Ver información completa
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Ingresar */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleEnter}
            disabled={!selected}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-lg"
          >
            <LogIn size={18} /> Ingresar a la partida
          </button>
        </div>
      </div>

      {showWizard && (
        <CharacterWizard idPartida={Number(id)} onClose={() => setShowWizard(false)} onCreated={handleCreated} />
      )}

      {viewChar && (
        <CharacterSheet id={viewChar} onClose={() => setViewChar(null)} />
      )}
    </div>
  )
}

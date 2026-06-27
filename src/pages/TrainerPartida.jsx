import { useState, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Smartphone, User, Backpack, Shield, Sword, X } from 'lucide-react'
import PartidaRoom from '../components/PartidaRoom'
import PokemonList from './PokemonList'
import CharacterSheet from '../components/CharacterSheet'
import Mochila from '../components/Mochila'
import Equipamiento from '../components/Equipamiento'
import { apiFetch } from '../api'

export default function TrainerPartida() {
  const { id }   = useParams()
  const location = useLocation()
  const stateId  = location.state?.personaje?.id_personaje ?? null

  const [personajeId, setPersonajeId] = useState(stateId)
  const [showPokedex, setShowPokedex] = useState(false)
  const [showChar, setShowChar]       = useState(false)
  const [showMochila, setShowMochila] = useState(false)
  const [showEquip, setShowEquip]     = useState(false)

  // Recupera el personaje del usuario: state → localStorage → backend (para recargas)
  useEffect(() => {
    const storeKey = `trainer_personaje_${id}`
    if (stateId) { localStorage.setItem(storeKey, String(stateId)); return }

    const stored = localStorage.getItem(storeKey)
    if (stored) { setPersonajeId(Number(stored)); return }

    apiFetch(`/personaje?id_partida=${id}`)
      .then(r => r.json())
      .then(list => {
        const first = Array.isArray(list) && list[0]
        if (first) {
          setPersonajeId(first.id_personaje)
          localStorage.setItem(storeKey, String(first.id_personaje))
        }
      })
      .catch(() => {})
  }, [id, stateId])

  return (
    <PartidaRoom roleLabel="Trainer">
      <div className="relative flex items-center justify-center h-full">
        <p className="text-gray-600 text-sm">Panel del Trainer — próximamente</p>

        {/* Botón de celular — abre la Pokédex */}
        <button
          onClick={() => setShowPokedex(true)}
          className="fixed left-3 top-1/2 translate-y-[6px] z-30 flex items-center justify-center
                     w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                     border border-gray-600 transition-all"
          title="Abrir Pokédex"
        >
          <Smartphone size={18} />
        </button>

        {/* Botón de usuario — muestra la información del personaje */}
        {personajeId && (
          <button
            onClick={() => setShowChar(true)}
            className="fixed left-3 top-1/2 translate-y-[calc(100%+12px)] z-30 flex items-center justify-center
                       w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Ver mi personaje"
          >
            <User size={18} />
          </button>
        )}

        {/* Botón de mochila — items del personaje */}
        {personajeId && (
          <button
            onClick={() => setShowMochila(true)}
            className="fixed left-3 top-1/2 translate-y-[calc(200%+18px)] z-30 flex items-center justify-center
                       w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Mochila"
          >
            <Backpack size={18} />
          </button>
        )}

        {/* Botón de equipamiento — armas y armaduras equipadas */}
        {personajeId && (
          <button
            onClick={() => setShowEquip(true)}
            className="fixed left-3 top-1/2 translate-y-[calc(300%+24px)] z-30 flex items-center justify-center
                       w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Equipamiento"
          >
            <span className="relative inline-flex items-center justify-center">
              <Shield size={18} />
              <Sword size={11} className="absolute -bottom-1 -right-1.5" />
            </span>
          </button>
        )}
      </div>

      {/* Modal Pokédex */}
      {showPokedex && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowPokedex(false) }}
        >
          <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
            <button
              onClick={() => setShowPokedex(false)}
              className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center
                         rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              title="Cerrar"
            >
              <X size={18} />
            </button>
            <PokemonList title="Pokédex" />
          </div>
        </div>
      )}

      {/* Hoja del personaje */}
      {showChar && personajeId && (
        <CharacterSheet id={personajeId} onClose={() => setShowChar(false)} />
      )}

      {/* Mochila */}
      {showMochila && personajeId && (
        <Mochila personajeId={personajeId} onClose={() => setShowMochila(false)} />
      )}

      {/* Equipamiento */}
      {showEquip && personajeId && (
        <Equipamiento personajeId={personajeId} onClose={() => setShowEquip(false)} />
      )}
    </PartidaRoom>
  )
}

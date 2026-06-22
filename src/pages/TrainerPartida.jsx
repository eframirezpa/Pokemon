import { useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import PartidaRoom from '../components/PartidaRoom'
import PokemonList from './PokemonList'

export default function TrainerPartida() {
  const [showPokedex, setShowPokedex] = useState(false)

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
    </PartidaRoom>
  )
}

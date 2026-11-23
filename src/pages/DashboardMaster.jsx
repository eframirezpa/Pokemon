import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Power, Users, LogIn, Cat, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch, API_BASE_URL } from '../api'
import PartidaForm from '../components/PartidaForm'
import PartidaUsuariosPanel from '../components/PartidaUsuariosPanel'
import { Pagina, CabeceraPagina, Vacio } from '../components/ui/Pagina'
import Boton from '../components/ui/Boton'
import PartidaPresentacion from '../components/PartidaPresentacion'
import MasterPokemonPanel from '../components/MasterPokemonPanel'
import MasterNpcPanel from '../components/MasterNpcPanel'

function SpriteImg({ src }) {
  if (!src) return <div className="w-16 h-16 bg-relleno rounded-lg" />
  const url = src.startsWith('http') ? src : `${API_BASE_URL}${src}`
  return <img src={url} alt="" className="w-16 h-16 object-contain rounded-lg bg-relleno" />
}

function PartidaCard({ partida, onEdit, onToggle, onUsers, onEnter }) {
  return (
    <div className={`bg-superficie rounded-[20px] p-4 flex flex-col gap-3 transition-all
      ${partida.activada_partida ? 'ring-2 ring-ok/30' : 'opacity-70'}`}>

      {/* Sprites */}
      <div className="flex gap-2">
        <SpriteImg src={partida.sprite1_partida} />
        <SpriteImg src={partida.sprite2_partida} />
        <SpriteImg src={partida.sprite3_partida} />
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-texto text-[17px] tracking-[-.02em] leading-tight">{partida.nombre_partida}</h3>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full
            ${partida.activada_partida ? 'bg-ok/15 text-ok' : 'bg-relleno text-texto-2'}`}>
            {partida.activada_partida ? 'Activa' : 'Cerrada'}
          </span>
        </div>
        <p className="text-xs text-texto-2 mt-1 line-clamp-2">{partida.descripcion_partida}</p>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-3 gap-1 text-[10px] text-texto-2">
        {[1, 2, 3].map(n => (
          <div key={n} className="bg-fondo rounded-lg p-1.5">
            <p className="font-semibold text-texto truncate">{partida[`titulo${n}_partida`]}</p>
            <p className="truncate">{partida[`leyenda${n}_partida`]}</p>
          </div>
        ))}
      </div>

      {/* Entrar — solo si está activa */}
      {partida.activada_partida && (
        <button
          onClick={() => onEnter(partida)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-acento hover:bg-acento-hover
                     text-white text-xs font-semibold rounded-xl transition-colors"
        >
          <LogIn size={13} /> Entrar a la partida
        </button>
      )}

      {/* Acciones */}
      <div className="flex gap-2 pt-1 border-t border-separador">
        <button onClick={() => onEdit(partida)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-texto-2
                     hover:bg-relleno rounded-lg transition-colors">
          <Pencil size={13} /> Editar
        </button>
        <button onClick={() => onUsers(partida)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-texto-2
                     hover:bg-relleno rounded-lg transition-colors">
          <Users size={13} /> Usuarios
        </button>
        <button onClick={() => onToggle(partida)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-colors
            ${partida.activada_partida
              ? 'text-tinte hover:bg-tinte/10'
              : 'text-ok hover:bg-ok/10'}`}>
          <Power size={13} /> {partida.activada_partida ? 'Cerrar' : 'Abrir'}
        </button>
      </div>
    </div>
  )
}

export default function DashboardMaster() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [partidas, setPartidas]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [formPartida, setFormPartida]     = useState(null)
  const [usersPartida, setUsersPartida]   = useState(null)
  const [presentacion, setPresentacion]   = useState(null)
  const [showPokemon, setShowPokemon]     = useState(false)
  const [showNpc, setShowNpc]             = useState(false)

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

  const handleFinishPresentacion = () => {
    const p = presentacion
    setPresentacion(null)
    navigate(`/master-partida/${p.id_partida}`, { state: { nombre: p.nombre_partida } })
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

  return (
    <Pagina>
      <CabeceraPagina titulo="Mis partidas"
        subtitulo={<>Bienvenido, <span className="font-semibold text-texto">{user?.user_name}</span></>}
        accion={
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => setFormPartida(false)}><Plus size={16} /> Nueva partida</Boton>
            <Boton variante="tintado" onClick={() => setShowPokemon(true)}><Cat size={16} /> Pokémones</Boton>
            <Boton variante="tintado" onClick={() => setShowNpc(true)}><UserPlus size={16} /> Agregar NPC</Boton>
          </div>
        } />

      {/* Grid */}
      {loading
        ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-superficie rounded-[20px] p-4 animate-pulse space-y-3">
                <div className="flex gap-2">
                  {[1,2,3].map(n => <div key={n} className="w-16 h-16 bg-relleno-2 rounded-lg" />)}
                </div>
                <div className="h-3 bg-relleno-2 rounded w-3/4" />
                <div className="h-3 bg-relleno-2 rounded w-full" />
              </div>
            ))}
          </div>
        )
        : partidas.length === 0
          ? (
            <Vacio titulo="No tienes partidas aún" detalle="Crea tu primera partida con el botón de arriba." />
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
                  onEnter={setPresentacion}
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
      {showNpc && <MasterNpcPanel onClose={() => setShowNpc(false)} />}

      {showPokemon && (
        <MasterPokemonPanel onClose={() => setShowPokemon(false)} />
      )}
    </Pagina>
  )
}

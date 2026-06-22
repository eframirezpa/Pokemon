import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { LogOut, ChevronLeft, ChevronDown, Users, Send, Plus, Minus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { usePartidaPresence } from '../hooks/usePartidaPresence'
import PokemonList from '../pages/PokemonList'

const ROLE_DASHBOARD = {
  master:     '/dashboard/master',
  trainer:    '/dashboard/trainer',
  espectador: '/dashboard/espectador',
}

const ROLE_COLORS = {
  trainer:    'text-blue-400',
  espectador: 'text-gray-400',
  master:     'text-red-400',
}

const TYPE_COLORS = {
  Normal:{bg:'#A8A878',dark:false}, Fire:{bg:'#F08030',dark:false}, Water:{bg:'#6890F0',dark:false},
  Grass:{bg:'#78C850',dark:false}, Electric:{bg:'#F8D030',dark:true}, Ice:{bg:'#98D8D8',dark:true},
  Fighting:{bg:'#C03028',dark:false}, Poison:{bg:'#A040A0',dark:false}, Ground:{bg:'#E0C068',dark:true},
  Flying:{bg:'#A890F0',dark:false}, Psychic:{bg:'#F85888',dark:false}, Bug:{bg:'#A8B820',dark:false},
  Rock:{bg:'#B8A038',dark:false}, Ghost:{bg:'#705898',dark:false}, Dragon:{bg:'#7038F8',dark:false},
  Dark:{bg:'#705848',dark:false}, Steel:{bg:'#B8B8D0',dark:true}, Fairy:{bg:'#EE99AC',dark:true},
}

function TypeBadge({ type }) {
  if (!type) return null
  const c = TYPE_COLORS[type] ?? { bg: '#888', dark: false }
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold leading-none"
      style={{ backgroundColor: c.bg, color: c.dark ? '#374151' : '#fff' }}>
      {type}
    </span>
  )
}

const hpPct   = p => Math.max(0, Math.min(100, Math.round((p.hp_current / p.hp_max) * 100)))
const hpColor = pct => pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444'

const splitList = s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : []

// Devuelve los nombres de movimientos que el Pokémon conoce según su nivel
const levelMoves = (d, level) => {
  const names = [...splitList(d.pokemon_moves_start)]
  if (level >= 2)  names.push(...splitList(d.pokemon_moves_level2))
  if (level >= 6)  names.push(...splitList(d.pokemon_moves_level6))
  if (level >= 10) names.push(...splitList(d.pokemon_moves_level10))
  if (level >= 14) names.push(...splitList(d.pokemon_moves_level14))
  if (level >= 18) names.push(...splitList(d.pokemon_moves_level18))
  return [...new Set(names)]
}

/* Tarjeta de vida del Pokémon — vista de trainer/espectador (con imagen) */
function PokemonHpCard({ p }) {
  const pct = hpPct(p)
  return (
    <div className="flex items-center gap-3 bg-gray-100 border-2 border-gray-700 rounded-2xl shadow-xl p-2.5 w-64">
      <img src={p.sprite} alt={p.name}
        className="w-16 h-16 object-contain bg-white rounded-xl shrink-0 border border-gray-300"
        onError={e => { e.target.style.opacity = '0.2' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-900 text-sm truncate">{p.name}</span>
          <span className="text-xs font-bold text-gray-700 shrink-0">Lv.{p.level}</span>
        </div>
        <div className="flex gap-1 my-1">
          <TypeBadge type={p.type1} />
          <TypeBadge type={p.type2} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-amber-600">HP</span>
          <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
            <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
          </div>
        </div>
        <p className="text-right text-[10px] font-bold text-gray-700 mt-0.5">{p.hp_current}/{p.hp_max}</p>
      </div>
    </div>
  )
}

/* Panel de Pokémon del master — botón + Pokémon y controles de vida */
function MasterPokemonPanel({ pokemon, onAdd, onHp, onHpSet, onRemove, onCast }) {
  return (
    <div className="shrink-0 px-4 pt-3">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700
                   border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-colors"
      >
        <Plus size={15} /> Pokémon
      </button>

      {pokemon && (
        <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm truncate">{pokemon.name}</span>
                <span className="text-[10px] text-gray-400 shrink-0">Lv.{pokemon.level}</span>
              </div>
              <div className="flex gap-1 mt-1">
                <TypeBadge type={pokemon.type1} />
                <TypeBadge type={pokemon.type2} />
              </div>
            </div>
            <button onClick={onRemove} className="text-gray-500 hover:text-red-400 transition-colors shrink-0" title="Quitar">
              <X size={16} />
            </button>
          </div>

          {/* Controles de vida */}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => onHp(-1)}
              className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors">
              <Minus size={15} />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={pokemon.hp_max}
                value={pokemon.hp_current}
                onChange={e => onHpSet(Number(e.target.value))}
                className="w-full h-2.5 cursor-pointer"
                style={{ accentColor: hpColor(hpPct(pokemon)) }}
              />
              <p className="text-center text-[11px] font-bold text-white mt-1">
                HP {pokemon.hp_current}/{pokemon.hp_max}
              </p>
            </div>
            <button onClick={() => onHp(1)}
              className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-green-600 flex items-center justify-center text-white transition-colors">
              <Plus size={15} />
            </button>
          </div>

          {/* Movimientos según el nivel */}
          {pokemon.moves?.length > 0 && (
            <div className="mt-3 border-t border-gray-700 pt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Movimientos</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {pokemon.moves.map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white text-xs font-medium truncate">{m.name}</span>
                      <TypeBadge type={m.type} />
                    </div>
                    <button
                      onClick={() => onCast(m.name)}
                      className="shrink-0 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Lanzar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* Banner superior del master — visible para trainer y espectador */
function MasterBanner({ nombre, message }) {
  return (
    <div className="shrink-0 px-4 pt-4">
      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-800 via-gray-800 to-slate-900
                      border border-gray-700 rounded-2xl p-3 shadow-lg">
        <img
          src="/avatars/chuckface.png"
          alt="Master"
          className="w-14 h-14 rounded-full border-2 border-amber-500/60 object-cover shrink-0 bg-gray-700"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1 truncate">
            Campaña: {nombre}
          </p>
          <div className="relative bg-gray-700/70 rounded-xl rounded-tl-sm px-3 py-2">
            <p className="text-sm text-gray-100 leading-snug">{message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Componente de envío de mensaje — visible solo para el master */
function MasterSendMessage({ onSend }) {
  const [text, setText] = useState('')
  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  return (
    <div className="shrink-0 px-4 pt-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 shadow-lg">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enviar mensaje</p>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Escribe un mensaje para los jugadores..."
            className="flex-1 bg-gray-700 text-white text-sm rounded-full px-4 py-2.5
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="w-11 h-11 shrink-0 rounded-full bg-green-500 hover:bg-green-600
                       disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center
                       text-white transition-all shadow-md"
            title="Enviar"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function TrainerCard({ u }) {
  const initials = (u.user_name ?? '?').slice(0, 2).toUpperCase()
  return (
    <div className="flex flex-col items-center gap-1 bg-white/10 rounded-xl p-1.5">
      <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 bg-gray-700 shrink-0">
        {u.avatar_face_url
          ? <img src={u.avatar_face_url} alt="" className="w-full h-full object-cover" />
          : null
        }
      </div>
      <div className="flex items-center gap-1">
        <span className="text-white text-xs font-bold leading-none">{initials}</span>
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0" />
      </div>
    </div>
  )
}

export default function PartidaRoom({ children, roleLabel }) {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const location    = useLocation()
  const { user }    = useAuth()
  const logEndRef   = useRef(null)

  const nombre = location.state?.nombre || `Partida #${id}`
  const [panelOpen, setPanelOpen]   = useState(false)
  const [logOpen, setLogOpen]       = useState(true)
  const [showPokedex, setShowPokedex] = useState(false)

  const isMaster = user?.role === 'master'

  const { presentes, log, masterMessage, sendMasterMessage, activePokemon, sendPokemon } = usePartidaPresence(id, user)

  const trainers = presentes.filter(u => u.role === 'trainer' || u.role === 'espectador')

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  // El master elige un Pokémon de la Pokédex → se carga su info completa
  const handlePickPokemon = async (pk) => {
    setShowPokedex(false)
    try {
      const [pRes, mRes] = await Promise.all([
        apiFetch(`/pokemon/${pk.pokemon_id}`),
        apiFetch('/moves?limit=1000'),
      ])
      const d     = await pRes.json()
      const mData = await mRes.json()

      const moveType = {}
      for (const m of (mData.data ?? [])) moveType[m.move_name.toLowerCase()] = m.move_type

      const level = d.pokemon_min_level || 1
      const moves = levelMoves(d, level).map(n => ({ name: n, type: moveType[n.toLowerCase()] || null }))

      sendPokemon({
        pokemon_id:  d.pokemon_id,
        name:        d.pokemon_name,
        type1:       d.pokemon_type_1,
        type2:       d.pokemon_type_2,
        level,
        hp_max:      d.pokemon_hit_points,
        hp_current:  d.pokemon_hit_points,
        sprite:      d.pokemon_media_sprite || d.pokemon_media_main,
        moves,
      })
    } catch { /* noop */ }
  }

  const handleHpChange = (delta) => {
    if (!activePokemon) return
    const hp = Math.max(0, Math.min(activePokemon.hp_max, activePokemon.hp_current + delta))
    sendPokemon({ ...activePokemon, hp_current: hp })
  }

  const handleHpSet = (value) => {
    if (!activePokemon) return
    const hp = Math.max(0, Math.min(activePokemon.hp_max, value))
    sendPokemon({ ...activePokemon, hp_current: hp })
  }

  const handleCast = (moveName) => {
    if (!activePokemon) return
    sendMasterMessage(`${activePokemon.name} ha usado el movimiento ${moveName}`)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div>
          <p className="text-white font-semibold text-sm">{nombre}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">{roleLabel}</p>
        </div>
        <button
          onClick={() => navigate(ROLE_DASHBOARD[user?.role] ?? '/')}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300
                     hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-all"
        >
          <LogOut size={14} /> Salir
        </button>
      </div>

      {/* Main layout */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Botón flotante — abre el panel de jugadores cuando está oculto */}
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="fixed left-3 top-1/2 -translate-y-[calc(100%+6px)] z-30 flex items-center justify-center w-10 h-10
                       rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Mostrar jugadores"
          >
            <Users size={18} />
          </button>
        )}

        {/* Left — Trainers */}
        {panelOpen && (
          <div className="w-16 shrink-0 flex flex-col bg-gray-800/50 border-r border-gray-700 overflow-hidden">
            {/* Header con toggle */}
            <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
              <button
                onClick={() => setPanelOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Ocultar jugadores"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Lista de jugadores */}
            <div className="flex flex-col gap-2 px-1.5 pb-4 overflow-y-auto">
              {trainers.length === 0
                ? <p className="text-[10px] text-gray-600 italic text-center">Sin jugadores</p>
                : trainers.map(u => <TrainerCard key={u.user_id} u={u} />)
              }
            </div>
          </div>
        )}

        {/* Center — master panel + content + activity log */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Panel del master arriba */}
          {isMaster ? (
            <>
              <MasterSendMessage onSend={sendMasterMessage} />
              <MasterPokemonPanel
                pokemon={activePokemon}
                onAdd={() => setShowPokedex(true)}
                onHp={handleHpChange}
                onHpSet={handleHpSet}
                onRemove={() => sendPokemon(null)}
                onCast={handleCast}
              />
            </>
          ) : (
            <MasterBanner nombre={nombre} message={masterMessage} />
          )}

          {/* Role-specific content area */}
          <div className="relative flex-1 overflow-auto p-6">
            {/* Tarjeta de vida del Pokémon — parte superior derecha (trainer/espectador) */}
            {!isMaster && activePokemon && (
              <div className="absolute top-4 right-4 z-10">
                <PokemonHpCard p={activePokemon} />
              </div>
            )}
            {children}
          </div>

          {/* Activity log */}
          <div className={`shrink-0 border-t border-gray-700 bg-gray-800/60 flex flex-col transition-all duration-300 ${logOpen ? 'h-40' : 'h-9'}`}>
            <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Actividad de la partida
              </p>
              <button
                onClick={() => setLogOpen(o => !o)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform duration-300 ${logOpen ? '' : 'rotate-180'}`} />
              </button>
            </div>
            {logOpen && (
              <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-1">
                {log.length === 0
                  ? <p className="text-xs text-gray-600 italic">Sin actividad aún...</p>
                  : log.map((e, i) => (
                    <p key={i} className="text-xs leading-relaxed">
                      <span className="text-gray-600 text-[10px] mr-2">
                        {new Date(e.time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className={ROLE_COLORS[e.role] ?? 'text-gray-300'}>
                        {e.text}
                      </span>
                    </p>
                  ))
                }
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Pokédex — selección del master */}
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
            <PokemonList title="Pokédex" onPick={handlePickPokemon} />
          </div>
        </div>
      )}
    </div>
  )
}

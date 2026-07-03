import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LogOut, ChevronDown, Users, Send, Plus, Minus, X, Eye, EyeOff,
  Zap, Flame, Droplet, Leaf, Snowflake, Swords, Skull, Mountain,
  Feather, Brain, Bug, Gem, Ghost, Sparkles, Moon, Shield, Wand2, Star,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { usePartidaPresence } from '../hooks/usePartidaPresence'
import PokemonList from '../pages/PokemonList'
import PartyPanel from './PartyPanel'

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

// Icono representativo por tipo de ataque
const TYPE_ICONS = {
  Normal: Star,    Fire: Flame,      Water: Droplet,   Grass: Leaf,
  Electric: Zap,   Ice: Snowflake,   Fighting: Swords, Poison: Skull,
  Ground: Mountain, Flying: Feather, Psychic: Brain,   Bug: Bug,
  Rock: Gem,       Ghost: Ghost,     Dragon: Sparkles, Dark: Moon,
  Steel: Shield,   Fairy: Wand2,
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

/* Signo de interrogación estilo Pokémon (amarillo con contorno azul) */
function MysteryMark({ size = 'text-4xl' }) {
  return (
    <span className={`${size} font-black text-yellow-400 leading-none`}
      style={{ WebkitTextStroke: '1.5px #1e3a5f', textShadow: '0 1px 0 #1e3a5f' }}>
      ?
    </span>
  )
}

/* Tarjeta de vida del Pokémon — vista de trainer/espectador (con imagen) */
function PokemonHpCard({ p }) {
  const pct    = hpPct(p)
  const hidden = !!p.hidden
  // Efecto de sangrado: pulso de fondo según la vida (se mantiene aunque esté oculto)
  const bleedClass = pct <= 20 ? 'animate-bleed-red' : pct <= 50 ? 'animate-bleed-yellow' : 'bg-gray-100'

  return (
    <div className={`flex items-center gap-3 border-2 border-gray-700 rounded-2xl shadow-xl p-2.5 w-64 ${bleedClass}`}>
      {/* Sprite */}
      {hidden ? (
        <div className="w-16 h-16 rounded-xl shrink-0 border border-gray-300 bg-white flex items-center justify-center">
          <MysteryMark />
        </div>
      ) : (
        <img src={p.sprite} alt={p.name}
          className="w-16 h-16 object-contain bg-white rounded-xl shrink-0 border border-gray-300"
          onError={e => { e.target.style.opacity = '0.2' }} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-900 text-sm truncate">{hidden ? '???' : p.name}</span>
          <span className="text-xs font-bold text-gray-700 shrink-0">Lv.{p.level}</span>
        </div>
        <div className="flex gap-1 my-1 min-h-[14px]">
          {!hidden && <><TypeBadge type={p.type1} /><TypeBadge type={p.type2} /></>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-amber-600">HP</span>
          {hidden ? (
            <span className="text-[10px] font-bold text-gray-700">???</span>
          ) : (
            <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
              <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
            </div>
          )}
        </div>
        {!hidden && (
          <p className="text-right text-[10px] font-bold text-gray-700 mt-0.5">{p.hp_current}/{p.hp_max}</p>
        )}
      </div>
    </div>
  )
}

/* Card de un Pokémon del master — colapsable (toggle) */
function MasterPokemonCard({ pokemon, onHp, onHpSet, onRemove, onCast, onToggleHidden }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-lg self-start">
      {/* Encabezado (toggle repliega/expande) */}
      <div
        onClick={() => setCollapsed(c => !c)}
        className="flex items-start justify-between gap-2 cursor-pointer select-none"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            <span className="text-white font-bold text-sm truncate">{pokemon.name}</span>
            <span className="text-[10px] text-gray-400 shrink-0">Lv.{pokemon.level}</span>
          </div>
          <div className="flex gap-1 mt-1 pl-5">
            <TypeBadge type={pokemon.type1} />
            <TypeBadge type={pokemon.type2} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onToggleHidden(pokemon.uid) }}
            className={`transition-colors ${pokemon.hidden ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-white'}`}
            title={pokemon.hidden ? 'Revelar a los jugadores' : 'Ocultar a los jugadores'}
          >
            {pokemon.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(pokemon.uid) }} className="text-gray-500 hover:text-red-400 transition-colors" title="Quitar">
            <X size={16} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Controles de vida */}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => onHp(pokemon.uid, -1)}
              className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors">
              <Minus size={15} />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={pokemon.hp_max}
                value={pokemon.hp_current}
                onChange={e => onHpSet(pokemon.uid, Number(e.target.value))}
                className="w-full h-2.5 cursor-pointer"
                style={{ accentColor: hpColor(hpPct(pokemon)) }}
              />
              <p className="text-center text-[11px] font-bold text-white mt-1">
                HP {pokemon.hp_current}/{pokemon.hp_max}
              </p>
            </div>
            <button onClick={() => onHp(pokemon.uid, 1)}
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
                      onClick={() => onCast(pokemon, m.name, m.type)}
                      className="shrink-0 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Lanzar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* Panel de Pokémon del master — botón + grid de Pokémon (máx. según `max`) */
function MasterPokemonPanel({ pokemons, max = 4, onAdd, onHp, onHpSet, onRemove, onCast, onToggleHidden }) {
  const full = pokemons.length >= max
  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 pt-3">
      <button
        onClick={onAdd}
        disabled={full}
        className="shrink-0 w-full flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800
                   border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-colors"
      >
        <Plus size={15} /> Pokémon <span className="text-gray-400">({pokemons.length}/{max})</span>
      </button>

      {pokemons.length > 0 && (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2 flex-1 min-h-0 overflow-y-auto content-start">
          {pokemons.map(p => (
            <MasterPokemonCard
              key={p.uid}
              pokemon={p}
              onHp={onHp}
              onHpSet={onHpSet}
              onRemove={onRemove}
              onCast={onCast}
              onToggleHidden={onToggleHidden}
            />
          ))}
        </div>
      )}
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

/* Panel de eventos del master — toggle protegido por contraseña */
const EVENT_PASSWORD = 'ravecalvitomaster'
const EVENTOS = [
  { label: 'Fire',   url: '/evento0/fire.png' },
  { label: 'Forest', url: '/evento0/forest.png' },
  { label: 'Frost',  url: '/evento0/frost.png' },
]

function EventosPanel({ onBackground }) {
  const [open, setOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [asking, setAsking] = useState(false)
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState(false)

  const toggle = () => {
    if (open) { setOpen(false); return }
    if (unlocked) { setOpen(true); return }
    setAsking(true); setErr(false); setPwd('')
  }
  const submit = () => {
    if (pwd === EVENT_PASSWORD) {
      setUnlocked(true); setOpen(true); setAsking(false); setPwd(''); setErr(false)
    } else { setErr(true) }
  }

  return (
    <div className="shrink-0 px-4 pt-3">
      <button onClick={toggle}
        className="w-full flex items-center justify-between gap-1.5 py-2 bg-gray-800 hover:bg-gray-700
                   border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-colors">
        <span>Eventos</span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {asking && !unlocked && (
        <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contraseña</p>
          <div className="flex items-center gap-2">
            <input type="password" value={pwd} autoFocus
              onChange={e => { setPwd(e.target.value); setErr(false) }}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Contraseña"
              className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50" />
            <button onClick={submit} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shrink-0">Entrar</button>
          </div>
          {err && <p className="text-[11px] text-red-400 mt-1">Contraseña incorrecta</p>}
        </div>
      )}

      {open && unlocked && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {EVENTOS.map(ev => (
            <button key={ev.url} onClick={() => onBackground(ev.url)}
              className="py-2 bg-gray-700 hover:bg-red-600 border border-gray-600 text-gray-200 text-xs font-semibold rounded-xl transition-colors">
              {ev.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PartidaRoom({ children, personajeId = null, apiRef = null, pokemonInvocado = null }) {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const logEndRef   = useRef(null)

  const [showParty, setShowParty]   = useState(false)
  const [logOpen, setLogOpen]       = useState(true)
  const [showPokedex, setShowPokedex] = useState(false)
  // Detecta celular (no tablet) y su orientación
  const detectDevice = () => {
    if (typeof window === 'undefined') return { phone: false, phoneLandscape: false }
    const w = window.innerWidth, h = window.innerHeight
    const phone = Math.min(w, h) < 500
    return { phone, phoneLandscape: phone && w > h }
  }
  const [device, setDevice] = useState(detectDevice)
  const isPhone = device.phone
  const isPhoneLandscape = device.phoneLandscape

  useEffect(() => {
    const onResize = () => setDevice(detectDevice())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  const isMaster = user?.role === 'master'

  const userInfo = useMemo(() => ({ ...user, personaje_id: personajeId ?? null, pokemon_invocado: pokemonInvocado ?? null }), [user, personajeId, pokemonInvocado])
  const { presentes, log, masterMessage, sendMasterMessage, activePokemons, sendPokemons, lastAttack, sendAttack, sendActivity, partyUpdatedAt, sendPartyUpdate, invocados, sendInvocado, background, sendBackground } = usePartidaPresence(id, userInfo)

  // Expone acciones de la partida al componente padre (p. ej. TrainerPartida)
  useEffect(() => {
    if (apiRef) apiRef.current = { sendPartyUpdate }
  }, [apiRef, sendPartyUpdate])

  // Difunde el Pokémon invocado del jugador cuando cambia
  useEffect(() => {
    if (personajeId != null) sendInvocado(personajeId, pokemonInvocado)
  }, [personajeId, pokemonInvocado, sendInvocado])

  const MAX_POKEMON = 4

  const [attackFx, setAttackFx] = useState(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  // Efecto visual del ataque: aparece y desaparece a los 1.2s
  useEffect(() => {
    if (!lastAttack) return
    setAttackFx(lastAttack)
    const t = setTimeout(() => setAttackFx(null), 1200)
    return () => clearTimeout(t)
  }, [lastAttack])

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

      if (activePokemons.length >= MAX_POKEMON) return

      const level = d.pokemon_min_level || 1
      const moves = levelMoves(d, level).map(n => ({ name: n, type: moveType[n.toLowerCase()] || null }))

      const nuevo = {
        uid:         `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pokemon_id:  d.pokemon_id,
        name:        d.pokemon_name,
        type1:       d.pokemon_type_1,
        type2:       d.pokemon_type_2,
        level,
        hp_max:      d.pokemon_hit_points,
        hp_current:  d.pokemon_hit_points,
        sprite:      d.pokemon_media_sprite || d.pokemon_media_main,
        moves,
        hidden:      true,
      }
      sendPokemons([...activePokemons, nuevo])

      const text = 'Apareció un pokémon salvaje'
      sendMasterMessage(text)
      sendActivity(text)
    } catch { /* noop */ }
  }

  const updatePokemon = (uid, patch) =>
    sendPokemons(activePokemons.map(p => (p.uid === uid ? { ...p, ...patch } : p)))

  const handleHpChange = (uid, delta) => {
    const p = activePokemons.find(x => x.uid === uid)
    if (!p) return
    updatePokemon(uid, { hp_current: Math.max(0, Math.min(p.hp_max, p.hp_current + delta)) })
  }

  const handleHpSet = (uid, value) => {
    const p = activePokemons.find(x => x.uid === uid)
    if (!p) return
    updatePokemon(uid, { hp_current: Math.max(0, Math.min(p.hp_max, value)) })
  }

  const handleToggleHidden = (uid) => {
    const p = activePokemons.find(x => x.uid === uid)
    if (!p) return
    const nowHidden = !p.hidden
    updatePokemon(uid, { hidden: nowHidden })
    if (!nowHidden) {
      // Se revela el Pokémon → mostrar el nombre real
      const text = `Apareció un ${p.name} salvaje`
      sendMasterMessage(text)
      sendActivity(text)
    }
  }

  const handleRemove = (uid) => sendPokemons(activePokemons.filter(p => p.uid !== uid))

  const handleCast = (pokemon, moveName, moveType) => {
    if (!pokemon) return
    // Si está oculto, los jugadores no deben ver el nombre real (solo lo ve el master en su panel)
    const displayName = pokemon.hidden ? 'el pokemon' : pokemon.name
    sendMasterMessage(`${displayName} ha usado el movimiento ${moveName}`)
    sendAttack({ pokemonName: pokemon.name, moveName, type: moveType, hidden: !!pokemon.hidden })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        {/* Mensaje del master */}
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
          <img src="/avatars/chuckface.png" alt="Master"
            className="w-8 h-8 rounded-full border-2 border-amber-500/60 object-cover shrink-0 bg-gray-700" />
          <p className="text-sm text-gray-100 leading-snug truncate">{masterMessage}</p>
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

        {/* Botón flotante — abre la ventana Party */}
        <button
          onClick={() => setShowParty(true)}
          className="fixed left-3 top-16 z-30 flex items-center justify-center w-10 h-10
                     rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                     border border-gray-600 transition-all"
          title="Party"
        >
          <Users size={18} />
        </button>

        {/* Center — master panel + content + activity log */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Panel del master arriba (solo master) */}
          {isMaster && (
            <>
              <MasterSendMessage onSend={sendMasterMessage} />
              <MasterPokemonPanel
                pokemons={activePokemons}
                max={MAX_POKEMON}
                onAdd={() => setShowPokedex(true)}
                onHp={handleHpChange}
                onHpSet={handleHpSet}
                onRemove={handleRemove}
                onCast={handleCast}
                onToggleHidden={handleToggleHidden}
              />
              <EventosPanel onBackground={sendBackground} />
            </>
          )}

          {/* Role-specific content area */}
          <div className={`relative overflow-auto p-6 ${isMaster ? 'shrink-0' : 'flex-1'}`}
            style={!isMaster && background ? { backgroundImage: `url("${background}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined}>
            {/* Tarjetas de vida de los Pokémon — parte superior derecha (trainer/espectador) */}
            {!isMaster && activePokemons.length > 0 && (
              <div className={`absolute top-4 right-4 z-10 flex gap-2 origin-top-right ${isPhone ? 'scale-[0.65]' : 'scale-100'} ${isPhoneLandscape ? 'flex-row-reverse' : 'flex-col'}`}>
                {activePokemons.map(p => <PokemonHpCard key={p.uid} p={p} />)}
              </div>
            )}

            {/* Efecto visual del ataque (no se muestra al master) */}
            {!isMaster && attackFx && (() => {
              const FxIcon = TYPE_ICONS[attackFx.type] ?? Sparkles
              const color  = TYPE_COLORS[attackFx.type]?.bg ?? '#888'
              return (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div className="animate-attack-burst flex flex-col items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-24 h-24 rounded-full animate-ping opacity-60"
                        style={{ backgroundColor: color }} />
                      <FxIcon size={56} className="relative text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
                    </div>
                    <span className="px-4 py-1.5 rounded-full text-white font-black text-lg shadow-xl"
                      style={{ backgroundColor: color }}>
                      {attackFx.moveName}
                    </span>
                  </div>
                </div>
              )
            })()}

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

      {/* Ventana Party — jugadores conectados (solo lectura) */}
      {showParty && (
        <PartyPanel
          partidaId={id}
          presentes={presentes}
          selfUserId={user?.user_id}
          partyVersion={partyUpdatedAt}
          hideHp={!isMaster}
          invocados={invocados}
          onClose={() => setShowParty(false)}
        />
      )}

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

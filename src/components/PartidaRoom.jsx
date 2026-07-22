import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LogOut, ChevronDown, Users, Send, Plus, Minus, X, Eye, EyeOff, Info,
  Zap, Flame, Droplet, Leaf, Snowflake, Swords, Skull, Mountain,
  Feather, Brain, Bug, Gem, Ghost, Sparkles, Moon, Shield, Wand2, Star, Globe,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { usePartidaPresence } from '../hooks/usePartidaPresence'
import PokemonList from '../pages/PokemonList'
import PartyPanel, { PlayerCard } from './PartyPanel'
import CharacterSheet from './CharacterSheet'
import { PokemonDetailView } from './PokemonBox'
import PartidaInfoPanel from './PartidaInfoPanel'
import EdicionJugadoresPanel from './EdicionJugadoresPanel'
import MapaModal from './MapaModal'

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
function MasterPokemonCard({ pokemon, onHp, onRemove, onCast, onToggleHidden }) {
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
              {/* Barra de solo lectura: la vida solo se mueve de a un punto con los botones */}
              <div className="w-full h-2.5 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${hpPct(pokemon)}%`, backgroundColor: hpColor(hpPct(pokemon)) }} />
              </div>
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
function MasterPokemonPanel({ pokemons, max = 4, onAdd, onHp, onRemove, onCast, onToggleHidden }) {
  const full = pokemons.length >= max
  return (
    <div className="shrink-0 flex flex-col px-4 pt-3">
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
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2 overflow-auto resize-y content-start h-80 min-h-[8rem] max-h-[75vh]">
          {pokemons.map(p => (
            <MasterPokemonCard
              key={p.uid}
              pokemon={p}
              onHp={onHp}
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

// Contadores por evento (mismo mecanismo up/down, distintas etiquetas/colores)
const COUNTER_EVENTS = {
  fire:  { up: { label: 'UP',   tone: 'green' }, down: { label: 'DOWN',    tone: 'red'  } },
  frost: { up: { label: '0 °K', tone: 'gray'  }, down: { label: '-273 °C', tone: 'gray' } },
}
const TONE = {
  green: { box: 'bg-green-100 border-green-600', text: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700' },
  red:   { box: 'bg-red-100 border-red-600',     text: 'text-red-700',   btn: 'bg-red-600 hover:bg-red-700' },
  gray:  { box: 'bg-gray-200 border-gray-400',   text: 'text-gray-700',  btn: 'bg-gray-500 hover:bg-gray-600' },
}

function EventosPanel({ onBackground, partidaId, onUnlock, counterCfg, counters, onCounter, onLuchar, onLimpiar, presentes = [], onPremiar, onHit, onHeal }) {
  const [open, setOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [asking, setAsking] = useState(false)
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState(false)
  const [chars, setChars] = useState([])          // personajes de la partida
  const [selected, setSelected] = useState([])    // personajes elegidos (máx 2)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [prizeChar, setPrizeChar] = useState(null)     // personaje a premiar (uno)
  const [prizePickerOpen, setPrizePickerOpen] = useState(false)

  // Sonido de ambiente del evento (solo en el dispositivo del master, en loop)
  const audioRef = useRef(null)
  const stopSound = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }
  const playLoop = (src) => {
    stopSound()
    const a = new Audio(src)
    a.loop = true
    a.play().catch(() => {})
    audioRef.current = a
  }
  useEffect(() => () => stopSound(), [])
  const handleEvento = (ev) => {
    onBackground(ev.url)
    if (ev.label === 'Fire') playLoop('/evento0/fuego.mp3')
    else if (ev.label === 'Frost') playLoop('/evento0/nieve.mp3')
    else if (ev.label === 'Forest') stopSound()
  }

  const toggle = () => {
    if (open) { setOpen(false); return }
    if (unlocked) { setOpen(true); return }
    setAsking(true); setErr(false); setPwd('')
  }
  const submit = () => {
    if (pwd === EVENT_PASSWORD) {
      setUnlocked(true); setOpen(true); setAsking(false); setPwd(''); setErr(false)
      onUnlock?.()
    } else { setErr(true) }
  }

  useEffect(() => {
    if (!unlocked || !partidaId) return
    apiFetch(`/personaje/party?id_partida=${partidaId}`)
      .then(r => r.json())
      .then(d => setChars(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [unlocked, partidaId])

  const addChar = (c) => {
    setSelected(prev => (prev.length >= 2 || prev.some(x => x.id_personaje === c.id_personaje)) ? prev : [...prev, c])
    setPickerOpen(false)
  }
  const removeChar = (id) => setSelected(prev => prev.filter(c => c.id_personaje !== id))
  // Personajes activos y conectados a la partida (para luchar y premiar)
  const conectados = chars.filter(c => presentes.some(p => String(p.personaje_id) === String(c.id_personaje)))
  const disponibles = conectados.filter(c => !selected.some(s => s.id_personaje === c.id_personaje))

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
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {EVENTOS.map(ev => (
              <button key={ev.url} onClick={() => handleEvento(ev)}
                className="py-2 bg-gray-700 hover:bg-red-600 border border-gray-600 text-gray-200 text-xs font-semibold rounded-xl transition-colors">
                {ev.label}
              </button>
            ))}
          </div>

          {/* Contadores del evento (fire/frost) — solo master */}
          {counterCfg && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['up', 'down'].map(k => {
                const cfg = counterCfg[k]; const t = TONE[cfg.tone]
                return (
                  <div key={k} className={`flex items-center justify-between gap-1 border rounded-xl px-2 py-1.5 ${t.box}`}>
                    <button onClick={() => onCounter(k, -1)} className={`w-7 h-7 shrink-0 rounded-lg text-white flex items-center justify-center ${t.btn}`}><Minus size={14} /></button>
                    <div className="text-center leading-none min-w-0">
                      <p className={`text-[9px] font-black uppercase whitespace-nowrap ${t.text}`}>{cfg.label}</p>
                      <p className={`text-lg font-black ${t.text}`}>{counters[k]}</p>
                    </div>
                    <button onClick={() => onCounter(k, 1)} className={`w-7 h-7 shrink-0 rounded-lg text-white flex items-center justify-center ${t.btn}`}><Plus size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Personajes para luchar (máx. 2) */}
          <div className="mt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Personajes</p>
            <div className="flex items-center gap-2 flex-wrap">
              {selected.map(c => (
                <span key={c.id_personaje} className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-gray-100">
                  {c.nombre_personaje || 'Sin nombre'}
                  <button onClick={() => removeChar(c.id_personaje)} className="text-gray-400 hover:text-red-400" title="Quitar"><X size={12} /></button>
                </span>
              ))}

              {selected.length < 2 && (
                <div className="relative">
                  <button onClick={() => setPickerOpen(o => !o)}
                    className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200">
                    <Plus size={12} /> Personaje
                  </button>
                  {pickerOpen && (
                    <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                      {disponibles.length === 0 ? (
                        <p className="text-[11px] text-gray-500 px-3 py-2 italic">Sin personajes</p>
                      ) : disponibles.map(c => (
                        <button key={c.id_personaje} onClick={() => addChar(c)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                          {c.nombre_personaje || 'Sin nombre'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => { if (selected.length > 0) onLuchar?.(selected) }}
                  disabled={selected.length === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  Luchar
                </button>
                <button
                  onClick={() => { setSelected([]); onLimpiar?.() }}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  Limpiar
                </button>
              </div>
            </div>

            {/* Hit / Heal — resta / suma 1 HP a los que están en combate */}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => onHit?.()}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                Hit
              </button>
              <button
                onClick={() => onHeal?.()}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                Heal
              </button>
            </div>
          </div>

          {/* Premios — entregar item a un personaje (uno) */}
          <div className="mt-3 border-t border-gray-700 pt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Premios</p>
            <div className="flex items-center gap-2 flex-wrap">
              {prizeChar ? (
                <span className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-gray-100">
                  {prizeChar.nombre_personaje || 'Sin nombre'}
                  <button onClick={() => setPrizeChar(null)} className="text-gray-400 hover:text-red-400" title="Quitar"><X size={12} /></button>
                </span>
              ) : (
                <div className="relative">
                  <button onClick={() => setPrizePickerOpen(o => !o)}
                    className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200">
                    <Plus size={12} /> Personaje
                  </button>
                  {prizePickerOpen && (
                    <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                      {conectados.length === 0 ? (
                        <p className="text-[11px] text-gray-500 px-3 py-2 italic">Sin personajes conectados</p>
                      ) : conectados.map(c => (
                        <button key={c.id_personaje} onClick={() => { setPrizeChar(c); setPrizePickerOpen(false) }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                          {c.nombre_personaje || 'Sin nombre'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="ml-auto">
                <button
                  onClick={() => { if (prizeChar) { onPremiar?.(prizeChar); setPrizeChar(null) } }}
                  disabled={!prizeChar}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  Premiar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* Efecto de brasas (evento fire) sobre toda la vista del trainer */
function Embers({ count = 45 }) {
  const particles = useMemo(() => Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    size: 2 + Math.random() * 5,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 8,
    drift: `${Math.round((Math.random() - 0.5) * 120)}px`,
  })), [count])
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15]">
      {particles.map((p, i) => (
        <span key={i} style={{
          position: 'absolute',
          bottom: '-12px',
          left: `${p.left}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          borderRadius: '9999px',
          background: 'radial-gradient(circle, #ffe08a 0%, #ff7a18 65%, rgba(255,90,0,0) 100%)',
          boxShadow: '0 0 6px 1px rgba(255,110,0,0.75)',
          animation: `ember-rise ${p.duration}s linear ${p.delay}s infinite`,
          '--drift': p.drift,
        }} />
      ))}
    </div>
  )
}

/* Efecto de nieve (evento frost) sobre toda la vista del trainer */
function Snow({ count = 60 }) {
  const flakes = useMemo(() => Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    size: 2 + Math.random() * 5,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 10,
    drift: `${Math.round((Math.random() - 0.5) * 160)}px`,
    blur: Math.random() < 0.5 ? 0.5 : 0,
  })), [count])
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15]">
      {flakes.map((f, i) => (
        <span key={i} style={{
          position: 'absolute',
          top: '-12px',
          left: `${f.left}%`,
          width: `${f.size}px`,
          height: `${f.size}px`,
          borderRadius: '9999px',
          background: 'radial-gradient(circle, #ffffff 0%, #dbeafe 70%, rgba(255,255,255,0) 100%)',
          boxShadow: '0 0 4px 1px rgba(255,255,255,0.7)',
          filter: f.blur ? `blur(${f.blur}px)` : undefined,
          animation: `snow-fall ${f.duration}s linear ${f.delay}s infinite`,
          '--drift': f.drift,
        }} />
      ))}
    </div>
  )
}

export default function PartidaRoom({ children, personajeId = null, apiRef = null, pokemonInvocado = null, onFight = null, onPartyVersion = null }) {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const logEndRef   = useRef(null)

  const [showParty, setShowParty]   = useState(false)
  const [showMapa, setShowMapa]     = useState(false)
  const [logOpen, setLogOpen]       = useState(true)
  const [showPokedex, setShowPokedex] = useState(false)
  const [showInfo, setShowInfo]     = useState(false)   // personajes registrados (solo master)
  const [inspectCharId, setInspectCharId] = useState(null) // ficha de personaje abierta desde el party (master)
  const [inspectPoke, setInspectPoke]     = useState(null) // { personajeId, idpp } detalle de pokémon (master)
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
  const { presentes, log, masterMessage, sendMasterMessage, activePokemons, sendPokemons, lastAttack, sendAttack, sendActivity, partyUpdatedAt, sendPartyUpdate, invocados, sendInvocado, background, sendBackground, eventActive, eventFlashAt, sendEventState, sendEventFlash, counters, changeCounter, fight, sendFight, clearFight, prize, sendPrize, eventIntroAt, sendEventIntro, hitAt, sendHitFlash, healAt, sendHealFlash } = usePartidaPresence(id, userInfo)

  // Expone el estado de lucha al padre (TrainerPartida oculta iconos de no-seleccionados)
  useEffect(() => { onFight?.(fight) }, [fight, onFight])

  // Notifica al padre cuando cambia la party (para que el trainer re-consulte su flag editable)
  useEffect(() => { onPartyVersion?.(partyUpdatedAt) }, [partyUpdatedAt, onPartyVersion])

  // Datos de la party (para mostrar al rival en modo lucha); se re-consulta en vivo con party_update
  const [fightChars, setFightChars] = useState([])
  useEffect(() => {
    if (!fight.active) { setFightChars([]); return }
    apiFetch(`/personaje/party?id_partida=${id}`)
      .then(r => r.json())
      .then(d => setFightChars(Array.isArray(d) ? d : []))
      .catch(() => setFightChars([]))
  }, [fight.active, fight.at, id, partyUpdatedAt])

  // Mensaje central de lucha durante 10s (solo trainer/espectador)
  const [fightMsg, setFightMsg] = useState(false)
  useEffect(() => {
    if (!fight.active) { setFightMsg(false); return }
    setFightMsg(true)
    const t = setTimeout(() => setFightMsg(false), 10000)
    return () => clearTimeout(t)
  }, [fight.active, fight.at])

  // Aviso "Rave reclamó 1 HP" durante 5s (solo trainers)
  const [showHit, setShowHit] = useState(false)
  useEffect(() => {
    if (!hitAt || isMaster) return
    setShowHit(true)
    const t = setTimeout(() => setShowHit(false), 5000)
    return () => clearTimeout(t)
  }, [hitAt, isMaster])

  // Aviso "Rave otorgó 1 HP" durante 5s (solo trainers)
  const [showHeal, setShowHeal] = useState(false)
  useEffect(() => {
    if (!healAt || isMaster) return
    setShowHeal(true)
    const t = setTimeout(() => setShowHeal(false), 5000)
    return () => clearTimeout(t)
  }, [healAt, isMaster])

  // Aviso de premio (Yoyo Nordico) durante 5s, solo para el personaje premiado
  const [showPrize, setShowPrize] = useState(false)
  useEffect(() => {
    if (!prize.at || personajeId == null || String(prize.personaje_id) !== String(personajeId)) return
    setShowPrize(true)
    const t = setTimeout(() => setShowPrize(false), 5000)
    return () => clearTimeout(t)
  }, [prize.at, prize.personaje_id, personajeId])

  const eventKey = !background ? null
    : background.includes('/evento0/fire') ? 'fire'
      : background.includes('/evento0/frost') ? 'frost' : null
  const fireActive = eventKey === 'fire'
  const counterCfg = COUNTER_EVENTS[eventKey] || null

  // ── Botón Hit — resta 1 HP a personajes y pokémon en combate ──
  const fightPlayersRef = useRef([])
  const invocadosRef = useRef({})
  useEffect(() => { fightPlayersRef.current = fight.players }, [fight.players])
  useEffect(() => { invocadosRef.current = invocados }, [invocados])

  const onHit = useCallback(async () => {
    sendHitFlash() // aviso en pantalla de los trainers (5s)
    try {
      const party = await apiFetch(`/personaje/party?id_partida=${id}`).then(r => r.json())
      const chars = Array.isArray(party) ? party : []
      const players = fightPlayersRef.current || []
      const inv = invocadosRef.current || {}
      await Promise.all(players.flatMap(p => {
        const c = chars.find(x => String(x.id_personaje) === String(p.id_personaje))
        if (!c) return []
        const calls = []
        // Solo se aplica si tiene 2 HP o más (con menos de 2, no se aplica)
        const curHp = c.personaje_current_hp ?? c.personaje_hp ?? 0
        if (curHp >= 2) {
          calls.push(apiFetch(`/personaje/${c.id_personaje}/combate`, { method: 'PATCH', body: JSON.stringify({ current_hp: curHp - 1 }) }))
        }
        const invId = String(p.id_personaje) in inv ? inv[String(p.id_personaje)] : null
        if (invId != null) {
          const pk = (c.pokemons || []).find(x => String(x.id_personaje_pokemon) === String(invId))
          if (pk) {
            const curPHp = pk.pokemon_current_hp ?? pk.pokemon_hp ?? 0
            if (curPHp >= 2) {
              calls.push(apiFetch(`/personaje/${c.id_personaje}/pokemon/${invId}/combate`, { method: 'PATCH', body: JSON.stringify({ current_hp: curPHp - 1 }) }))
            }
          }
        }
        return calls
      }))
      sendPartyUpdate()
    } catch { /* noop */ }
  }, [id, sendPartyUpdate, sendHitFlash])

  const onHeal = useCallback(async () => {
    sendHealFlash() // aviso en pantalla de los trainers (5s)
    try {
      const party = await apiFetch(`/personaje/party?id_partida=${id}`).then(r => r.json())
      const chars = Array.isArray(party) ? party : []
      const players = fightPlayersRef.current || []
      const inv = invocadosRef.current || {}
      await Promise.all(players.flatMap(p => {
        const c = chars.find(x => String(x.id_personaje) === String(p.id_personaje))
        if (!c) return []
        const calls = []
        // Suma 1 HP sin exceder el máximo
        const curHp = c.personaje_current_hp ?? c.personaje_hp ?? 0
        const maxHp = c.personaje_hp ?? curHp
        if (curHp < maxHp) {
          calls.push(apiFetch(`/personaje/${c.id_personaje}/combate`, { method: 'PATCH', body: JSON.stringify({ current_hp: curHp + 1 }) }))
        }
        const invId = String(p.id_personaje) in inv ? inv[String(p.id_personaje)] : null
        if (invId != null) {
          const pk = (c.pokemons || []).find(x => String(x.id_personaje_pokemon) === String(invId))
          if (pk) {
            const curPHp = pk.pokemon_current_hp ?? pk.pokemon_hp ?? 0
            const maxPHp = pk.pokemon_hp ?? curPHp
            if (curPHp < maxPHp) {
              calls.push(apiFetch(`/personaje/${c.id_personaje}/pokemon/${invId}/combate`, { method: 'PATCH', body: JSON.stringify({ current_hp: curPHp + 1 }) }))
            }
          }
        }
        return calls
      }))
      sendPartyUpdate()
    } catch { /* noop */ }
  }, [id, sendPartyUpdate, sendHealFlash])

  // Al desbloquear el evento: mensaje, avatar del master y avatar central 5s
  const startEvent = () => {
    sendMasterMessage('¡ Llegó el master de masters ! RAVE.')
    sendEventState(true)
    sendEventFlash()
    sendEventIntro()
  }

  // Secuencia de textos al iniciar el evento (solo trainers):
  // 1) "¡Ha llegado el Master de Masters Rave!" 5s → espera 2s → 2) "Ha iniciado el evento Hielo y Fuego" 10s
  const [introPhase, setIntroPhase] = useState(0) // 0 nada, 1 primer texto, 2 segundo texto
  useEffect(() => {
    if (!eventIntroAt || isMaster) return
    setIntroPhase(1)
    const t1 = setTimeout(() => setIntroPhase(0), 5000)   // oculta el 1° a los 5s
    const t2 = setTimeout(() => setIntroPhase(2), 7000)   // tras 2s de espera, muestra el 2°
    const t3 = setTimeout(() => setIntroPhase(0), 17000)  // oculta el 2° a los 10s
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [eventIntroAt, isMaster])

  // Avatar central del evento durante 5s (solo trainers)
  const [eventFlash, setEventFlash] = useState(false)
  useEffect(() => {
    if (!eventFlashAt) return
    setEventFlash(true)
    const t = setTimeout(() => setEventFlash(false), 5000)
    return () => clearTimeout(t)
  }, [eventFlashAt])

  // Expone acciones de la partida al componente padre (p. ej. TrainerPartida)
  useEffect(() => {
    if (apiRef) apiRef.current = { sendPartyUpdate, sendAttack }
  }, [apiRef, sendPartyUpdate, sendAttack])

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
          <img src={eventActive ? '/evento0/avatar.png' : '/avatars/chuckface.png'} alt="Master"
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

      {/* Efectos de evento (solo trainer/espectador) */}
      {!isMaster && fireActive && <Embers />}
      {!isMaster && !!background && background.includes('/evento0/frost') && <Snow />}

      {/* Contadores del evento (fire/frost) — centrados (solo trainer/espectador) */}
      {!isMaster && counterCfg && (
        <div className="pointer-events-none fixed inset-0 z-[16] flex items-center justify-center">
          <div className="flex items-center gap-6 scale-[0.7]">
            {['up', 'down'].map(k => {
              const cfg = counterCfg[k]; const t = TONE[cfg.tone]
              return (
                <div key={k} style={{ flex: 'none', width: '7rem', height: '6rem' }}
                  className={`flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 shadow-2xl ${t.box}`}>
                  <span className={`text-xs font-black uppercase whitespace-nowrap ${t.text}`}>{cfg.label}</span>
                  <span className={`text-4xl font-black leading-none tabular-nums ${t.text}`}>{counters[k]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Avatar central del evento durante 5s (solo trainer/espectador) */}
      {!isMaster && eventFlash && (
        <div className="pointer-events-none fixed inset-0 z-[40] flex items-center justify-center">
          <img src="/evento0/avatar.png" alt="Evento"
            className="w-96 h-96 object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] animate-event-pop" />
        </div>
      )}

      {/* Alerta "Hielo y Fuego" abajo a la izquierda */}
      {eventActive && (
        <div className="fixed left-3 bottom-3 z-[45] flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-red-400">
          <Snowflake size={14} className="text-cyan-200" />
          <span>Hielo y Fuego</span>
          <Flame size={14} className="text-orange-300" />
        </div>
      )}

      {/* Secuencia de inicio del evento (solo trainers) */}
      {!isMaster && introPhase === 1 && (
        <div className="pointer-events-none fixed inset-0 z-[47] flex items-center justify-center p-6">
          <p className="max-w-2xl text-center text-3xl md:text-4xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] animate-event-pop">
            ¡Ha llegado el Master de Masters Rave!
          </p>
        </div>
      )}
      {!isMaster && introPhase === 2 && (
        <div className="pointer-events-none fixed inset-0 z-[47] flex items-center justify-center p-6">
          <p className="flex items-center justify-center gap-3 max-w-2xl text-center text-3xl md:text-4xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] animate-event-pop">
            <Snowflake size={36} className="text-cyan-200 shrink-0" />
            <span>Ha iniciado el evento Hielo y Fuego</span>
            <Flame size={36} className="text-orange-300 shrink-0" />
          </p>
        </div>
      )}

      {/* Aviso "Rave reclamó 1 HP" durante 5s (solo trainers) */}
      {!isMaster && showHit && (
        <div className="pointer-events-none fixed inset-0 z-[46] flex items-center justify-center p-6">
          <p className="max-w-2xl text-center text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] animate-event-pop">
            Rave a reclamado 1 HP de los Luchadores
          </p>
        </div>
      )}

      {/* Aviso "Rave otorgó 1 HP" durante 5s (solo trainers) */}
      {!isMaster && showHeal && (
        <div className="pointer-events-none fixed inset-0 z-[46] flex items-center justify-center p-6">
          <p className="max-w-2xl text-center text-2xl md:text-3xl font-black text-green-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] animate-event-pop">
            Rave ha otorgado 1HP a los luchadores ¡En hora buena!
          </p>
        </div>
      )}

      {/* Aviso de premio (Yoyo Nordico) durante 5s, solo para el personaje premiado */}
      {!isMaster && showPrize && (
        <div className="pointer-events-none fixed inset-0 z-[46] flex flex-col items-center justify-center gap-4 p-6">
          <img src="/evento0/yoyo.png" alt="Yoyo Nordico"
            className="w-40 h-40 object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] animate-event-pop" />
          <p className="max-w-md text-center text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] animate-event-pop">
            Felicitaciones, obtuviste un Yoyo Nordico
          </p>
        </div>
      )}

      {/* Modo lucha — mensaje central 10s (solo trainer/espectador) */}
      {!isMaster && fight.active && fightMsg && (
        <div className="pointer-events-none fixed inset-0 z-[42] flex items-center justify-center p-6">
          <p className="max-w-2xl text-center text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] animate-event-pop">
            Los jugadores {fight.players.map(p => p.nombre).join(' y ')} deberán pelear a muerte para la diversión de los Masters de Masters
          </p>
        </div>
      )}

      {/* Modo lucha — paneles de los peleadores (solo trainer/espectador) */}
      {!isMaster && fight.active && (() => {
        // Celular: vertical −20% (0.8), horizontal −40% (0.6)
        const rivalScale = isPhoneLandscape ? 'scale-[0.6]' : (isPhone ? 'scale-[0.8]' : '')
        const renderFighter = (player) => {
          if (!player) return null
          const char = fightChars.find(c => String(c.id_personaje) === String(player.id_personaje))
          if (!char) return null
          const pres = presentes.find(u => String(u.user_id) === String(player.user_id))
          const inv = invocados[String(player.id_personaje)]
          return <PlayerCard char={char} pres={pres} invId={inv} hideHp={false} />
        }
        const imSelected = personajeId != null && fight.players.some(p => String(p.id_personaje) === String(personajeId))
        if (imSelected) {
          // Seleccionado: ve al rival arriba
          const rival = fight.players.find(p => String(p.id_personaje) !== String(personajeId))
          return (
            <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[20] origin-top ${rivalScale}`}>
              {renderFighter(rival)}
            </div>
          )
        }
        // No seleccionado: ve a ambos peleadores (arriba y abajo)
        return (
          <>
            <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[20] origin-top ${rivalScale}`}>
              {renderFighter(fight.players[0])}
            </div>
            <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[20] origin-bottom ${rivalScale}`}>
              {renderFighter(fight.players[1])}
            </div>
          </>
        )
      })()}

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

        {/* Botón flotante — mapa de la región (jugadores) */}
        {!isMaster && (
          <button
            onClick={() => setShowMapa(true)}
            className="fixed left-3 top-28 z-40 flex items-center justify-center w-10 h-10
                       rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Mapa"
          >
            <Globe size={18} />
          </button>
        )}

        {/* Botón flotante — personajes registrados en la partida (solo master) */}
        {isMaster && (
          <button
            onClick={() => setShowInfo(true)}
            className="fixed left-3 top-28 z-30 flex items-center justify-center w-10 h-10
                       rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Personajes registrados"
          >
            <Info size={18} />
          </button>
        )}

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
                onRemove={handleRemove}
                onCast={handleCast}
                onToggleHidden={handleToggleHidden}
              />
              <EdicionJugadoresPanel partidaId={id} presentes={presentes} partyVersion={partyUpdatedAt} onAfterChange={sendPartyUpdate} />
              <EventosPanel onBackground={sendBackground} partidaId={id} onUnlock={startEvent}
                counterCfg={counterCfg} counters={counters} onCounter={changeCounter}
                onLuchar={(players) => sendFight(players.map(p => ({ id_personaje: p.id_personaje, nombre: p.nombre_personaje || 'Sin nombre', user_id: p.user_id })))}
                onLimpiar={clearFight}
                presentes={presentes}
                onPremiar={async (char) => {
                  try {
                    await apiFetch(`/personaje/${char.id_personaje}/equipo`, { method: 'POST', body: JSON.stringify({ id_item: 456, cantidad: 1 }) })
                    sendPrize(char.id_personaje)
                  } catch { /* noop */ }
                }}
                onHit={onHit} onHeal={onHeal} />
            </>
          )}

          {/* Role-specific content area */}
          <div className="relative overflow-auto p-6 flex-1">
            {/* Fondo del evento con aparición suave (solo trainer/espectador) */}
            {!isMaster && background && (
              <div key={background} className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat animate-bgfade"
                style={{ backgroundImage: `url("${background}")` }} />
            )}

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

      {/* Ventana Party — jugadores conectados (el master puede abrir fichas) */}
      {showParty && (
        <PartyPanel
          partidaId={id}
          presentes={presentes}
          selfUserId={user?.user_id}
          partyVersion={partyUpdatedAt}
          hideHp={!isMaster}
          invocados={invocados}
          onClose={() => setShowParty(false)}
          onCharClick={isMaster ? (c => setInspectCharId(c.id_personaje)) : undefined}
          onPokemonClick={isMaster ? ((c, p) => setInspectPoke({ personajeId: c.id_personaje, idpp: p.id_personaje_pokemon })) : undefined}
        />
      )}

      {/* Mapa de la región */}
      {showMapa && <MapaModal onClose={() => setShowMapa(false)} />}

      {/* Ventana de personajes registrados (solo master) */}
      {showInfo && isMaster && (
        <PartidaInfoPanel partidaId={id} onClose={() => setShowInfo(false)} />
      )}

      {/* Ficha completa del personaje abierta desde el party (master) */}
      {inspectCharId != null && (
        <CharacterSheet id={inspectCharId} onClose={() => setInspectCharId(null)}
          partyVersion={partyUpdatedAt} onChanged={sendPartyUpdate} />
      )}

      {/* Detalle completo del Pokémon abierto desde el party (master) */}
      {inspectPoke && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setInspectPoke(null) }}>
          <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl">
            <button onClick={() => setInspectPoke(null)}
              className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
              <X size={18} />
            </button>
            <PokemonDetailView personajeId={inspectPoke.personajeId} idpp={inspectPoke.idpp}
              onBack={() => setInspectPoke(null)} />
          </div>
        </div>
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

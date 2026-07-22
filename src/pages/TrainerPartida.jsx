import { useState, useEffect, useRef } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Smartphone, User, Backpack, Shield, Sword, Monitor, X, Minus, Plus, ChevronUp, ChevronDown, Pencil, PencilOff } from 'lucide-react'
import PartidaRoom from '../components/PartidaRoom'
import PokemonList from './PokemonList'
import CharacterSheet from '../components/CharacterSheet'
import Mochila from '../components/Mochila'
import Equipamiento from '../components/Equipamiento'
import PokemonBox from '../components/PokemonBox'
import MoveInfoModal from '../components/MoveInfoModal'
import EditarPersonajeModal from '../components/EditarPersonajeModal'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'

// Ícono de 3 pokébolas (para el cinturón)
function PokeballsIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round">
      {[5, 12, 19].map(cx => (
        <g key={cx}>
          <circle cx={cx} cy="12" r="3.4" />
          <line x1={cx - 3.4} y1="12" x2={cx + 3.4} y2="12" />
          <circle cx={cx} cy="12" r="0.9" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  )
}

// Ícono de una pokébola (regresar)
function PokeballIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h6M15 12h6" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

const hpColorPct = pct => (pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444')

const MOVE_TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
}

// Panel de control (HP + exhaust/dsts/dstf + movimientos). Persiste cada cambio vía onPersist.
function CombatePanel({ title, initial, moves, movePP, onCast, onPersist, onReturn, onClose }) {
  const [v, setV] = useState(initial)
  useEffect(() => { setV(initial) }, [initial])
  const [moveInfo, setMoveInfo] = useState(null) // movimiento cuyo detalle se muestra

  // Cooldown de 3s tras lanzar un movimiento (deshabilita el botón Lanzar)
  const [cooldown, setCooldown] = useState(false)
  const cdTimer = useRef(null)
  useEffect(() => () => { if (cdTimer.current) clearTimeout(cdTimer.current) }, [])
  const handleCast = (m) => {
    onCast?.(m)
    setCooldown(true)
    if (cdTimer.current) clearTimeout(cdTimer.current)
    cdTimer.current = setTimeout(() => setCooldown(false), 3000)
  }

  if (!v) return null

  const setHp = (hp) => {
    const nhp = Math.max(0, Math.min(v.hpMax ?? 0, hp))
    setV(cur => ({ ...cur, hp: nhp })); onPersist({ hp: nhp })
  }
  const step = (field, delta) => {
    const nval = Math.max(0, (v[field] ?? 0) + delta)
    setV(cur => ({ ...cur, [field]: nval })); onPersist({ [field]: nval })
  }
  const pct = v.hpMax ? Math.max(0, Math.min(100, Math.round((v.hp / v.hpMax) * 100))) : 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-2xl ${moves && moves.length > 0 ? 'w-[26rem] max-w-[95vw]' : 'w-72'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-sm truncate">{title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {onReturn && (
              <button onClick={onReturn} title="Regresar a la pokébola" className="text-gray-300 hover:text-red-400 transition-colors">
                <PokeballIcon size={18} />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        {/* HP (estilo del control del master) */}
        <div className="flex items-center gap-2">
          <button onClick={() => setHp(v.hp - 1)}
            className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors"><Minus size={15} /></button>
          <div className="flex-1">
            <input type="range" min={0} max={v.hpMax} value={v.hp}
              onChange={e => setHp(Number(e.target.value))}
              className="w-full h-2.5 cursor-pointer" style={{ accentColor: hpColorPct(pct) }} />
            <p className="text-center text-[11px] font-bold text-white mt-1">HP {v.hp}/{v.hpMax}</p>
          </div>
          <button onClick={() => setHp(v.hp + 1)}
            className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-green-600 flex items-center justify-center text-white transition-colors"><Plus size={15} /></button>
        </div>

        {/* EXH / DSTS / DSTF: valor con subir/bajar a los lados */}
        <div className="mt-3 border-t border-gray-700 pt-3 space-y-2">
          {[['EXH', 'exhaust'], ['DSTS', 'dsts'], ['DSTF', 'dstf']].map(([label, key]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase">{label}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => step(key, -1)}
                  className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors"><ChevronDown size={15} /></button>
                <span className="w-6 text-center font-black text-white">{v[key]}</span>
                <button onClick={() => step(key, 1)}
                  className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-green-600 flex items-center justify-center text-white transition-colors"><ChevronUp size={15} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Movimientos (mismo comportamiento que el panel del master) */}
        {moves && moves.length > 0 && (
          <div className="mt-3 border-t border-gray-700 pt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Movimientos</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {moves.map((m, i) => {
                const base = Number(m.move_pp) || 0
                const unlimited = base === 0 // move_pp 0 = PP ilimitado
                const pp = movePP?.[m.move_id] ?? base
                const disabled = !unlimited && pp <= 0
                return (
                  <div key={i} className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <button onClick={() => setMoveInfo(m)} title="Ver detalle del movimiento"
                        className="text-white text-xs font-medium truncate underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-amber-300 transition-colors">
                        {m.move_name}
                      </button>
                      <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0"
                        style={{ backgroundColor: MOVE_TYPE_COLORS[m.move_type] || '#9CA3AF' }}>{m.move_type}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black tabular-nums ${disabled ? 'text-red-400' : 'text-gray-300'}`}>PP {unlimited ? '∞' : pp}</span>
                      <button onClick={() => handleCast(m)} disabled={disabled || cooldown}
                        className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-md transition-colors">
                        Lanzar
                      </button>
                      {/* Rango y duración del movimiento */}
                      <div className="w-24 text-left leading-tight">
                        <p className="text-[9px] text-gray-400 truncate" title={m.move_range || ''}>{m.move_range || '—'}</p>
                        <p className="text-[9px] text-gray-400 truncate" title={m.move_duration || ''}>{m.move_duration || '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detalle del movimiento seleccionado */}
      {moveInfo && <MoveInfoModal m={moveInfo} onClose={() => setMoveInfo(null)} />}
    </div>
  )
}

export default function TrainerPartida() {
  const { id }   = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const stateId  = location.state?.personaje?.id_personaje ?? null

  const [personajeId, setPersonajeId] = useState(stateId)
  const [showPokedex, setShowPokedex] = useState(false)
  const [showChar, setShowChar]       = useState(false)
  const [showMochila, setShowMochila] = useState(false)
  const [showEquip, setShowEquip]     = useState(false)
  const [showBelt, setShowBelt]       = useState(false)
  const [showPC, setShowPC]           = useState(false)
  const [showEdit, setShowEdit]       = useState(false)
  const [isEditable, setIsEditable]   = useState(false) // personaje_is_editable (lo controla el master)
  const [partyVersion, setPartyVersion] = useState(0)   // cambia cuando el master actualiza la party
  const [pokemonInvocado, setPokemonInvocado] = useState(null) // id_personaje_pokemon
  const [invocadoSprite, setInvocadoSprite]   = useState(null)
  const [openControl, setOpenControl] = useState(null) // 'trainer' | 'pokemon' | null (solo uno a la vez)
  const [charData, setCharData] = useState(null)
  const [pokeData, setPokeData] = useState(null)
  const [movePP, setMovePP] = useState({}) // PP actual por move_id (solo sesión, sin persistencia en BD)
  const partidaApiRef = useRef(null) // acciones expuestas por PartidaRoom (p. ej. sendPartyUpdate)
  const [fight, setFight] = useState({ active: false, players: [] }) // modo lucha
  // Monitor (PC/escritorio con mouse) → iconos más grandes
  const [isMonitor, setIsMonitor] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const onChange = () => setIsMonitor(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Al cambiar el Pokémon invocado (nuevo o regresado), reinicia los PP de sesión
  useEffect(() => { setMovePP({}) }, [pokemonInvocado])

  // Lee si el personaje es editable (lo activa el master). Se re-consulta al recibir party_update.
  useEffect(() => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}`)
      .then(r => r.json())
      .then(d => setIsEditable(!!d?.personaje_is_editable))
      .catch(() => {})
  }, [personajeId, partyVersion])

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

  // Abrir control del jugador (personaje) — carga HP/exhaust/dsts/dstf
  const openTrainerControl = async () => {
    setPokeData(null)
    setOpenControl('trainer')
    try {
      const d = await apiFetch(`/personaje/${personajeId}`).then(r => r.json())
      setCharData({
        hp: d.personaje_current_hp ?? d.personaje_hp ?? 0, hpMax: d.personaje_hp ?? 0,
        exhaust: d.personaje_exahust_lvl ?? 0, dsts: d.personaje_dsts ?? 0, dstf: d.personaje_dstf ?? 0,
      })
    } catch { /* noop */ }
  }

  // Abrir control del Pokémon invocado
  const openPokemonControl = async () => {
    if (!pokemonInvocado) return
    setCharData(null)
    setOpenControl('pokemon')
    try {
      const d = await apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}`).then(r => r.json())
      const moves = Array.isArray(d.moves) ? d.moves : []
      setPokeData({
        hp: d.pokemon_current_hp ?? d.pokemon_hp ?? 0, hpMax: d.pokemon_hp ?? 0,
        exhaust: d.personaje_pokemon_exahust_lvl ?? 0, dsts: d.personaje_pokemon_dsts ?? 0, dstf: d.personaje_pokemon_dstf ?? 0,
        moves,
        name: d.pokemon_apodo || 'Pokémon',
      })
      // Inicializa los PP con move_pp (solo los que aún no están en sesión → se conservan al reabrir)
      setMovePP(prev => {
        const next = { ...prev }
        for (const m of moves) if (!(m.move_id in next)) next[m.move_id] = Number(m.move_pp) || 0
        return next
      })
    } catch { /* noop */ }
  }

  // Lanzar movimiento del Pokémon invocado → animación de ataque (como el master)
  // Descuenta 1 PP de sesión (sin persistencia en BD). Si no hay PP, no hace nada.
  const castMove = (m) => {
    const id = m.move_id
    const base = Number(m.move_pp) || 0
    if (base !== 0) { // move_pp 0 = ilimitado: no descuenta ni bloquea
      if ((movePP[id] ?? base) <= 0) return
      setMovePP(prev => ({ ...prev, [id]: (prev[id] ?? base) - 1 }))
    }
    partidaApiRef.current?.sendAttack?.({ pokemonName: pokeData?.name || 'Pokémon', moveName: m.move_name, type: m.move_type, hidden: false })
  }

  const toBody = (patch) => {
    const b = {}
    if ('hp' in patch) b.current_hp = patch.hp
    if ('exhaust' in patch) b.exhaust_lvl = patch.exhaust
    if ('dsts' in patch) b.dsts = patch.dsts
    if ('dstf' in patch) b.dstf = patch.dstf
    return b
  }
  const pendingPersist = useRef(Promise.resolve())
  // Tras guardar, avisa a los demás para que su panel (party/rival) se actualice de inmediato
  const persistChar = (patch) => {
    const p = apiFetch(`/personaje/${personajeId}/combate`, { method: 'PATCH', body: JSON.stringify(toBody(patch)) })
      .then(() => { partidaApiRef.current?.sendPartyUpdate?.() }).catch(() => {})
    pendingPersist.current = p
    return p
  }
  const persistPoke = (patch) => {
    const p = apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}/combate`, { method: 'PATCH', body: JSON.stringify(toBody(patch)) })
      .then(() => { partidaApiRef.current?.sendPartyUpdate?.() }).catch(() => {})
    pendingPersist.current = p
    return p
  }

  // Avisa a los demás (cuando el último guardado terminó) para que la Party se actualice en vivo
  const notifyParty = () => {
    Promise.resolve(pendingPersist.current).finally(() => partidaApiRef.current?.sendPartyUpdate?.())
  }

  // Cierra el control y avisa a los demás
  const closeControl = () => {
    setOpenControl(null)
    notifyParty()
  }

  const returnPokemon = () => {
    setPokemonInvocado(null); setInvocadoSprite(null)
    setOpenControl(null); setPokeData(null)
    notifyParty()
  }

  const sideBtn = 'shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg border border-gray-600 transition-all'

  // En modo lucha, los no seleccionados no ven sus iconos inferiores
  const hideBottomIcons = fight.active && !fight.players.some(p => String(p.id_personaje) === String(personajeId))

  return (
    <PartidaRoom roleLabel="Trainer" personajeId={personajeId} apiRef={partidaApiRef} pokemonInvocado={pokemonInvocado} onFight={setFight} onPartyVersion={setPartyVersion}>
      <div className="absolute inset-0">
        {/* Zona inferior: sprite del jugador + sprite del Pokémon invocado */}
        {!hideBottomIcons && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end justify-center gap-10">
          {user?.avatar_face_url && (
            <button onClick={openTrainerControl} className="transition-transform hover:scale-105" title="Controlar jugador">
              <img src={user.avatar_face_url} alt="Jugador"
                className={`${isMonitor ? 'w-[66px] h-[66px]' : 'w-11 h-11'} object-contain`} onError={e => { e.target.style.opacity = '0.2' }} />
            </button>
          )}
          {pokemonInvocado && invocadoSprite && (
            <button onClick={openPokemonControl} className="transition-transform hover:scale-105" title="Controlar Pokémon">
              <img src={invocadoSprite} alt="Pokémon invocado"
                className={`${isMonitor ? 'w-[66px] h-[66px]' : 'w-11 h-11'} object-contain`} onError={e => { e.target.style.opacity = '0.2' }} />
            </button>
          )}
        </div>
        )}

        {/* Botones laterales — columna centrada y scrolleable (para pantallas bajas) */}
        <div className="fixed left-3 top-40 bottom-3 z-30 overflow-y-auto">
          <div className="min-h-full flex flex-col justify-center gap-2 py-1">
            <button onClick={() => setShowPokedex(true)} className={sideBtn} title="Abrir Pokédex">
              <Smartphone size={18} />
            </button>

            {personajeId && (
              <button onClick={() => setShowChar(true)} className={sideBtn} title="Ver mi personaje">
                <User size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowMochila(true)} className={sideBtn} title="Mochila">
                <Backpack size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowEquip(true)} className={sideBtn} title="Equipamiento">
                <span className="relative inline-flex items-center justify-center">
                  <Shield size={18} />
                  <Sword size={11} className="absolute -bottom-1 -right-1.5" />
                </span>
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowBelt(true)} className={sideBtn} title="Cinturón">
                <PokeballsIcon size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowPC(true)} className={sideBtn} title="Femputadora">
                <Monitor size={18} />
              </button>
            )}

            {personajeId && (
              <button
                onClick={() => { if (isEditable) setShowEdit(true) }}
                disabled={!isEditable}
                className={`${sideBtn} ${isEditable ? '' : 'opacity-40 cursor-not-allowed hover:bg-gray-700'}`}
                title={isEditable ? 'Editar jugador' : 'Editar jugador (deshabilitado por el master)'}
              >
                {isEditable ? <Pencil size={18} /> : <PencilOff size={18} />}
              </button>
            )}
          </div>
        </div>
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
            <PokemonList title="Pokédex" moveDetail />
          </div>
        </div>
      )}

      {/* Hoja del personaje */}
      {showChar && personajeId && (
        <CharacterSheet id={personajeId} onClose={() => setShowChar(false)}
          partyVersion={partyVersion}
          onChanged={() => partidaApiRef.current?.sendPartyUpdate?.()} />
      )}

      {/* Mochila */}
      {showMochila && personajeId && (
        <Mochila personajeId={personajeId} onClose={() => setShowMochila(false)} />
      )}

      {/* Equipamiento */}
      {showEquip && personajeId && (
        <Equipamiento personajeId={personajeId} onClose={() => setShowEquip(false)} />
      )}

      {/* Cinturón — Pokémon en el equipo */}
      {showBelt && personajeId && (
        <PokemonBox
          personajeId={personajeId}
          mode="belt"
          onClose={() => setShowBelt(false)}
          onInvoke={(idpp, sprite) => {
            setPokemonInvocado(idpp)
            setInvocadoSprite(sprite)
            setShowBelt(false)
          }}
          onMoved={(idpp) => {
            // Si se envió al computador el Pokémon invocado, se limpia el invocado
            if (String(idpp) === String(pokemonInvocado)) {
              setPokemonInvocado(null)
              setInvocadoSprite(null)
            }
          }}
        />
      )}

      {/* Femputadora — Pokémon almacenados */}
      {showPC && personajeId && (
        <PokemonBox personajeId={personajeId} mode="pc" onClose={() => setShowPC(false)} />
      )}

      {/* Editar jugador (solo si el master lo habilitó) */}
      {showEdit && personajeId && isEditable && (
        <EditarPersonajeModal
          personajeId={personajeId}
          onClose={() => setShowEdit(false)}
          onChanged={() => partidaApiRef.current?.sendPartyUpdate?.()}
        />
      )}

      {/* Control del jugador */}
      {openControl === 'trainer' && charData && (
        <CombatePanel
          title="Jugador"
          initial={charData}
          onPersist={persistChar}
          onClose={closeControl}
        />
      )}

      {/* Control del Pokémon invocado */}
      {openControl === 'pokemon' && pokeData && (
        <CombatePanel
          title="Pokémon"
          initial={pokeData}
          moves={pokeData.moves}
          movePP={movePP}
          onCast={castMove}
          onPersist={persistPoke}
          onReturn={returnPokemon}
          onClose={closeControl}
        />
      )}
    </PartidaRoom>
  )
}

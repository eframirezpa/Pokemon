import { useState, useEffect, useRef } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Smartphone, User, Backpack, Shield, Sword, Monitor, X, Minus, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import PartidaRoom from '../components/PartidaRoom'
import PokemonList from './PokemonList'
import CharacterSheet from '../components/CharacterSheet'
import Mochila from '../components/Mochila'
import Equipamiento from '../components/Equipamiento'
import PokemonBox from '../components/PokemonBox'
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

// Panel de control (HP + exhaust/dsts/dstf). Persiste cada cambio vía onPersist.
function CombatePanel({ title, initial, onPersist, onReturn, onClose }) {
  const [v, setV] = useState(initial)
  useEffect(() => { setV(initial) }, [initial])
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
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 w-72 shadow-2xl">
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
      </div>
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
  const [pokemonInvocado, setPokemonInvocado] = useState(null) // id_personaje_pokemon
  const [invocadoSprite, setInvocadoSprite]   = useState(null)
  const [openControl, setOpenControl] = useState(null) // 'trainer' | 'pokemon' | null (solo uno a la vez)
  const [charData, setCharData] = useState(null)
  const [pokeData, setPokeData] = useState(null)
  const partidaApiRef = useRef(null) // acciones expuestas por PartidaRoom (p. ej. sendPartyUpdate)

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
      setPokeData({
        hp: d.pokemon_current_hp ?? d.pokemon_hp ?? 0, hpMax: d.pokemon_hp ?? 0,
        exhaust: d.personaje_pokemon_exahust_lvl ?? 0, dsts: d.personaje_pokemon_dsts ?? 0, dstf: d.personaje_pokemon_dstf ?? 0,
      })
    } catch { /* noop */ }
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
  const persistChar = (patch) => {
    const p = apiFetch(`/personaje/${personajeId}/combate`, { method: 'PATCH', body: JSON.stringify(toBody(patch)) }).catch(() => {})
    pendingPersist.current = p
    return p
  }
  const persistPoke = (patch) => {
    const p = apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}/combate`, { method: 'PATCH', body: JSON.stringify(toBody(patch)) }).catch(() => {})
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

  return (
    <PartidaRoom roleLabel="Trainer" personajeId={personajeId} apiRef={partidaApiRef} pokemonInvocado={pokemonInvocado}>
      <div className="relative flex items-end justify-center h-full pb-8">
        {/* Zona inferior: sprite del jugador + sprite del Pokémon invocado */}
        <div className="flex items-end justify-center gap-10">
          {user?.avatar_face_url && (
            <button onClick={openTrainerControl} className="transition-transform hover:scale-105" title="Controlar jugador">
              <img src={user.avatar_face_url} alt="Jugador"
                className="w-28 h-28 object-contain" onError={e => { e.target.style.opacity = '0.2' }} />
            </button>
          )}
          {pokemonInvocado && invocadoSprite && (
            <button onClick={openPokemonControl} className="transition-transform hover:scale-105" title="Controlar Pokémon">
              <img src={invocadoSprite} alt="Pokémon invocado"
                className="w-28 h-28 object-contain" onError={e => { e.target.style.opacity = '0.2' }} />
            </button>
          )}
        </div>

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

        {/* Botón de cinturón — Pokémon en el equipo */}
        {personajeId && (
          <button
            onClick={() => setShowBelt(true)}
            className="fixed left-3 top-1/2 translate-y-[calc(400%+30px)] z-30 flex items-center justify-center
                       w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Cinturón"
          >
            <PokeballsIcon size={18} />
          </button>
        )}

        {/* Botón de computadora — Pokémon almacenados */}
        {personajeId && (
          <button
            onClick={() => setShowPC(true)}
            className="fixed left-3 top-1/2 translate-y-[calc(500%+36px)] z-30 flex items-center justify-center
                       w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Femputadora"
          >
            <Monitor size={18} />
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
        />
      )}

      {/* Femputadora — Pokémon almacenados */}
      {showPC && personajeId && (
        <PokemonBox personajeId={personajeId} mode="pc" onClose={() => setShowPC(false)} />
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
          onPersist={persistPoke}
          onReturn={returnPokemon}
          onClose={closeControl}
        />
      )}
    </PartidaRoom>
  )
}

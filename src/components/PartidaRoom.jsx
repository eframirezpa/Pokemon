import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LogOut, ChevronDown, Users, X, Info,
  Zap, Flame, Droplet, Leaf, Snowflake, Swords, Skull, Mountain,
  Feather, Brain, Bug, Gem, Ghost, Sparkles, Moon, Shield, Wand2, Star, Globe, NotebookPen,
  AlertTriangle, Backpack, Dices,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { usePartidaPresence } from '../hooks/usePartidaPresence'
import PartyPanel, { PlayerCard } from './PartyPanel'
import MoveInfoModal from './MoveInfoModal'
import CharacterSheet from './CharacterSheet'
import { PokemonDetailView } from './PokemonBox'
import PartidaInfoPanel from './PartidaInfoPanel'
import MasterItemsModal from './MasterItemsModal'
import MasterNpcPicker from './MasterNpcPicker'
import IniciativaPanel from './IniciativaPanel'
import IniciativaTirada from './IniciativaTirada'
import IntercambioIniciativa from './IntercambioIniciativa'
import BarraTurno from './BarraTurno'
import EdicionJugadoresPanel from './EdicionJugadoresPanel'
import MapaModal from './MapaModal'
import NotasModal from './NotasModal'
import MasterFieldPicker from './MasterFieldPicker'
import PokeballSpinner from './PokeballSpinner'
import { POKEBALL_SPRITE, TYPE_COLORS, COUNTER_EVENTS, TONE } from '../lib/partidaShared'
import { PokemonHpCard, NpcHpCard } from './partida/PokemonHpCard'
import { MasterNpcFieldPanel } from './partida/MasterNpcFieldPanel'
import { TerrenosMasivoPanel } from './partida/TerrenosMasivoPanel'
import { MasterPokemonFieldPanel } from './partida/MasterPokemonFieldPanel'
import { MasterSendMessage } from './partida/MasterSendMessage'
import { EventosPanel } from './partida/EventosPanel'
import { Embers, Snow } from './partida/WeatherEffects'

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


// Icono representativo por tipo de ataque
const TYPE_ICONS = {
  Normal: Star,    Fire: Flame,      Water: Droplet,   Grass: Leaf,
  Electric: Zap,   Ice: Snowflake,   Fighting: Swords, Poison: Skull,
  Ground: Mountain, Flying: Feather, Psychic: Brain,   Bug: Bug,
  Rock: Gem,       Ghost: Ghost,     Dragon: Sparkles, Dark: Moon,
  Steel: Shield,   Fairy: Wand2,
}

/**
 * Arma la entrada de un Pokémon del campo a partir de su detalle
 * (`/master/pokemon/:id`). La usan tanto invocar uno nuevo como rehidratar
 * el campo guardado al conectarse -misma forma en los dos casos, solo cambia
 * de dónde salen `uid`/`hidden`/`inBall`-.
 */
function construirEntradaPokemon(d, { uid, master_pokemon_id, hidden, inBall }) {
  const moves = (d.moves || []).map(m => ({ ...m, name: m.move_name, type: m.move_type || null }))
  // Healing de feats (ej. Tough 'N per lvl') sumado a la vida
  const lvl = d.pokemon_level || 1
  let healing = 0
  for (const f of (d.feats || [])) for (const b of (f.bonos || [])) {
    if ((b.type || '').toLowerCase() !== 'healing') continue
    const m = /(\d+)\s*per\s*l/i.exec(b.value || '')
    healing += m ? Number(m[1]) * lvl : (Number(b.value) || 0)
  }
  return {
    uid,
    master_pokemon_id,
    pokemon_id:  d.id_pokemon,
    name:        d.pokemon_apodo || d.pokemon_name,
    type1:       d.type_1_name || null,
    type2:       d.type_2_name || null,
    sr:          d.pokemon_sr || null,
    level:       lvl,
    hp_max:      (d.pokemon_hp ?? 0) + healing,
    hp_current:  (d.pokemon_current_hp ?? d.pokemon_hp ?? 0) + healing,
    healing,
    sprite:      d.pokemon_media_sprite || d.pokemon_media_main,
    moves,
    hidden,
    ...(inBall ? { inBall: true } : {}),
  }
}


export default function PartidaRoom({ children, personajeId = null, apiRef = null, pokemonInvocado = null, onFight = null, onPartyVersion = null }) {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const logEndRef   = useRef(null)

  const [showParty, setShowParty]   = useState(false)
  const [terrenoTick, setTerrenoTick] = useState(0) // el máster no recibe su propio party_update
  const [showMapa, setShowMapa]     = useState(false)
  const [showNotas, setShowNotas]   = useState(false)
  const [logOpen, setLogOpen]       = useState(true)
  const [showPokedex, setShowPokedex] = useState(false)
  const [showNpcPicker, setShowNpcPicker] = useState(false)
  const [showIniciativa, setShowIniciativa] = useState(false)
  const [turnoBusy, setTurnoBusy] = useState(false)
  const [showInfo, setShowInfo]     = useState(false)   // personajes registrados (solo master)
  const [showItems, setShowItems] = useState(false)   // catálogo de items (solo master)
  const [inspectCharId, setInspectCharId] = useState(null) // ficha de personaje abierta desde el party (master)
  const [masterMoveInfo, setMasterMoveInfo] = useState(null) // detalle de un movimiento del panel del master
  const [inspectMasterPoke, setInspectMasterPoke] = useState(null) // detalle de un Pokémon del master en el campo
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
  const { presentes, log, masterMessage, sendMasterMessage, activePokemons, sendPokemons, setPokemonsLocal, activeNpcs, sendNpcs, setNpcsLocal, lastAttack, sendAttack, sendActivity, partyUpdatedAt, sendPartyUpdate, invocados, sendInvocado, background, sendBackground, eventActive, eventFlashAt, sendEventState, sendEventFlash, counters, changeCounter, fight, sendFight, clearFight, prize, sendPrize, captura, sendCaptura, eventIntroAt, sendEventIntro, hitAt, sendHitFlash, healAt, sendHealFlash, mapaPin, setMapaPin, sendMapaPin, iniciativa, setIniciativaLocal, sendIniciativa, swapPropuesta, setSwapPropuesta, sendSwapPropuesta, swapRespuesta, sendSwapRespuesta } = usePartidaPresence(id, userInfo)

  // ── Atrapar Pokémon: pokébolas del trainer, panel de lanzamiento y animación ──
  const [pokeballs, setPokeballs]   = useState([])   // items tipo pokeball con cantidad > 0
  const [throwTarget, setThrowTarget] = useState(null) // Pokémon del master al que se apunta
  const [throwFx, setThrowFx]       = useState(null) // animación en curso
  const [throwing, setThrowing]     = useState(false)

  const loadPokeballs = useCallback(() => {
    if (isMaster || personajeId == null) return
    apiFetch(`/personaje/${personajeId}/equipo`).then(r => r.json())
      .then(d => setPokeballs((Array.isArray(d) ? d : [])
        .filter(it => it.item_type === 'pokeball' && Number(it.cantidad) > 0)))
      .catch(() => setPokeballs([]))
  }, [isMaster, personajeId])
  useEffect(() => { loadPokeballs() }, [loadPokeballs])

  // ── Pin de la party en el mapa ──
  // El broadcast solo alcanza a quien ya está conectado, así que al entrar se
  // consulta el guardado: es lo que hace que siga ahí tras recargar la página.
  useEffect(() => {
    if (!id) return
    apiFetch(`/partida/${id}/mapa-pin`).then(r => r.json())
      .then(d => setMapaPin(d?.pin ?? null))
      .catch(() => {})
  }, [id, setMapaPin])

  // El orden de turno se consulta al entrar por lo mismo que el pin: el
  // broadcast solo alcanza a quien ya estaba conectado. setIniciativaLocal
  // (y no el setIniciativa a secas) porque también tiene que dejar bien
  // iniciativaRef: si no, el master que recarga reenvía un "vacío" viejo en
  // cuanto otro se conecta, y le borra la barra de turno a los entrenadores.
  useEffect(() => {
    if (!id) return
    apiFetch(`/partida/${id}/iniciativa`).then(r => r.json())
      .then(d => setIniciativaLocal(d?.iniciativa ?? null))
      .catch(() => {})
  }, [id, setIniciativaLocal])

  // Terminar el turno propio. La regla de quién puede la aplica el servidor;
  // aquí solo se difunde lo que respondió.
  const terminarTurno = useCallback(async () => {
    setTurnoBusy(true)
    try {
      const res = await apiFetch(`/partida/${id}/iniciativa/turno`, {
        method: 'PATCH', body: JSON.stringify({ direccion: 'siguiente' }),
      })
      if (res.ok) sendIniciativa((await res.json())?.iniciativa ?? null)
    } catch { /* si falla, el turno sigue donde estaba */ }
    finally { setTurnoBusy(false) }
  }, [id, sendIniciativa])

  // Fijar, mover o quitar el pin (solo el máster). Se pinta al instante, se
  // guarda y se difunde; si el guardado falla, se deshace y no queda un pin
  // fantasma que solo ve quien lo puso.
  const cambiarMapaPin = useCallback(async (pin) => {
    const previo = mapaPin
    sendMapaPin(pin)
    try {
      const res = await apiFetch(`/partida/${id}/mapa-pin`, { method: 'PATCH', body: JSON.stringify({ pin }) })
      if (!res.ok) throw new Error()
      const d = await res.json()
      // Se adopta el pin ya normalizado por el servidor, pero solo aquí: lo que
      // difiere es el campo del mapa, que nadie dibuja, así que volver a
      // difundirlo sería un mensaje de más por cada clic.
      setMapaPin(d?.pin ?? null)
    } catch {
      sendMapaPin(previo)
    }
  }, [id, mapaPin, sendMapaPin, setMapaPin])

  // Sin personaje o siendo master no hay captura, aunque queden datos de antes
  const hasPokeballs = !isMaster && personajeId != null && pokeballs.length > 0

  // Al abrir el panel se recarga la mochila: las cantidades pudieron cambiar
  const openThrowPanel = (p) => { loadPokeballs(); setThrowTarget(p) }

  // El panel se cierra solo si el master guarda al Pokémon o lo quita del campo
  const liveThrowTarget = throwTarget && activePokemons.some(p => p.uid === throwTarget.uid && !p.inBall)
    ? throwTarget : null
  // Sprite del icono junto al Pokémon: el de la pokébola más común que lleve encima
  const ballIcon = pokeballs[0]?.item_media_sprite || null

  // Lanza la pokébola elegida: cierra el panel, descuenta 1 y dispara la animación
  const throwBall = async (ball) => {
    if (throwing || !throwTarget) return
    setThrowing(true)
    const target = throwTarget
    setThrowTarget(null)

    // Mide origen (icono del jugador) y destino (tarjeta del Pokémon) en pantalla
    const origin = document.querySelector('[data-throw-origin]')?.getBoundingClientRect()
    const dest   = document.querySelector(`[data-throw-target="${target.uid}"]`)?.getBoundingClientRect()
    if (origin && dest) {
      const from = { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 }
      const to   = { x: dest.left + dest.width / 2,     y: dest.top + dest.height / 2 }
      setThrowFx({ sprite: ball.item_media_sprite, from, dx: to.x - from.x, dy: to.y - from.y })
      setTimeout(() => setThrowFx(null), 950)
    }

    // Descuenta una unidad del item lanzado
    const restante = Math.max(0, Number(ball.cantidad) - 1)
    setPokeballs(prev => prev.map(b => b.id_personaje_equipo === ball.id_personaje_equipo
      ? { ...b, cantidad: restante } : b).filter(b => Number(b.cantidad) > 0))
    try {
      await apiFetch(`/personaje/${personajeId}/equipo/${ball.id_personaje_equipo}`,
        { method: 'PATCH', body: JSON.stringify({ cantidad: restante }) })
    } catch { loadPokeballs() }
    setThrowing(false)
  }

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

  // Aviso del navegador antes de recargar o cerrar. En tablets y móviles el
  // scroll dispara el "pull to refresh" con facilidad, y eso tira la partida:
  // se pierde el estado en memoria y hay que volver a entrar.
  // El texto lo decide el navegador; desde hace años no se puede personalizar.
  useEffect(() => {
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [])

  // Aviso de Pokémon atrapado durante 5s, para todos los de la partida.
  // Se marca cuál ya expiró en vez de encender un flag: así el efecto solo
  // toca el estado dentro del timeout y no de forma síncrona al renderizar.
  const [capturaVistaAt, setCapturaVistaAt] = useState(0)
  useEffect(() => {
    if (!captura.at) return
    const t = setTimeout(() => setCapturaVistaAt(captura.at), 5000)
    return () => clearTimeout(t)
  }, [captura.at])
  const showCaptura = captura.at > 0 && capturaVistaAt !== captura.at

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

  // Expone acciones de la partida al componente padre (p. ej. TrainerPartida).
  // reloadPokeballs lo llama la mochila al cerrarse, para que el icono y el panel
  // reflejen al instante las pokébolas que se acaban de agregar.
  useEffect(() => {
    if (apiRef) apiRef.current = {
      sendPartyUpdate, sendAttack, reloadPokeballs: loadPokeballs, getPresentes: () => presentes,
      // Anuncio de partida: el mensaje del DM, la línea de actividad y el aviso
      // central. Los tres juntos son lo que hace el máster al entregar un
      // Pokémon, y las acciones del trainer deben verse igual.
      anunciar: (texto, trainer, pokemon) => {
        sendMasterMessage(texto)
        sendActivity(texto)
        if (trainer) sendCaptura(trainer, pokemon, texto)
      },
    }
  }, [apiRef, sendPartyUpdate, sendAttack, loadPokeballs, presentes, sendMasterMessage, sendActivity, sendCaptura])

  // Difunde el Pokémon invocado del jugador cuando cambia
  useEffect(() => {
    if (personajeId != null) sendInvocado(personajeId, pokemonInvocado)
  }, [personajeId, pokemonInvocado, sendInvocado])

  // Tope de Pokémon que el máster puede tener invocados a la vez en el campo.
  // No tiene que ver con el cinturón (ese sigue en 6): el selector ofrece toda
  // su colección, así que este número es solo cuántos caben en la mesa.
  const MAX_POKEMON = 20
  // Los NPC son gente, no un equipo: caben menos en la mesa que los Pokémon.
  const MAX_NPC = 10

  // Rehidrata el campo (quién está invocado, oculto, en la pokébola) desde la
  // BD al entrar o recargar: antes solo sobrevivía si algún otro conectado se
  // lo reenviaba por presencia al volver a unirse, y si el máster estaba solo
  // se perdía seguro. Se hace local -setPokemonsLocal/setNpcsLocal- y no con
  // sendPokemons/sendNpcs: cada conectado lo lee de la misma BD, difundirlo de
  // vuelta sería puro eco.
  useEffect(() => {
    if (!id) return
    let cancelado = false
    apiFetch(`/partida/${id}/campo`).then(r => r.json()).then(async (data) => {
      if (cancelado) return
      setNpcsLocal((data.npcs || []).map(n => ({
        uid:          String(n.id_campo),
        master_npc_id: n.id_master_npc,
        name:         n.master_npc_apodo,
        level:        Number(n.master_npc_level) || 1,
        hp_max:       Number(n.master_npc_hp) || 0,
        hp_current:   Number(n.master_npc_current_hp ?? n.master_npc_hp) || 0,
        avatar:       n.master_npc_avatar,
        hidden:       n.hidden,
      })))

      const pokemones = await Promise.all((data.pokemones || []).map(async (c) => {
        try {
          const d = await apiFetch(`/master/pokemon/${c.id_master_pokemon}`).then(r => r.json())
          return construirEntradaPokemon(d, {
            uid: String(c.id_campo), master_pokemon_id: c.id_master_pokemon, hidden: c.hidden, inBall: c.in_ball,
          })
        } catch { return null }
      }))
      if (!cancelado) setPokemonsLocal(pokemones.filter(Boolean))
    }).catch(() => {})
    return () => { cancelado = true }
  }, [id, setPokemonsLocal, setNpcsLocal])

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

  // El master elige uno de SUS Pokémon → se carga su detalle y se pone en el campo
  const handlePickPokemon = async (mp) => {
    setShowPokedex(false)
    if (activePokemons.length >= MAX_POKEMON) return
    try {
      // Se registra en la BD primero: si ya está en el campo o se llegó al
      // tope (puede pasar por una carrera entre dos pestañas del máster), el
      // 201 no llega y no se agrega nada a medias.
      const campoRes = await apiFetch(`/partida/${id}/campo/pokemon`, {
        method: 'POST', body: JSON.stringify({ id_master_pokemon: mp.id_master_pokemon }),
      })
      if (!campoRes.ok) return
      const campo = await campoRes.json()

      const d = await apiFetch(`/master/pokemon/${mp.id_master_pokemon}`).then(r => r.json())
      const nuevo = construirEntradaPokemon(d, {
        uid: String(campo.id_campo), master_pokemon_id: mp.id_master_pokemon, hidden: campo.hidden,
      })
      sendPokemons([...activePokemons, nuevo])

      const text = 'Apareció un pokémon salvaje'
      sendMasterMessage(text)
      sendActivity(text)
    } catch { /* noop */ }
  }

  const updatePokemon = (uid, patch) =>
    sendPokemons(activePokemons.map(p => (p.uid === uid ? { ...p, ...patch } : p)))

  // El HP del Pokémon invocado se persiste además de propagarse por presencia:
  // sin esto las bajas se perdían al reloguear o al volver a invocarlo.
  const handleHpChange = (uid, delta) => {
    const p = activePokemons.find(x => x.uid === uid)
    if (!p) return
    const nuevo = Math.max(0, Math.min(p.hp_max, p.hp_current + delta))
    updatePokemon(uid, { hp_current: nuevo })
    if (p.master_pokemon_id != null) {
      apiFetch(`/master/pokemon/${p.master_pokemon_id}/combate`, {
        method: 'PATCH',
        body: JSON.stringify({ current_hp: Math.max(0, nuevo - (p.healing || 0)) }),
      }).catch(() => {})
    }
  }

  const handleToggleHidden = (uid) => {
    const p = activePokemons.find(x => x.uid === uid)
    if (!p) return
    const nowHidden = !p.hidden
    updatePokemon(uid, { hidden: nowHidden })
    apiFetch(`/partida/${id}/campo/${uid}`, { method: 'PATCH', body: JSON.stringify({ hidden: nowHidden }) }).catch(() => {})
    if (!nowHidden) {
      // Se revela el Pokémon → mostrar el nombre real
      const text = `Apareció un ${p.name} salvaje`
      sendMasterMessage(text)
      sendActivity(text)
    }
  }

  // ── Transferencia de un Pokémon del master a un entrenador ──
  const [transferPoke, setTransferPoke]   = useState(null) // Pokémon elegido en el panel
  const [transferDest, setTransferDest]   = useState(null) // trainer seleccionado
  const [transferConfirm, setTransferConfirm] = useState(false)
  const [transferBusy, setTransferBusy]   = useState(false)
  const [transferError, setTransferError] = useState('')

  // Entrenadores conectados que tienen personaje activo en la partida
  const trainersConectados = useMemo(() => {
    const vistos = new Set()
    return (presentes || []).filter(p => {
      if (p.role === 'master' || p.personaje_id == null) return false
      if (vistos.has(p.personaje_id)) return false
      vistos.add(p.personaje_id)
      return true
    })
  }, [presentes])

  // En la presencia solo viaja el nombre de usuario, así que se consulta la
  // party para poder mostrar el nombre del personaje de cada trainer.
  const [nombresPersonaje, setNombresPersonaje] = useState({}) // personaje_id → nombre
  const nombreTrainer = (t) =>
    nombresPersonaje[String(t?.personaje_id)] || t?.user_name || 'Jugador'

  const abrirTransferencia = (pokemon) => {
    setTransferPoke(pokemon); setTransferDest(null)
    setTransferConfirm(false); setTransferError('')
    apiFetch(`/personaje/party?id_partida=${id}`).then(r => r.json())
      .then(d => {
        const m = {}
        for (const c of (Array.isArray(d) ? d : [])) m[String(c.id_personaje)] = c.nombre_personaje
        setNombresPersonaje(m)
      }).catch(() => {})
  }
  const cerrarTransferencia = () => {
    setTransferPoke(null); setTransferDest(null)
    setTransferConfirm(false); setTransferError('')
  }

  const confirmarTransferencia = async () => {
    if (!transferPoke || !transferDest || transferBusy) return
    setTransferBusy(true); setTransferError('')
    try {
      const res = await apiFetch(`/master/pokemon/${transferPoke.master_pokemon_id}/transfer`,
        { method: 'POST', body: JSON.stringify({ id_personaje: transferDest.personaje_id }) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setTransferError(j.error || 'No se pudo transferir'); setTransferBusy(false); return
      }
      const j = await res.json()
      // Desaparece del campo para el master y para todos los jugadores
      sendPokemons(activePokemons.filter(p => p.uid !== transferPoke.uid))
      const nombrePokemon = j.pokemon_apodo || j.pokemon_name || transferPoke.name
      // El nombre del PERSONAJE, no el del usuario. Se toma de la respuesta del
      // backend, que lo lee de la tabla: nombreTrainer() depende de un fetch
      // aparte y, si ese no volvió, caía en el user_name.
      const nombreDest = j.nombre_personaje || nombreTrainer(transferDest)
      const texto = `Felicitaciones el trainer ${nombreDest} ha atrapado al pokemon ${nombrePokemon}`
      sendMasterMessage(texto)
      sendActivity(texto)
      sendCaptura(nombreDest, nombrePokemon) // aviso central de 5s
      sendPartyUpdate()
      cerrarTransferencia()
    } catch {
      setTransferError('No se pudo transferir')
    } finally { setTransferBusy(false) }
  }

  // Guarda o suelta al Pokémon de la pokébola. Se propaga por presencia, así que
  // el trainer ve la bola balanceándose sin poder lanzarle nada mientras esté dentro.
  const handleToggleBall = (uid) => {
    const p = activePokemons.find(x => x.uid === uid)
    if (!p) return
    const nuevo = !p.inBall
    updatePokemon(uid, { inBall: nuevo })
    apiFetch(`/partida/${id}/campo/${uid}`, { method: 'PATCH', body: JSON.stringify({ in_ball: nuevo }) }).catch(() => {})
  }

  const handleRemove = (uid) => {
    sendPokemons(activePokemons.filter(p => p.uid !== uid))
    apiFetch(`/partida/${id}/campo/${uid}`, { method: 'DELETE' }).catch(() => {})
  }

  // ── NPC del máster en el campo ──
  // Salen ocultos, como los Pokémon: los jugadores ven una silueta hasta que el
  // máster los revele.
  const handlePickNpc = async (npc) => {
    setShowNpcPicker(false)
    if (activeNpcs.length >= MAX_NPC) return
    try {
      const res = await apiFetch(`/partida/${id}/campo/npc`, {
        method: 'POST', body: JSON.stringify({ id_master_npc: npc.id_master_npc }),
      })
      if (!res.ok) return
      const campo = await res.json()
      sendNpcs([...activeNpcs, {
        uid:          String(campo.id_campo),
        master_npc_id: npc.id_master_npc,
        name:         npc.master_npc_apodo,
        level:        Number(npc.master_npc_level) || 1,
        hp_max:       Number(npc.master_npc_hp) || 0,
        hp_current:   Number(npc.master_npc_current_hp ?? npc.master_npc_hp) || 0,
        avatar:       npc.master_npc_avatar,
        hidden:       campo.hidden,
      }])
    } catch { /* noop */ }
  }

  const updateNpc = (uid, patch) =>
    sendNpcs(activeNpcs.map(n => (n.uid === uid ? { ...n, ...patch } : n)))

  // La vida se guarda además de difundirse: un NPC herido sigue herido al
  // recargar o al volver a invocarlo, igual que un Pokémon del máster.
  const handleNpcHp = (uid, delta) => {
    const n = activeNpcs.find(x => x.uid === uid)
    if (!n) return
    const nuevo = Math.max(0, Math.min(n.hp_max, n.hp_current + delta))
    updateNpc(uid, { hp_current: nuevo })
    if (n.master_npc_id != null) {
      apiFetch(`/master/npc/${n.master_npc_id}/combate`, {
        method: 'PATCH', body: JSON.stringify({ current_hp: nuevo }),
      }).catch(() => {})
    }
  }

  const handleNpcToggleHidden = (uid) => {
    const n = activeNpcs.find(x => x.uid === uid)
    if (!n) return
    const ahoraOculto = !n.hidden
    updateNpc(uid, { hidden: ahoraOculto })
    apiFetch(`/partida/${id}/campo/${uid}`, { method: 'PATCH', body: JSON.stringify({ hidden: ahoraOculto }) }).catch(() => {})
    if (!ahoraOculto) sendActivity(`${n.name} entró en escena`)
  }

  const handleNpcRemove = (uid) => {
    sendNpcs(activeNpcs.filter(n => n.uid !== uid))
    apiFetch(`/partida/${id}/campo/${uid}`, { method: 'DELETE' }).catch(() => {})
  }

  // Mientras siga oculto no se delata quién atacó, solo que alguien lo hizo
  const handleNpcAttack = (npc) => {
    if (!npc) return
    sendActivity(npc.hidden ? 'Un jugador ha atacado' : `El jugador ${npc.name} ha atacado`)
  }

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
        {/* Mensaje del master: solo lo ven los demás, el master ya sabe lo que envió */}
        {!isMaster && (
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
            <img src={eventActive ? '/evento0/avatar.png' : '/avatars/chuckface.png'} alt="Master"
              className="w-8 h-8 rounded-full border-2 border-amber-500/60 object-cover shrink-0 bg-gray-700" />
            <p className="text-sm text-gray-100 leading-snug truncate">{masterMessage}</p>
          </div>
        )}
        {/* Enviar mensaje: a la izquierda del botón de salir (solo master) */}
        {isMaster && (
          <div className="flex-1 min-w-0 mr-3">
            <MasterSendMessage onSend={sendMasterMessage} compact />
          </div>
        )}
        <button
          onClick={() => navigate(ROLE_DASHBOARD[user?.role] ?? '/')}
          className="ml-auto shrink-0 flex items-center gap-2 text-sm text-red-400 hover:text-red-300
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

      {/* Turno en curso: lo ve toda la mesa mientras dure el combate */}
      {iniciativa?.estado === 'activa' && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-40 max-w-[92vw]">
          <BarraTurno iniciativa={iniciativa} userId={user?.user_id}
            onTerminar={terminarTurno} busy={turnoBusy} />
        </div>
      )}

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

        {/* Botón flotante — mapa de la región. Lo ven todos: los jugadores para
            mirar dónde está la party, el máster para moverla. Al máster le toca
            más abajo porque arriba ya tiene sus dos botones. */}
        <button
          onClick={() => setShowMapa(true)}
          className={`fixed left-3 z-40 flex items-center justify-center w-10 h-10
                     rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                     border border-gray-600 transition-all ${isMaster ? 'top-52' : 'top-28'}`}
          title={isMaster ? 'Mapa · fijar el pin de la party' : 'Mapa'}
        >
          <Globe size={18} />
        </button>

        {/* Botón flotante — notas (jugador con personaje) */}
        {!isMaster && personajeId != null && (
          <button
            onClick={() => setShowNotas(true)}
            className="fixed left-3 top-40 z-40 flex items-center justify-center w-10 h-10
                       rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Pokenotas"
          >
            <NotebookPen size={18} />
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

        {/* Botón flotante — iniciativa (solo master) */}
        {isMaster && (
          <button
            onClick={() => {
              // Los nombres de personaje se piden aquí: la presencia solo trae
              // el del usuario, y en la ronda debe salir el del personaje.
              apiFetch(`/personaje/party?id_partida=${id}`).then(r => r.json())
                .then(d => {
                  const m = {}
                  for (const c of (Array.isArray(d) ? d : [])) m[String(c.id_personaje)] = c.nombre_personaje
                  setNombresPersonaje(m)
                }).catch(() => {})
              setShowIniciativa(true)
            }}
            className={`fixed left-3 top-64 z-40 flex items-center justify-center w-10 h-10
                       rounded-full shadow-lg border transition-all ${
                       iniciativa ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600'}`}
            title={iniciativa ? 'Iniciativa en curso' : 'Pedir iniciativa'}
          >
            <Dices size={18} />
          </button>
        )}

        {/* Botón flotante — catálogo de items (solo master) */}
        {isMaster && (
          <button
            onClick={() => setShowItems(true)}
            className="fixed left-3 top-40 z-30 flex items-center justify-center w-10 h-10
                       rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Items"
          >
            <Backpack size={18} />
          </button>
        )}

        {/* Center — master panel + content + activity log */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Panel del master: todo en un único contenedor con scroll. Antes esto
              convivía con la zona de contenido de abajo, que para el master queda
              vacía (todo lo suyo es !isMaster) y aun así se llevaba el alto sobrante. */}
          {isMaster && (
            <div className="flex-1 overflow-y-auto pb-3 pl-14">
              <MasterPokemonFieldPanel
                pokemons={activePokemons}
                max={MAX_POKEMON}
                onAdd={() => setShowPokedex(true)}
                onHp={handleHpChange}
                onRemove={handleRemove}
                onCast={handleCast}
                onToggleHidden={handleToggleHidden}
                onToggleBall={handleToggleBall}
                onTransfer={abrirTransferencia}
                onMoveInfo={setMasterMoveInfo}
                onInspect={setInspectMasterPoke}
              />
              <MasterNpcFieldPanel
                npcs={activeNpcs}
                max={MAX_NPC}
                onAdd={() => setShowNpcPicker(true)}
                onHp={handleNpcHp}
                onRemove={handleNpcRemove}
                onToggleHidden={handleNpcToggleHidden}
                onAttack={handleNpcAttack}
              />
              <TerrenosMasivoPanel partidaId={id} onAfterChange={() => { sendPartyUpdate(); setTerrenoTick(t => t + 1) }} />
              <EdicionJugadoresPanel partidaId={id} presentes={presentes} partyVersion={`${partyUpdatedAt}-${terrenoTick}`}
                invocados={invocados} onAfterChange={sendPartyUpdate} />
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
            </div>
          )}

          {/* Zona de contenido por rol — el master no la usa */}
          {!isMaster && (
          <div className="relative overflow-auto p-6 flex-1">
            {/* Fondo del evento con aparición suave (solo trainer/espectador) */}
            {!isMaster && background && (
              <div key={background} className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat animate-bgfade"
                style={{ backgroundImage: `url("${background}")` }} />
            )}

            {/* Tarjetas de vida — parte superior derecha (trainer/espectador).
                Pokémon y NPC comparten la misma columna: así se apilan solos y
                no hay que calcularle la altura a nadie. */}
            {!isMaster && (activePokemons.length > 0 || activeNpcs.length > 0) && (
              <div className={`absolute top-4 right-4 z-10 flex gap-2 origin-top-right ${isPhone ? 'scale-[0.65]' : 'scale-100'} ${isPhoneLandscape ? 'flex-row-reverse' : 'flex-col'}`}>
                {activePokemons.map(p => (
                  <PokemonHpCard key={p.uid} p={p}
                    onPokeball={hasPokeballs && !p.inBall ? openThrowPanel : null} ballSprite={ballIcon} />
                ))}
                {activeNpcs.map(n => <NpcHpCard key={n.uid} n={n} />)}
              </div>
            )}

            {/* Panel para elegir qué pokébola lanzar — arriba y centrado */}
            {liveThrowTarget && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-72 max-w-[90vw]">
                <div className="bg-white rounded-2xl border-2 border-gray-700 shadow-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-black text-gray-900 text-sm leading-tight">Lanzar pokébola</h4>
                      <p className="text-[11px] text-gray-500 truncate">
                        {liveThrowTarget.hidden ? '???' : liveThrowTarget.name}
                      </p>
                    </div>
                    <button onClick={() => setThrowTarget(null)} title="Cerrar"
                      className="shrink-0 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {pokeballs.map(b => (
                      <div key={b.id_personaje_equipo} className="flex items-center gap-2 px-4 py-2">
                        {b.item_media_sprite && (
                          <img src={b.item_media_sprite} alt="" className="w-7 h-7 object-contain shrink-0"
                            onError={e => { e.target.style.opacity = '0.3' }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{b.item_name}</p>
                          <p className="text-[11px] text-gray-500">Disponibles: {b.cantidad}</p>
                        </div>
                        <button onClick={() => throwBall(b)} disabled={throwing}
                          className="shrink-0 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors">
                          Lanzar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pokébola en vuelo: del icono del jugador al Pokémon del master.
                Va en coordenadas de viewport porque se miden con getBoundingClientRect. */}
            {throwFx && (
              <div className="fixed inset-0 z-[90] pointer-events-none">
                <img src={throwFx.sprite} alt=""
                  className="absolute w-10 h-10 object-contain animate-pokeball-throw drop-shadow-lg"
                  style={{
                    left: throwFx.from.x - 20,
                    top:  throwFx.from.y - 20,
                    '--dx': `${throwFx.dx}px`,
                    '--dy': `${throwFx.dy}px`,
                  }}
                  onError={e => { e.target.style.opacity = '0' }} />
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
          )}

          {/* Activity log */}
          <div className={`shrink-0 border-t border-gray-700 bg-gray-800/60 flex flex-col transition-all duration-300 ${logOpen ? 'h-40' : 'h-9'}`}>
            <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Actividad
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
          partyVersion={`${partyUpdatedAt}-${terrenoTick}`}
          hideHp={!isMaster}
          invocados={invocados}
          onClose={() => setShowParty(false)}
          onCharClick={isMaster ? (c => setInspectCharId(c.id_personaje)) : undefined}
          onPokemonClick={isMaster ? ((c, p) => setInspectPoke({ personajeId: c.id_personaje, idpp: p.id_personaje_pokemon })) : undefined}
        />
      )}

      {/* Mapa de la región */}
      {showMapa && (
        <MapaModal onClose={() => setShowMapa(false)}
          pin={mapaPin} editable={isMaster} onPinChange={isMaster ? cambiarMapaPin : null} />
      )}

      {/* Notas del jugador */}
      {showNotas && personajeId != null && <NotasModal personajeId={personajeId} onClose={() => setShowNotas(false)} />}

      {/* Ventana de personajes registrados (solo master) */}
      {showInfo && isMaster && (
        <PartidaInfoPanel partidaId={id} onClose={() => setShowInfo(false)} />
      )}

      {/* Catálogo de items (solo master): buscar, crear y corregir */}
      {showItems && isMaster && (
        <MasterItemsModal onClose={() => setShowItems(false)} />
      )}

      {masterMoveInfo && <MoveInfoModal m={masterMoveInfo} theme="dark" onClose={() => setMasterMoveInfo(null)} />}

      {/* Aviso de captura: 5 s centrado en pantalla, para toda la partida (master incluido) */}
      {showCaptura && captura.trainer && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center pointer-events-none p-4">
          <div className="animate-event-pop bg-white/95 border-4 border-amber-400 rounded-2xl shadow-2xl px-6 py-5 max-w-md text-center">
            <img src={POKEBALL_SPRITE} alt="" className="w-12 h-12 object-contain mx-auto mb-2 animate-pokeball-wobble"
              onError={e => { e.target.style.opacity = '0.3' }} />
            <p className="text-lg font-black text-gray-900 leading-snug">
              {captura.texto ? captura.texto : (
                <>En hora buena, el trainer <span className="text-red-600">{captura.trainer}</span> ha atrapado a <span className="text-red-600">{captura.pokemon}</span></>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Transferencia de un Pokémon del master a un entrenador (solo master) */}
      {transferPoke && isMaster && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h3 className="font-black text-gray-900 text-base leading-tight">Transferencia de pokémon</h3>
                <p className="text-xs text-gray-500 truncate">{transferPoke.name} · Nv {transferPoke.level}</p>
              </div>
              <button onClick={cerrarTransferencia} title="Cerrar" className="shrink-0 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2">Trainers conectados</p>
              {trainersConectados.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-3">No hay trainers conectados con personaje en la partida.</p>
              ) : (
                <div className="space-y-1.5">
                  {trainersConectados.map(t => {
                    const sel = transferDest?.personaje_id === t.personaje_id
                    return (
                      <button key={t.personaje_id} onClick={() => setTransferDest(t)}
                        className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors
                          ${sel ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                        {t.avatar_face_url && (
                          <img src={t.avatar_face_url} alt="" className="w-8 h-8 object-contain rounded-full bg-gray-100 shrink-0"
                            onError={e => { e.target.style.opacity = '0.2' }} />
                        )}
                        <span className="flex-1 min-w-0 text-sm font-bold text-gray-900 truncate">{nombreTrainer(t)}</span>
                        <span className={`shrink-0 w-4 h-4 rounded-full border-2 ${sel ? 'border-red-600 bg-red-600' : 'border-gray-300'}`} />
                      </button>
                    )
                  })}
                </div>
              )}
              {transferError && <p className="text-xs text-red-600 font-medium mt-3">{transferError}</p>}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button onClick={cerrarTransferencia} className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg">
                Cancelar
              </button>
              <button onClick={() => setTransferConfirm(true)} disabled={!transferDest}
                className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-lg transition-colors">
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de la transferencia */}
      {transferConfirm && transferPoke && transferDest && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                ¿Está seguro de transferir el pokemon <b>{transferPoke.name}</b> al trainer <b>{nombreTrainer(transferDest)}</b>?
              </p>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setTransferConfirm(false)} disabled={transferBusy}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">
                Cancelar
              </button>
              <button onClick={confirmarTransferencia} disabled={transferBusy}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
                {transferBusy ? <PokeballSpinner size={15} /> : null} Confirmar
              </button>
            </div>
          </div>
        </div>
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

      {/* Detalle completo de un Pokémon del master (lupa en la tarjeta del campo) */}
      {inspectMasterPoke != null && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setInspectMasterPoke(null) }}>
          <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl">
            <button onClick={() => setInspectMasterPoke(null)}
              className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
              <X size={18} />
            </button>
            <PokemonDetailView endpoint={`/master/pokemon/${inspectMasterPoke}`} master onBack={() => setInspectMasterPoke(null)} />
          </div>
        </div>
      )}

      {/* Le sale sola a quien aún no ha tirado */}
      {iniciativa?.estado === 'pidiendo'
        && (iniciativa.participantes || []).some(p => p.user_id === user?.user_id && !p.listo) && (
        <IniciativaTirada partidaId={id} personajeId={personajeId} esMaster={isMaster} pokemonInvocado={pokemonInvocado}
          onListo={(ini) => sendIniciativa(ini)} />
      )}

      {showIniciativa && isMaster && (
        <IniciativaPanel partidaId={id} iniciativa={iniciativa} presentes={presentes}
          nombresPersonaje={nombresPersonaje}
          onCambio={(ini) => sendIniciativa(ini)}
          onClose={() => setShowIniciativa(false)} />
      )}

      {/* Intercambio de iniciativa (Alert / Alert Pokemon): no es cosa del máster */}
      {!isMaster && (
        <IntercambioIniciativa partidaId={id} iniciativa={iniciativa} userId={user?.user_id}
          swapPropuesta={swapPropuesta} setSwapPropuesta={setSwapPropuesta}
          swapRespuesta={swapRespuesta}
          sendSwapPropuesta={sendSwapPropuesta} sendSwapRespuesta={sendSwapRespuesta}
          onCambio={(ini) => sendIniciativa(ini)} />
      )}

      {/* Selección del NPC que sale al campo */}
      {showNpcPicker && (
        <MasterNpcPicker
          disabled={activeNpcs.length >= MAX_NPC}
          usedIds={activeNpcs.map(n => n.master_npc_id).filter(v => v != null)}
          onPick={handlePickNpc}
          onClose={() => setShowNpcPicker(false)}
        />
      )}

      {/* Modal Pokédex — selección del master */}
      {showPokedex && (
        <MasterFieldPicker
          disabled={activePokemons.length >= MAX_POKEMON}
          usedIds={activePokemons.map(p => p.master_pokemon_id).filter(v => v != null)}
          onPick={handlePickPokemon}
          onClose={() => setShowPokedex(false)}
        />
      )}
    </div>
  )
}

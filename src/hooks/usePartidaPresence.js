import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_MASTER_MESSAGE = '¡Bienvenido a la partida entrenador!'

export function usePartidaPresence(partidaId, userInfo) {
  const [presentes, setPresentes]         = useState([])
  const [log,       setLog]               = useState([])
  const [masterMessage, setMasterMessage] = useState(DEFAULT_MASTER_MESSAGE)
  const [activePokemons, setActivePokemons] = useState([])
  const [lastAttack,    setLastAttack]    = useState(null)
  const [partyUpdatedAt, setPartyUpdatedAt] = useState(0)
  const [invocados, setInvocados] = useState({}) // personaje_id → id_personaje_pokemon invocado
  const [background, setBackground] = useState(null) // fondo del evento (url)
  const [eventActive, setEventActive] = useState(false) // evento desbloqueado
  const [eventFlashAt, setEventFlashAt] = useState(0)    // disparo del avatar central (5s)
  const [counters, setCounters] = useState({ up: 0, down: 0 }) // contadores del evento fire

  const channelRef  = useRef(null)
  const userInfoRef = useRef(userInfo)
  const messageRef  = useRef(DEFAULT_MASTER_MESSAGE)
  const pokemonRef  = useRef([])
  const backgroundRef = useRef(null)
  const eventActiveRef = useRef(false)
  const countersRef = useRef({ up: 0, down: 0 })
  const subscribedRef = useRef(false)

  userInfoRef.current = userInfo

  // Datos que se publican en la presencia (incluye el personaje activo)
  const buildTrack = () => {
    const u = userInfoRef.current || {}
    return {
      user_id:          u.user_id,
      user_name:        u.user_name,
      role:             u.role,
      avatar_face_url:  u.role === 'master' ? '/avatars/chuckface.png' : (u.avatar_face_url || null),
      personaje_id:     u.personaje_id ?? null,
      pokemon_invocado: u.pokemon_invocado ?? null,
    }
  }

  // Agrega una entrada a la actividad de la partida
  const pushLog = useCallback((text, role = 'master') => {
    setLog(prev => [...prev, { text, role, time: new Date().toISOString() }])
  }, [])

  // Registra el ataque en la actividad y dispara el efecto visual
  const applyAttack = useCallback((payload) => {
    if (!payload?.moveName) return
    // Si el Pokémon está oculto, los jugadores (no master) no ven su nombre
    const isMaster = userInfoRef.current?.role === 'master'
    const displayName = (payload.hidden && !isMaster) ? 'el pokemon' : payload.pokemonName
    pushLog(`${displayName} usó ${payload.moveName}`, 'master')
    setLastAttack({ ...payload, id: Date.now() })
  }, [pushLog])

  useEffect(() => {
    if (!partidaId || !userInfo?.user_id) return

    const channel = supabase.channel(`partida:${partidaId}`, {
      config: { presence: { key: String(userInfo.user_id) } },
    })
    channelRef.current = channel

    const addLog = (text, role) =>
      setLog(prev => [...prev, { text, role, time: new Date().toISOString() }])

    channel
      .on('presence', { event: 'sync' }, () => {
        setPresentes(Object.values(channel.presenceState()).flat())
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach(p => addLog(`${p.user_name} se unió a la partida`, p.role))
        // Si soy el master, reenvío el estado actual para los que recién entran
        if (userInfoRef.current?.role === 'master') {
          channel.send({ type: 'broadcast', event: 'master_message', payload: { text: messageRef.current } })
          channel.send({ type: 'broadcast', event: 'pokemon_update', payload: { pokemons: pokemonRef.current } })
          channel.send({ type: 'broadcast', event: 'background_update', payload: { background: backgroundRef.current } })
          channel.send({ type: 'broadcast', event: 'event_state', payload: { active: eventActiveRef.current } })
          channel.send({ type: 'broadcast', event: 'counters_update', payload: countersRef.current })
        }
        // Re-emito mi Pokémon invocado para los que recién entran
        const u = userInfoRef.current
        if (u?.personaje_id != null) {
          channel.send({ type: 'broadcast', event: 'invocado_update', payload: { personaje_id: u.personaje_id, pokemon_invocado: u.pokemon_invocado ?? null } })
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach(p => addLog(`${p.user_name} salió de la partida`, p.role))
      })
      .on('broadcast', { event: 'master_message' }, ({ payload }) => {
        if (payload?.text) {
          messageRef.current = payload.text
          setMasterMessage(payload.text)
        }
      })
      .on('broadcast', { event: 'pokemon_update' }, ({ payload }) => {
        const list = Array.isArray(payload?.pokemons) ? payload.pokemons : []
        pokemonRef.current = list
        setActivePokemons(list)
      })
      .on('broadcast', { event: 'attack' }, ({ payload }) => {
        applyAttack(payload)
      })
      .on('broadcast', { event: 'activity' }, ({ payload }) => {
        if (payload?.text) pushLog(payload.text, payload.role)
      })
      .on('broadcast', { event: 'party_update' }, () => {
        setPartyUpdatedAt(Date.now())
      })
      .on('broadcast', { event: 'invocado_update' }, ({ payload }) => {
        if (payload?.personaje_id != null) {
          setInvocados(prev => ({ ...prev, [String(payload.personaje_id)]: payload.pokemon_invocado ?? null }))
        }
      })
      .on('broadcast', { event: 'background_update' }, ({ payload }) => {
        backgroundRef.current = payload?.background ?? null
        setBackground(payload?.background ?? null)
      })
      .on('broadcast', { event: 'event_state' }, ({ payload }) => {
        eventActiveRef.current = !!payload?.active
        setEventActive(!!payload?.active)
      })
      .on('broadcast', { event: 'event_flash' }, () => {
        setEventFlashAt(Date.now())
      })
      .on('broadcast', { event: 'counters_update' }, ({ payload }) => {
        const c = { up: Number(payload?.up) || 0, down: Number(payload?.down) || 0 }
        countersRef.current = c
        setCounters(c)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true
          await channel.track(buildTrack())
        }
      })

    return () => { subscribedRef.current = false; supabase.removeChannel(channel); channelRef.current = null }
  }, [partidaId])

  // Re-publica la presencia cuando cambia el personaje activo (se resuelve después de entrar)
  useEffect(() => {
    if (subscribedRef.current && channelRef.current) {
      channelRef.current.track(buildTrack()).catch(() => {})
    }
  }, [userInfo?.personaje_id, userInfo?.pokemon_invocado])

  const sendMasterMessage = useCallback((text) => {
    const t = (text ?? '').trim()
    if (!t) return
    messageRef.current = t
    setMasterMessage(t)
    channelRef.current?.send({ type: 'broadcast', event: 'master_message', payload: { text: t } })
  }, [])

  const sendPokemons = useCallback((pokemons) => {
    const list = Array.isArray(pokemons) ? pokemons : []
    pokemonRef.current = list
    setActivePokemons(list)
    channelRef.current?.send({ type: 'broadcast', event: 'pokemon_update', payload: { pokemons: list } })
  }, [])

  const sendAttack = useCallback((payload) => {
    applyAttack(payload) // efecto/registro local inmediato (broadcast no se envía a sí mismo)
    channelRef.current?.send({ type: 'broadcast', event: 'attack', payload })
  }, [applyAttack])

  const sendActivity = useCallback((text, role = 'master') => {
    pushLog(text, role) // registro local inmediato
    channelRef.current?.send({ type: 'broadcast', event: 'activity', payload: { text, role } })
  }, [pushLog])

  // Avisa a los demás que cambió el estado de la party (para que re-consulten)
  const sendPartyUpdate = useCallback(() => {
    channelRef.current?.send({ type: 'broadcast', event: 'party_update', payload: {} })
  }, [])

  // Difunde el Pokémon invocado del jugador (id_personaje_pokemon o null)
  const sendInvocado = useCallback((personaje_id, pokemon_invocado) => {
    if (personaje_id == null) return
    setInvocados(prev => ({ ...prev, [String(personaje_id)]: pokemon_invocado ?? null })) // local inmediato
    channelRef.current?.send({ type: 'broadcast', event: 'invocado_update', payload: { personaje_id, pokemon_invocado: pokemon_invocado ?? null } })
  }, [])

  // Difunde el fondo del evento (url o null)
  const sendBackground = useCallback((url) => {
    backgroundRef.current = url ?? null
    setBackground(url ?? null)
    channelRef.current?.send({ type: 'broadcast', event: 'background_update', payload: { background: url ?? null } })
  }, [])

  // Activa/desactiva el estado de evento (persistente)
  const sendEventState = useCallback((active) => {
    eventActiveRef.current = !!active
    setEventActive(!!active)
    channelRef.current?.send({ type: 'broadcast', event: 'event_state', payload: { active: !!active } })
  }, [])

  // Dispara el avatar central de 5s en los trainers
  const sendEventFlash = useCallback(() => {
    setEventFlashAt(Date.now())
    channelRef.current?.send({ type: 'broadcast', event: 'event_flash', payload: {} })
  }, [])

  // Ajusta un contador del evento (up/down) y lo difunde
  const changeCounter = useCallback((key, delta) => {
    const cur = countersRef.current
    const next = { ...cur, [key]: (Number(cur[key]) || 0) + delta }
    countersRef.current = next
    setCounters(next)
    channelRef.current?.send({ type: 'broadcast', event: 'counters_update', payload: next })
  }, [])

  return { presentes, log, masterMessage, sendMasterMessage, activePokemons, sendPokemons, lastAttack, sendAttack, sendActivity, partyUpdatedAt, sendPartyUpdate, invocados, sendInvocado, background, sendBackground, eventActive, eventFlashAt, sendEventState, sendEventFlash, counters, changeCounter }
}

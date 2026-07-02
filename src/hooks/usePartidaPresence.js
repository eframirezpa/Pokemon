import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_MASTER_MESSAGE = '¡Bienvenido a la partida entrenador!'

export function usePartidaPresence(partidaId, userInfo) {
  const [presentes, setPresentes]         = useState([])
  const [log,       setLog]               = useState([])
  const [masterMessage, setMasterMessage] = useState(DEFAULT_MASTER_MESSAGE)
  const [activePokemons, setActivePokemons] = useState([])
  const [lastAttack,    setLastAttack]    = useState(null)

  const channelRef  = useRef(null)
  const userInfoRef = useRef(userInfo)
  const messageRef  = useRef(DEFAULT_MASTER_MESSAGE)
  const pokemonRef  = useRef([])

  userInfoRef.current = userInfo

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
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id:         userInfo.user_id,
            user_name:       userInfo.user_name,
            role:            userInfo.role,
            avatar_face_url: userInfo.role === 'master'
              ? '/avatars/chuckface.png'
              : (userInfo.avatar_face_url || null),
          })
        }
      })

    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [partidaId])

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

  return { presentes, log, masterMessage, sendMasterMessage, activePokemons, sendPokemons, lastAttack, sendAttack, sendActivity }
}

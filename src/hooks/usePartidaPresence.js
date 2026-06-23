import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_MASTER_MESSAGE = '¡Bienvenido a la partida entrenador!'

export function usePartidaPresence(partidaId, userInfo) {
  const [presentes, setPresentes]         = useState([])
  const [log,       setLog]               = useState([])
  const [masterMessage, setMasterMessage] = useState(DEFAULT_MASTER_MESSAGE)
  const [activePokemon, setActivePokemon] = useState(null)
  const [lastAttack,    setLastAttack]    = useState(null)

  const channelRef  = useRef(null)
  const userInfoRef = useRef(userInfo)
  const messageRef  = useRef(DEFAULT_MASTER_MESSAGE)
  const pokemonRef  = useRef(null)

  userInfoRef.current = userInfo

  // Agrega una entrada a la actividad de la partida
  const pushLog = useCallback((text, role = 'master') => {
    setLog(prev => [...prev, { text, role, time: new Date().toISOString() }])
  }, [])

  // Registra el ataque en la actividad y dispara el efecto visual
  const applyAttack = useCallback((payload) => {
    if (!payload?.moveName) return
    pushLog(`${payload.pokemonName} usó ${payload.moveName}`, 'master')
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
          channel.send({ type: 'broadcast', event: 'pokemon_update', payload: { pokemon: pokemonRef.current } })
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
        pokemonRef.current = payload?.pokemon ?? null
        setActivePokemon(payload?.pokemon ?? null)
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

  const sendPokemon = useCallback((pokemon) => {
    pokemonRef.current = pokemon
    setActivePokemon(pokemon)
    channelRef.current?.send({ type: 'broadcast', event: 'pokemon_update', payload: { pokemon } })
  }, [])

  const sendAttack = useCallback((payload) => {
    applyAttack(payload) // efecto/registro local inmediato (broadcast no se envía a sí mismo)
    channelRef.current?.send({ type: 'broadcast', event: 'attack', payload })
  }, [applyAttack])

  const sendActivity = useCallback((text, role = 'master') => {
    pushLog(text, role) // registro local inmediato
    channelRef.current?.send({ type: 'broadcast', event: 'activity', payload: { text, role } })
  }, [pushLog])

  return { presentes, log, masterMessage, sendMasterMessage, activePokemon, sendPokemon, lastAttack, sendAttack, sendActivity }
}

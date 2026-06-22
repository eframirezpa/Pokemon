import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_MASTER_MESSAGE = '¡Bienvenido a la partida entrenador!'

export function usePartidaPresence(partidaId, userInfo) {
  const [presentes, setPresentes]         = useState([])
  const [log,       setLog]               = useState([])
  const [masterMessage, setMasterMessage] = useState(DEFAULT_MASTER_MESSAGE)

  const channelRef  = useRef(null)
  const userInfoRef = useRef(userInfo)
  const messageRef  = useRef(DEFAULT_MASTER_MESSAGE)

  userInfoRef.current = userInfo

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
        // Si soy el master, reenvío el mensaje actual para los que recién entran
        if (userInfoRef.current?.role === 'master') {
          channel.send({
            type: 'broadcast',
            event: 'master_message',
            payload: { text: messageRef.current },
          })
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
    setMasterMessage(t) // actualización optimista local (broadcast no se envía a sí mismo)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'master_message',
      payload: { text: t },
    })
  }, [])

  return { presentes, log, masterMessage, sendMasterMessage }
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePartidaPresence(partidaId, userInfo) {
  const [presentes, setPresentes] = useState([])
  const [log,       setLog]       = useState([])

  useEffect(() => {
    if (!partidaId || !userInfo?.user_id) return

    const channel = supabase.channel(`partida:${partidaId}`, {
      config: { presence: { key: String(userInfo.user_id) } },
    })

    const addLog = (text, role) =>
      setLog(prev => [...prev, { text, role, time: new Date().toISOString() }])

    channel
      .on('presence', { event: 'sync' }, () => {
        setPresentes(Object.values(channel.presenceState()).flat())
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach(p => addLog(`${p.user_name} se unió a la partida`, p.role))
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach(p => addLog(`${p.user_name} salió de la partida`, p.role))
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

    return () => { supabase.removeChannel(channel) }
  }, [partidaId])

  return { presentes, log }
}

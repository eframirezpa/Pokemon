import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Hoja from './ui/Hoja'
import Boton from './ui/Boton'
import PokeballSpinner from './PokeballSpinner'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

// Extrae el nombre del archivo y lo sirve desde public/avatars/
const toUrl = (path) => {
  if (!path) return ''
  const filename = path.replace(/\\/g, '/').split('/').pop()
  return `/avatars/${filename}`
}

export default function AvatarSelector({ onClose }) {
  const { user, updateAvatar } = useAuth()
  const [avatars,  setAvatars]  = useState([])
  const [selected, setSelected] = useState(user?.avatar_id ?? null)
  const [saving,   setSaving]   = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    apiFetch('/avatar')
      .then(r => r.json())
      .then(d => setAvatars(Array.isArray(d) ? d : []))
      .catch(() => setAvatars([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (avatar) => {
    if (saving !== null) return
    setSaving(avatar.avatar_id)
    try {
      const res = await apiFetch('/usuarios/me/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_id: avatar.avatar_id }),
      })
      if (res.ok) {
        setSelected(avatar.avatar_id)
        updateAvatar(avatar.avatar_id, toUrl(avatar.avatar_sprite_face))
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <Hoja titulo="Elige tu avatar" onClose={onClose} ancho="sm:max-w-md"
      pie={<Boton tamano="lg" onClick={onClose}>Listo</Boton>}>
      <div className="grid grid-cols-4 gap-2.5 pt-1">
        {loading ? (
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-relleno animate-pulse" />
          ))
        ) : (
          avatars.map(avatar => {
            const elegido = selected === avatar.avatar_id
            return (
              <button key={avatar.avatar_id} type="button" onClick={() => handleSelect(avatar)}
                disabled={saving !== null} aria-pressed={elegido} aria-label={`Avatar ${avatar.avatar_id}`}
                className={`relative rounded-2xl overflow-hidden aspect-square bg-superficie transition-transform
                            ${elegido ? 'ring-[3px] ring-acento' : 'hover:scale-[1.04]'}`}>
                <img src={toUrl(avatar.avatar_sprite_face)} alt="" className="w-full h-full object-cover" />
                {elegido && (
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-acento text-white grid place-items-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                {saving === avatar.avatar_id && (
                  <span className="absolute inset-0 bg-black/40 grid place-items-center">
                    <PokeballSpinner size={20} className="text-white" />
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </Hoja>
  )
}

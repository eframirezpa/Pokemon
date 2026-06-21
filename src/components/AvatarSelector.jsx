import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">

        <div className="bg-gray-900 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-white font-bold text-sm">Elige tu avatar</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 grid grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto">
          {loading ? (
            Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
            ))
          ) : (
            avatars.map(avatar => (
              <button
                key={avatar.avatar_id}
                onClick={() => handleSelect(avatar)}
                disabled={saving !== null}
                className={`relative rounded-xl overflow-hidden border-2 aspect-square transition-all
                  ${selected === avatar.avatar_id
                    ? 'border-red-500 shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                  }`}
              >
                <img
                  src={toUrl(avatar.avatar_sprite_face)}
                  alt={`Avatar ${avatar.avatar_id}`}
                  className="w-full h-full object-cover bg-gray-100"
                />
                {selected === avatar.avatar_id && (
                  <div className="absolute inset-0 bg-red-500/10 flex items-end justify-end p-1">
                    <div className="bg-red-500 rounded-full p-0.5">
                      <Check size={10} className="text-white" />
                    </div>
                  </div>
                )}
                {saving === avatar.avatar_id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Listo
          </button>
        </div>

      </div>
    </div>
  )
}

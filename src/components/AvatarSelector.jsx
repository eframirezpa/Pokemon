import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { apiFetch } from '../api'
import { useAuth } from '../context/AuthContext'

export const avatarFaceUrl      = (id) => `/avatars/face${id}.png`
export const avatarCompleteUrl  = (id) => `/avatars/complete${id}.png`

const TOTAL_AVATARS = 14

export default function AvatarSelector({ onClose }) {
  const { user, updateAvatar } = useAuth()
  const [selected, setSelected] = useState(user?.avatar_id ?? null)
  const [saving,   setSaving]   = useState(null)

  const handleSelect = async (avatarId) => {
    if (saving !== null) return
    setSaving(avatarId)
    try {
      const res = await apiFetch('/usuarios/me/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ avatar_id: avatarId }),
      })
      if (res.ok) {
        setSelected(avatarId)
        updateAvatar(avatarId)
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
          {Array.from({ length: TOTAL_AVATARS }, (_, i) => i + 1).map(id => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              disabled={saving !== null}
              className={`relative rounded-xl overflow-hidden border-2 aspect-square transition-all
                ${selected === id
                  ? 'border-red-500 shadow-md scale-105'
                  : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                }`}
            >
              <img
                src={avatarFaceUrl(id)}
                alt={`Avatar ${id}`}
                className="w-full h-full object-cover bg-gray-100"
              />
              {selected === id && (
                <div className="absolute inset-0 bg-red-500/10 flex items-end justify-end p-1">
                  <div className="bg-red-500 rounded-full p-0.5">
                    <Check size={10} className="text-white" />
                  </div>
                </div>
              )}
              {saving === id && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          ))}
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

import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AvatarSelector, { avatarFaceUrl } from './AvatarSelector'

const ROLE_COLORS = {
  master:     'bg-red-600',
  trainer:    'bg-blue-600',
  espectador: 'bg-gray-500',
}

function PokeballIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      <header className="sticky top-0 z-20 bg-gray-900 shadow-md">
        <div className="flex items-center justify-between px-4 lg:px-8 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-white">
              <PokeballIcon />
            </div>
            <span className="font-bold text-white text-base">
              Pokemon <span className="text-red-400">DnD</span>
            </span>
          </button>

          {user && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                title="Cambiar avatar"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 border-2 border-gray-600 hover:border-red-500 transition-colors">
                  {user.avatar_id
                    ? <img src={avatarFaceUrl(user.avatar_id)} alt="avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User size={14} className="text-gray-300" /></div>
                  }
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-white text-xs font-medium leading-none">{user.user_name}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white ${ROLE_COLORS[user.role] ?? 'bg-gray-500'}`}>
                    {user.role}
                  </span>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs
                           px-2.5 py-1.5 rounded-lg hover:bg-gray-700/60 transition-all"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-400 text-center text-xs py-4">
        Creado por <span className="text-gray-200">Efrain Ramirez</span> &amp; <span className="text-gray-200">Gustavo Quintero</span>
      </footer>

      {showAvatarSelector && (
        <AvatarSelector onClose={() => setShowAvatarSelector(false)} />
      )}

    </div>
  )
}

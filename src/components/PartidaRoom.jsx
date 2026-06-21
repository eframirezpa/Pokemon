import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePartidaPresence } from '../hooks/usePartidaPresence'

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

function TrainerCard({ u }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shrink-0 bg-gray-700">
        {u.avatar_face_url
          ? <img src={u.avatar_face_url} alt={u.user_name} className="w-full h-full object-cover" />
          : null
        }
      </div>
      <div className="min-w-0">
        <p className="text-white text-sm font-semibold truncate">{u.user_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="text-[10px] text-green-400">Conectado</span>
        </div>
      </div>
    </div>
  )
}

export default function PartidaRoom({ children, roleLabel }) {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const location    = useLocation()
  const { user }    = useAuth()
  const logEndRef   = useRef(null)

  const nombre = location.state?.nombre || `Partida #${id}`

  const { presentes, log } = usePartidaPresence(id, user)

  const trainers = presentes.filter(u => u.role === 'trainer' || u.role === 'espectador')
  const master   = presentes.find(u => u.role === 'master')

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div>
          <p className="text-white font-semibold text-sm">{nombre}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">{roleLabel}</p>
        </div>
        <button
          onClick={() => navigate(ROLE_DASHBOARD[user?.role] ?? '/')}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300
                     hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-all"
        >
          <LogOut size={14} /> Salir
        </button>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — Trainers */}
        <div className="w-52 shrink-0 flex flex-col gap-2 p-4 bg-gray-800/50 border-r border-gray-700 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jugadores</p>
          {trainers.length === 0
            ? <p className="text-xs text-gray-600 italic">Sin jugadores conectados</p>
            : trainers.map(u => <TrainerCard key={u.user_id} u={u} />)
          }
        </div>

        {/* Center — content + activity log */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Role-specific content area */}
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>

          {/* Activity log */}
          <div className="h-40 shrink-0 border-t border-gray-700 bg-gray-800/60 flex flex-col">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 pt-2 pb-1">
              Actividad de la partida
            </p>
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
          </div>
        </div>

        {/* Right — Master */}
        <div className="w-48 shrink-0 flex flex-col items-center gap-3 p-4 bg-gray-800/50 border-l border-gray-700 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start mb-1">Master</p>
          {master ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="w-28 rounded-xl overflow-hidden border-2 border-red-500/40 bg-gray-800">
                <img src="/avatars/chuckcomplete.png" alt="Master" className="w-full object-cover" />
              </div>
              <p className="text-sm font-semibold text-white">{master.user_name}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-green-400">Conectado</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-30 w-full">
              <div className="w-28 h-40 rounded-xl bg-gray-700 border-2 border-gray-600" />
              <p className="text-xs text-gray-500">Sin conectar</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

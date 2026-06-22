import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { LogOut, ChevronLeft, ChevronDown, Users, Send } from 'lucide-react'
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

/* Banner superior del master — visible para trainer y espectador */
function MasterBanner({ nombre, message }) {
  return (
    <div className="shrink-0 px-4 pt-4">
      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-800 via-gray-800 to-slate-900
                      border border-gray-700 rounded-2xl p-3 shadow-lg">
        <img
          src="/avatars/chuckface.png"
          alt="Master"
          className="w-14 h-14 rounded-full border-2 border-amber-500/60 object-cover shrink-0 bg-gray-700"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1 truncate">
            Campaña: {nombre}
          </p>
          <div className="relative bg-gray-700/70 rounded-xl rounded-tl-sm px-3 py-2">
            <p className="text-sm text-gray-100 leading-snug">{message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Componente de envío de mensaje — visible solo para el master */
function MasterSendMessage({ onSend }) {
  const [text, setText] = useState('')
  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }
  return (
    <div className="shrink-0 px-4 pt-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 shadow-lg">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enviar mensaje</p>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Escribe un mensaje para los jugadores..."
            className="flex-1 bg-gray-700 text-white text-sm rounded-full px-4 py-2.5
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="w-11 h-11 shrink-0 rounded-full bg-green-500 hover:bg-green-600
                       disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center
                       text-white transition-all shadow-md"
            title="Enviar"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function TrainerCard({ u }) {
  const initials = (u.user_name ?? '?').slice(0, 2).toUpperCase()
  return (
    <div className="flex flex-col items-center gap-1 bg-white/10 rounded-xl p-1.5">
      <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 bg-gray-700 shrink-0">
        {u.avatar_face_url
          ? <img src={u.avatar_face_url} alt="" className="w-full h-full object-cover" />
          : null
        }
      </div>
      <div className="flex items-center gap-1">
        <span className="text-white text-xs font-bold leading-none">{initials}</span>
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0" />
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [logOpen, setLogOpen]     = useState(true)

  const isMaster = user?.role === 'master'

  const { presentes, log, masterMessage, sendMasterMessage } = usePartidaPresence(id, user)

  const trainers = presentes.filter(u => u.role === 'trainer' || u.role === 'espectador')

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
      <div className="relative flex flex-1 overflow-hidden">

        {/* Botón flotante — abre el panel de jugadores cuando está oculto */}
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute bottom-3 left-3 z-20 flex items-center justify-center w-10 h-10
                       rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg
                       border border-gray-600 transition-all"
            title="Mostrar jugadores"
          >
            <Users size={18} />
          </button>
        )}

        {/* Left — Trainers */}
        {panelOpen && (
          <div className="w-16 shrink-0 flex flex-col bg-gray-800/50 border-r border-gray-700 overflow-hidden">
            {/* Header con toggle */}
            <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
              <button
                onClick={() => setPanelOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Ocultar jugadores"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Lista de jugadores */}
            <div className="flex flex-col gap-2 px-1.5 pb-4 overflow-y-auto">
              {trainers.length === 0
                ? <p className="text-[10px] text-gray-600 italic text-center">Sin jugadores</p>
                : trainers.map(u => <TrainerCard key={u.user_id} u={u} />)
              }
            </div>
          </div>
        )}

        {/* Center — master panel + content + activity log */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Panel del master arriba */}
          {isMaster
            ? <MasterSendMessage onSend={sendMasterMessage} />
            : <MasterBanner nombre={nombre} message={masterMessage} />
          }

          {/* Role-specific content area */}
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>

          {/* Activity log */}
          <div className={`shrink-0 border-t border-gray-700 bg-gray-800/60 flex flex-col transition-all duration-300 ${logOpen ? 'h-40' : 'h-9'}`}>
            <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Actividad de la partida
              </p>
              <button
                onClick={() => setLogOpen(o => !o)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform duration-300 ${logOpen ? '' : 'rotate-180'}`} />
              </button>
            </div>
            {logOpen && (
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
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, User, PanelLeft, X, Home, Gamepad2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AvatarSelector from './AvatarSelector'
import { SECCIONES, enlaceActivo } from '../lib/navegacion'

const ROLES = { master: 'Master', trainer: 'Entrenador', espectador: 'Espectador' }

// Logo: pokébola blanca en un cuadro morado redondeado
function Logo({ tamano = 28 }) {
  return (
    <span className="rounded-lg bg-acento text-white grid place-items-center shrink-0"
      style={{ width: tamano, height: tamano }} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        style={{ width: tamano * 0.62, height: tamano * 0.62 }}>
        <circle cx="12" cy="12" r="9" /><path d="M3 12h6M15 12h6" /><circle cx="12" cy="12" r="3" />
      </svg>
    </span>
  )
}

function Avatar({ user, tamano = 30 }) {
  const src = user.role === 'master' ? '/avatars/chuckface.png' : user.avatar_face_url
  return (
    <span className="rounded-full overflow-hidden bg-relleno-2 grid place-items-center shrink-0"
      style={{ width: tamano, height: tamano }}>
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : <User size={tamano * 0.5} className="text-texto-2" />}
    </span>
  )
}

function EnlaceNav({ to, label, Icon, activo, onNavegar }) {
  return (
    <Link to={to} onClick={onNavegar} aria-current={activo ? 'page' : undefined}
      className={`h-8 px-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
        activo ? 'bg-acento text-white font-semibold' : 'text-texto hover:bg-relleno'}`}>
      <Icon size={16} className={activo ? 'text-white' : 'text-tinte'} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  )
}

/* Barra lateral: marca, secciones de consulta, usuario y créditos. La misma
   sirve fija en escritorio y como cajón en el celular. */
function BarraLateral({ user, onNavegar, onCerrar = null, onAvatar, onSalir }) {
  const location = useLocation()
  const grupos = [
    { titulo: null, enlaces: [{ to: '/', label: 'Inicio', Icon: Home }] },
    ...(user ? [{ titulo: 'Jugar', enlaces: [{ to: `/dashboard/${user.role}`, label: 'Mis partidas', Icon: Gamepad2 }] }] : []),
    ...SECCIONES,
  ]

  return (
    <nav aria-label="Secciones" className="h-full w-full flex flex-col gap-4 px-2.5 pt-4 pb-3 overflow-y-auto">
      <div className="flex items-center gap-2.5 px-2">
        <Link to="/" onClick={onNavegar} className="flex items-center gap-2.5 flex-1 min-w-0">
          <Logo />
          <span className="text-[17px] font-bold tracking-[-.02em] truncate">Pokemon DnD</span>
        </Link>
        {onCerrar && (
          <button type="button" onClick={onCerrar} aria-label="Cerrar el menú"
            className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2">
            <X size={16} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {grupos.map((g, i) => (
        <div key={g.titulo ?? i} className="flex flex-col gap-px">
          {g.titulo && <small className="text-[11px] font-semibold text-texto-2 px-2 pb-1">{g.titulo}</small>}
          {g.enlaces.map(e => (
            <EnlaceNav key={e.to} {...e} onNavegar={onNavegar}
              activo={e.to === '/' ? location.pathname === '/' : enlaceActivo(e.to, location)} />
          ))}
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {user && (
          <div className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-relleno">
            <button type="button" onClick={onAvatar} disabled={user.role === 'master'}
              title={user.role !== 'master' ? 'Cambiar avatar' : undefined}
              className="flex items-center gap-2 flex-1 min-w-0 text-left disabled:cursor-default">
              <Avatar user={user} />
              <span className="min-w-0 leading-tight">
                <span className="block text-[13px] font-semibold truncate">{user.user_name}</span>
                <small className="block text-[11px] text-texto-2">{ROLES[user.role] ?? user.role}</small>
              </span>
            </button>
            <button type="button" onClick={onSalir} aria-label="Cerrar sesión" title="Cerrar sesión"
              className="w-[30px] h-[30px] rounded-full grid place-items-center text-texto-2 hover:bg-relleno-2 hover:text-peligro shrink-0">
              <LogOut size={15} />
            </button>
          </div>
        )}
        <p className="text-[11px] leading-snug text-texto-2 px-2">
          Creado por <span className="text-texto">Efrain Ramirez</span> &amp; <span className="text-texto">Gustavo Quintero</span>
        </p>
      </div>
    </nav>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [cajon, setCajon] = useState(false)

  const handleLogout = () => {
    setCajon(false)
    logout()
    navigate('/')
  }
  const abrirAvatar = () => {
    if (user?.role === 'master') return
    setCajon(false)
    setShowAvatarSelector(true)
  }

  const props = { user, onAvatar: abrirAvatar, onSalir: handleLogout }

  return (
    <div className="min-h-dvh bg-fondo text-texto lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">

      {/* Escritorio: barra lateral fija */}
      <aside className="hidden lg:flex sticky top-0 h-dvh self-start bg-lateral border-r border-separador">
        <BarraLateral {...props} />
      </aside>

      {/* Celular: barra superior con el botón del menú */}
      <div className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center gap-3
                      bg-fondo/85 backdrop-blur-xl backdrop-saturate-150 border-b border-separador">
        <button type="button" onClick={() => setCajon(true)} aria-label="Abrir el menú" aria-expanded={cajon}
          className="w-9 h-9 rounded-full bg-relleno grid place-items-center text-tinte">
          <PanelLeft size={18} />
        </button>
        <Link to="/" className="flex-1 min-w-0 flex items-center gap-2">
          <Logo tamano={24} />
          <span className="text-[15px] font-bold tracking-[-.02em] truncate">Pokemon DnD</span>
        </Link>
        {user && (
          <button type="button" onClick={() => setCajon(true)} aria-label="Mi cuenta"
            className="rounded-full ring-1 ring-separador">
            <Avatar user={user} tamano={34} />
          </button>
        )}
      </div>

      {cajon && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 animate-velo"
          onClick={e => { if (e.target === e.currentTarget) setCajon(false) }}>
          <div className="animate-cajon absolute left-0 top-0 bottom-0 w-[286px] max-w-[85vw]
                          bg-lateral rounded-r-hoja shadow-hoja overflow-hidden">
            <BarraLateral {...props} onNavegar={() => setCajon(false)} onCerrar={() => setCajon(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0">
        <Outlet />
      </main>

      {showAvatarSelector && (
        <AvatarSelector onClose={() => setShowAvatarSelector(false)} />
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import Hoja from './ui/Hoja'
import Boton from './ui/Boton'

const ROLE_REDIRECT = {
  master:     '/dashboard/master',
  trainer:    '/dashboard/trainer',
  espectador: '/dashboard/espectador',
}

// Ventana de acceso: logo, los dos campos en una lista agrupada y el botón
// morado. Escape, el velo y "Cancelar" la cierran (Escape lo maneja la Hoja).
export default function LoginModal({ onClose, aviso = null }) {
  const { login }   = useAuth()
  const navigate    = useNavigate()

  const [userName, setUserName]     = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ user_name: userName, user_password: password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return }
      // await: login busca el sprite personal antes de guardar al usuario, y
      // navegar antes de eso mostraría un instante el avatar del catálogo
      await login(data)
      onClose()
      navigate(ROLE_REDIRECT[data.user.role] ?? '/')
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const campo = 'flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-texto placeholder:text-texto-2'

  return (
    <Hoja onClose={onClose} ancho="sm:max-w-[380px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 pt-3 sm:pt-5">
        <span className="self-center w-[52px] h-[52px] rounded-[14px] bg-acento text-white grid place-items-center" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[30px] h-[30px]">
            <circle cx="12" cy="12" r="9" /><path d="M3 12h6M15 12h6" /><circle cx="12" cy="12" r="3" />
          </svg>
        </span>
        <h2 className="text-[22px] font-bold tracking-[-.02em] text-center">Iniciar sesión</h2>

        <div className="bg-superficie rounded-grupo overflow-hidden divide-y divide-separador">
          <label className="flex items-center gap-3 min-h-[46px] px-4">
            <span className="w-[92px] shrink-0 text-[15px]">Usuario</span>
            <input type="text" value={userName} onChange={e => setUserName(e.target.value)}
              placeholder="Tu usuario" autoFocus required autoComplete="username" className={campo} />
          </label>
          <label className="flex items-center gap-3 min-h-[46px] px-4">
            <span className="w-[92px] shrink-0 text-[15px]">Contraseña</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Tu contraseña" required autoComplete="current-password" className={campo} />
          </label>
        </div>

        {/* Motivo por el que se abrió solo (p. ej. la sesión venció). Cede el
            sitio en cuanto hay un error real del formulario. */}
        {aviso && !error && (
          <p className="text-[13px] text-aviso bg-aviso/10 rounded-xl px-3.5 py-2.5">{aviso}</p>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-peligro bg-peligro/10 rounded-xl px-3.5 py-2.5">{error}</p>
        )}

        <Boton type="submit" tamano="lg" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Boton>
        <Boton variante="plano" onClick={onClose} className="h-9">Cancelar</Boton>
      </form>
    </Hoja>
  )
}

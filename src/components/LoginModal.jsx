import { useEffect, useRef } from 'react'
import { X, User, Lock, LogIn } from 'lucide-react'

export default function LoginModal({ onClose }) {
  const backdropRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <LogIn size={16} className="text-white" />
            </div>
            <h2 className="text-white font-bold text-lg">Iniciar Sesión</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Usuario</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ingresa tu usuario"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent
                           bg-gray-50 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent
                           bg-gray-50 placeholder-gray-400"
              />
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white
                       py-2.5 rounded-lg font-medium text-sm transition-colors mt-2"
          >
            Ingresar
          </button>
        </div>
      </div>
    </div>
  )
}

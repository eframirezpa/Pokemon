import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Ventana del sistema de diseño: centrada en escritorio y hoja inferior en el
// celular (sube desde abajo, con el tirador gris arriba).
//
//   <Hoja titulo="Iniciar sesión" onClose={cerrar}>…</Hoja>
//
//   titulo     — cabecera con el botón de cerrar; sin título, solo el tirador
//   onClose    — tocar el velo, la X o Escape la cierran (si se pasa)
//   ancho      — clase de ancho máximo en escritorio (max-w-lg por defecto)
//   alto       — clase de alto máximo (85dvh por defecto)
//   pie        — barra fija abajo (botones)
//   sinRelleno — el contenido va pegado a los bordes (listas largas)
//   z          — capa (z-50 por defecto)
export default function Hoja({ titulo = null, onClose = null, ancho = 'sm:max-w-lg', alto = 'max-h-[85dvh]',
                               pie = null, sinRelleno = false, z = 'z-50', className = '', children }) {
  const cerrarRef = useRef(onClose)
  useEffect(() => { cerrarRef.current = onClose })

  useEffect(() => {
    const alTeclado = (e) => { if (e.key === 'Escape') cerrarRef.current?.() }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [])

  return (
    <div className={`fixed inset-0 ${z} flex items-end sm:items-center justify-center sm:p-4 bg-black/40 animate-velo`}
      onClick={e => { if (onClose && e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined}
        className={`animate-hoja w-full ${ancho} ${alto} flex flex-col overflow-hidden bg-fondo text-texto
                    rounded-t-hoja sm:rounded-hoja shadow-hoja ${className}`}>
        {/* Tirador: solo en el celular */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
          <span className="w-9 h-[5px] rounded-full bg-texto-2/40" />
        </div>
        {titulo != null && (
          <div className="flex items-center gap-3 px-5 pt-2 sm:pt-4 pb-2 shrink-0">
            <h2 className="flex-1 min-w-0 text-[17px] font-bold tracking-[-.02em] truncate">{titulo}</h2>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Cerrar"
                className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2 shrink-0">
                <X size={16} strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}
        <div className={`flex-1 min-h-0 overflow-y-auto ${sinRelleno ? '' : 'px-5 pb-5 pt-1'}`}>
          {children}
        </div>
        {pie && <div className="shrink-0 px-5 py-3 border-t border-separador bg-fondo">{pie}</div>}
      </div>
    </div>
  )
}

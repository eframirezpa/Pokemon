import PokeballSpinner from './PokeballSpinner'

// Cortina de carga: la pokébola girando sobre lo que ya haya en pantalla.
//
// Se usa cuando la ventana que viene todavía no tiene sus datos, para no
// enseñarla vacía ni dejar un hueco mientras responde el servidor. Debajo va el
// nombre de lo que se está trayendo, que el usuario sepa qué está esperando.
//
// Tapa los clics a propósito: mientras carga no debería poder pedirse lo mismo
// dos veces. Si se pasa onClose, el fondo deja salir — así una petición que se
// quede colgada no atrapa al usuario.
export default function LoadingOverlay({ label, onClose = null, z = 'z-[65]' }) {
  return (
    <div className={`fixed inset-0 ${z} flex items-center justify-center p-4`}
      style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (onClose && e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl px-6 py-5 shadow-2xl flex flex-col items-center gap-2">
        <PokeballSpinner size={38} className="text-red-500" />
        {label && (
          <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">{label}</p>
        )}
      </div>
    </div>
  )
}

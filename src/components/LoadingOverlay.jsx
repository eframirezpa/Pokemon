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
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={e => { if (onClose && e.target === e.currentTarget) onClose() }}>
      {/* Indicador tipo HUD: cristal oscuro, se lee igual sobre consulta y sala */}
      <div className="rounded-[20px] px-6 py-5 flex flex-col items-center gap-2.5 text-white
                   bg-[rgba(28,28,30,.82)] backdrop-blur-2xl backdrop-saturate-150 border border-white/10 shadow-hoja">
        <PokeballSpinner size={38} className="text-[#D9A1FF]" />
        {label && (
          <p className="text-[13px] font-semibold text-white/85">{label}</p>
        )}
      </div>
    </div>
  )
}

import { Info, X } from 'lucide-react'

/**
 * Aura del punto de inspiración: un resplandor dorado detrás del avatar.
 *
 * Va como hermano ANTERIOR del avatar dentro de un contenedor `relative`, para
 * quedar detrás sin necesidad de z-index: los dos son "position" con el mismo
 * nivel de pila (z-index:auto), así que entre ellos manda el orden del DOM, y
 * el avatar -que va después- pinta encima solo. Un z-index negativo aquí se
 * probó y se escapa al contexto de apilamiento del ANCESTRO más cercano que
 * cree uno propio -normalmente la raíz del documento-, así que el aura
 * terminaba pintándose detrás de media pantalla en vez de solo detrás del
 * avatar. `size` es el lado del avatar; el aura se dibuja más grande para que
 * sobresalga por los bordes.
 */
export function AuraInspirado({ size }) {
  const auraSize = Math.round(size * 1.7)
  return (
    <span aria-hidden="true"
      className="absolute rounded-full animate-aura-inspirado pointer-events-none"
      style={{
        width: auraSize, height: auraSize,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        // El degradado ya se difumina solo hacia afuera; un filter:blur()
        // encima no aportaba nada visible y en cambio rompía el pintado en
        // Chromium sin GPU (quedaba invisible o mal ubicado).
        background: 'radial-gradient(circle, rgba(250,204,21,0.65) 0%, rgba(250,204,21,0.28) 45%, rgba(250,204,21,0) 72%)',
      }} />
  )
}

/**
 * El signo de información que abre el aviso.
 *
 * `overlay` (por defecto) lo flota encima de un avatar: necesita un ancestro
 * `relative` y un contenedor ya del tamaño del avatar. Con `overlay={false}`
 * es un botón normal, para meterlo en una fila junto a otros -como el de la
 * fórmula del panel de combate-, sin posicionarse por su cuenta.
 */
export function InspiradoInfoButton({ size, onClick, overlay = true }) {
  return (
    <button onClick={onClick} title="Estás inspirado"
      className={`${overlay ? 'absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10' : 'shrink-0'}
                 flex items-center justify-center rounded-full bg-amber-500 text-gray-900
                 border border-amber-300 shadow hover:bg-amber-400 transition-colors`}
      style={{ width: size, height: size }}>
      <Info size={Math.round(size * 0.68)} strokeWidth={3} />
    </button>
  )
}

/** El aviso al pulsar el signo de información. */
export function InspiradoInfoPopup({ onClose }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-900 border border-amber-500/40 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-amber-300 text-sm">¡Estás Inspirado!</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-200">Habla con el DM para usar tu punto de inspiración.</p>
        </div>
      </div>
    </div>
  )
}

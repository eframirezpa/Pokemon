import { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Maximize2, Globe } from 'lucide-react'

const MIN_ZOOM = 1
const MAX_ZOOM = 6
const STEP     = 0.4

/* Mapa de la región: imagen con zoom (botones / rueda) y desplazamiento arrastrando */
export default function MapaModal({ src = '/mapas/all.jpeg', title = 'Mapa', onClose }) {
  const [zoom, setZoom] = useState(1)
  const [pos, setPos]   = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)   // { x, y, px, py } punto de inicio del arrastre
  const boxRef = useRef(null)

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

  // Al alejarse hasta el mínimo, la imagen vuelve a quedar centrada
  const applyZoom = (next) => {
    const z = clamp(next, MIN_ZOOM, MAX_ZOOM)
    setZoom(z)
    if (z === MIN_ZOOM) setPos({ x: 0, y: 0 })
  }

  const reset = () => { setZoom(1); setPos({ x: 0, y: 0 }) }

  const onWheel = (e) => {
    e.preventDefault()
    applyZoom(zoom + (e.deltaY < 0 ? STEP : -STEP))
  }

  const startDrag = (x, y) => { drag.current = { x, y, px: pos.x, py: pos.y }; setDragging(true) }
  const moveDrag  = (x, y) => {
    if (!drag.current) return
    setPos({ x: drag.current.px + (x - drag.current.x), y: drag.current.py + (y - drag.current.y) })
  }
  const endDrag = () => { drag.current = null; setDragging(false) }

  // La rueda necesita listener no pasivo para poder cancelar el scroll de la página
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const handler = (e) => { e.preventDefault() }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Globe size={18} className="text-amber-400 shrink-0" />
            <h3 className="font-bold text-white text-sm truncate">{title}</h3>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 shrink-0">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => applyZoom(zoom - STEP)} disabled={zoom <= MIN_ZOOM}
              className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed" title="Alejar">
              <ZoomOut size={17} />
            </button>
            <button onClick={() => applyZoom(zoom + STEP)} disabled={zoom >= MAX_ZOOM}
              className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed" title="Acercar">
              <ZoomIn size={17} />
            </button>
            <button onClick={reset} className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800" title="Ajustar a la ventana">
              <Maximize2 size={17} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 ml-1" title="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          ref={boxRef}
          className={`flex-1 overflow-hidden bg-black/40 flex items-center justify-center select-none ${
            zoom > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
          onWheel={onWheel}
          onMouseDown={e => { if (zoom > 1) startDrag(e.clientX, e.clientY) }}
          onMouseMove={e => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={e => { if (zoom > 1 && e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e => { if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={endDrag}
          onDoubleClick={() => applyZoom(zoom + STEP)}
        >
          <img
            src={src}
            alt={title}
            draggable={false}
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
              transition: dragging ? 'none' : 'transform 120ms ease-out',
            }}
          />
        </div>

        <div className="px-4 py-2 border-t border-gray-700 shrink-0">
          <p className="text-[10px] text-gray-500">Rueda del mouse o doble clic para acercar · arrastra para desplazarte</p>
        </div>
      </div>
    </div>
  )
}

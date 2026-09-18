import { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, Maximize2, Globe, MapPin, Trash2 } from 'lucide-react'

const MIN_ZOOM = 1
const MAX_ZOOM = 6
const STEP     = 0.4
// Cuánto puede moverse el puntero antes de que un clic cuente como arrastre.
// Sin esto, desplazar el mapa plantaría el pin al soltar.
const UMBRAL_ARRASTRE = 4

/* Marca de la party. Se ancla por la PUNTA: el contenedor va en la coordenada
   exacta y el icono se desplaza hacia arriba desde ahí. El contra-escalado
   (1/zoom) lo mantiene del mismo tamaño en pantalla, porque si escalara con el
   mapa al 600% taparía media región. */
function PinParty({ x, y, label, zoom, editable }) {
  return (
    <div className="absolute pointer-events-none" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="flex flex-col items-center"
        style={{ transform: `translate(-50%, -100%) scale(${1 / zoom})`, transformOrigin: 'bottom center' }}>
        {label && (
          <span className="mb-0.5 max-w-[160px] truncate rounded-md bg-gray-900/85 px-1.5 py-0.5
                           text-[10px] font-bold text-red-200 border border-red-500/40">
            {label}
          </span>
        )}
        {/* 60% más chico en mobile (18px de los 45px de escritorio): a ese tamaño
            de pantalla el pin tapaba demasiado mapa. */}
        <MapPin strokeWidth={2.5}
          className={`w-[18px] h-[18px] sm:w-[45px] sm:h-[45px] text-red-500 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] ${editable ? 'animate-pulse' : ''}`}
          fill="rgba(239,68,68,0.35)" />
      </div>
    </div>
  )
}

/**
 * Mapa de la región: imagen con zoom (botones / rueda) y desplazamiento arrastrando.
 *
 * Con `editable` (el máster) un clic fija o mueve el pin de la party. Las
 * coordenadas viajan en PORCENTAJE de la imagen, no en píxeles: así valen igual
 * en cualquier pantalla y a cualquier zoom, que es lo que permite guardarlas y
 * que el resto de la mesa las vea igual.
 */
export default function MapaModal({
  src = '/mapas/all.jpeg', title = 'Mapa', onClose,
  pin = null, editable = false, onPinChange = null,
}) {
  const [zoom, setZoom] = useState(1)
  const [pos, setPos]   = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef(null)   // { x, y, px, py } punto de inicio del arrastre
  const movido = useRef(false) // ¿el puntero se movió lo bastante para ser arrastre?
  const boxRef = useRef(null)
  const lienzoRef = useRef(null)
  const [editandoLabel, setEditandoLabel] = useState(false)
  const [labelBorrador, setLabelBorrador] = useState('')
  const [natural, setNatural] = useState(null)      // tamaño propio de la imagen
  const [caja, setCaja] = useState({ w: 0, h: 0 })  // espacio disponible

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

  // Mide el hueco donde cabe el mapa, y lo vuelve a medir si cambia la ventana
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const medir = () => setCaja({ w: el.clientWidth, h: el.clientHeight })
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* Rectángulo EXACTO que ocupa la imagen dentro del hueco, calculado a mano en
     vez de dejárselo a object-contain.
     Con object-contain el elemento y el dibujo no miden lo mismo -el elemento
     se queda con el alto del hueco y la imagen se encoge dentro-, así que los
     porcentajes del pin se medían sobre una caja más alta que el mapa y la
     marca se iba en vertical: un clic al 75% se guardaba como 90%. Con la caja
     ajustada a la proporción real, el porcentaje y la imagen coinciden. */
  const lienzo = (() => {
    if (!natural?.w || !natural?.h || !caja.w || !caja.h) return null
    const proporcion = natural.w / natural.h
    return caja.w / caja.h > proporcion
      ? { w: Math.round(caja.h * proporcion), h: caja.h }
      : { w: caja.w, h: Math.round(caja.w / proporcion) }
  })()

  /* La imagen puede venir de caché y estar lista antes del onLoad, de ahí que se
     mida también al montarla. Solo se guarda si CAMBIÓ: como el ref es una
     función nueva en cada render, React lo reasigna y volvería a medir, y
     devolver un objeto nuevo cada vez encadenaba renders hasta reventar. */
  const medirImagen = (img) => {
    if (!img?.naturalWidth) return
    setNatural(prev => (prev && prev.w === img.naturalWidth && prev.h === img.naturalHeight)
      ? prev
      : { w: img.naturalWidth, h: img.naturalHeight })
  }

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

  // `movido` se limpia en CADA pulsación, no solo cuando se puede arrastrar: al
  // 100% no hay arrastre, y si no se reiniciara aquí seguiría marcado de un
  // arrastre anterior con zoom y se comería el siguiente clic.
  const pulsar = (x, y) => {
    movido.current = false
    if (zoom > 1) { drag.current = { x, y, px: pos.x, py: pos.y }; setDragging(true) }
  }
  const moveDrag  = (x, y) => {
    if (!drag.current) return
    const dx = x - drag.current.x, dy = y - drag.current.y
    if (Math.abs(dx) + Math.abs(dy) > UMBRAL_ARRASTRE) movido.current = true
    setPos({ x: drag.current.px + dx, y: drag.current.py + dy })
  }
  const endDrag = () => { drag.current = null; setDragging(false) }

  /* Clic sobre el mapa → coordenada en % de la imagen. getBoundingClientRect ya
     viene con la transformación aplicada, así que la cuenta sale bien a
     cualquier zoom y desplazamiento sin deshacerlos a mano. */
  const clicEnMapa = (e) => {
    if (!editable || !onPinChange || movido.current) return
    const rect = lienzoRef.current?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
    onPinChange({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), label: pin?.label ?? null })
  }

  const guardarLabel = () => {
    setEditandoLabel(false)
    if (!pin || !onPinChange) return
    const texto = labelBorrador.trim()
    if ((pin.label ?? '') === texto) return
    onPinChange({ ...pin, label: texto || null })
  }

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
            {editable && pin && (
              <button onClick={() => onPinChange?.(null)}
                className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-red-400" title="Quitar el pin">
                <Trash2 size={17} />
              </button>
            )}
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
            dragging ? 'cursor-grabbing' : editable ? 'cursor-crosshair' : zoom > 1 ? 'cursor-grab' : 'cursor-default'}`}
          onWheel={onWheel}
          onMouseDown={e => pulsar(e.clientX, e.clientY)}
          onMouseMove={e => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={e => { if (e.touches[0]) pulsar(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchMove={e => { if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY) }}
          onTouchEnd={endDrag}
          onDoubleClick={() => applyZoom(zoom + STEP)}
        >
          {/* El pin vive DENTRO del elemento transformado, junto a la imagen: así
              el zoom y el desplazamiento lo arrastran con el terreno en vez de
              dejarlo clavado a la pantalla. */}
          <div
            ref={lienzoRef}
            className="relative max-w-full max-h-full"
            style={{
              width:  lienzo?.w,
              height: lienzo?.h,
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
              transition: dragging ? 'none' : 'transform 120ms ease-out',
            }}
            onClick={clicEnMapa}
          >
            <img
              ref={medirImagen}
              src={src}
              alt={title}
              draggable={false}
              onLoad={e => medirImagen(e.currentTarget)}
              className="block w-full h-full max-w-full max-h-full object-contain"
            />
            {pin && <PinParty x={pin.x} y={pin.y} label={pin.label} zoom={zoom} editable={editable} />}
          </div>
        </div>

        {/* Alto fijo: el botón del nombre solo aparece cuando hay pin, y sin
            esto el pie crecía al poner el primero, encogiendo el mapa de golpe. */}
        <div className="px-4 py-2 border-t border-gray-700 shrink-0 flex items-center justify-between gap-3 min-h-11">
          <p className="text-[10px] text-gray-500 min-w-0 truncate">
            {editable
              ? 'Clic en el mapa para fijar o mover el pin de la party · rueda o doble clic para acercar · arrastra para desplazarte'
              : 'Rueda del mouse o doble clic para acercar · arrastra para desplazarte'}
          </p>
          {/* El nombre del sitio es opcional: el pin solo, sin texto, ya dice
              dónde está la party. */}
          {editable && pin && (
            editandoLabel ? (
              <input autoFocus value={labelBorrador} maxLength={40}
                onChange={e => setLabelBorrador(e.target.value)}
                onBlur={guardarLabel}
                onKeyDown={e => { if (e.key === 'Enter') guardarLabel(); if (e.key === 'Escape') setEditandoLabel(false) }}
                placeholder="Nombre del sitio"
                className="shrink-0 w-44 px-2 py-1 text-xs text-white bg-gray-800 border border-gray-600 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-amber-500" />
            ) : (
              <button onClick={() => { setLabelBorrador(pin.label || ''); setEditandoLabel(true) }}
                className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200
                           bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 transition-colors">
                <MapPin size={12} /> {pin.label || 'Ponerle nombre'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

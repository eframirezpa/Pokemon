import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'

// Color por terreno; el que no esté aquí cae en gris. Solo es visual.
const COLORES = {
  coastal: '#38bdf8', coast: '#38bdf8', swamp: '#4d7c0f', forest: '#15803d',
  arctic: '#7dd3fc', desert: '#d97706', grassland: '#65a30d', hill: '#a16207',
  mountain: '#78716c', cave: '#57534e', tundra: '#94a3b8', underwater: '#1d4ed8',
}
const colorTerreno = (t) => COLORES[String(t || '').toLowerCase()] || '#6b7280'

function TerrenoPopup({ terreno, onClose }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-[40rem] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: colorTerreno(terreno) }}>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colorTerreno(terreno) }} /> Terreno: {terreno}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <p className="px-4 py-3 text-xs text-gray-300 leading-relaxed">
          Está en terreno <span className="font-bold text-white">{terreno}</span>. Los bonos y
          debilidades que aplique el terreno los define el DM en la narrativa.
        </p>
      </div>
    </div>
  )
}

/**
 * Óvalo bajo el icono de un ser vivo con el terreno en el que está y un ⓘ que
 * abre su descripción. `width` es el ancho del avatar; con el terreno vacío no
 * pinta nada. Con espacio suficiente incluye el nombre.
 */
export default function TerrenoPiso({ terreno, width = 44, reservar = false }) {
  const [abierto, setAbierto] = useState(false)
  // reservar: deja el hueco vacío para que dos iconos lado a lado sigan alineados
  // cuando solo uno tiene terreno.
  if (!terreno) return reservar ? <span aria-hidden style={{ height: Math.max(9, Math.round(width * 0.24)) }} /> : null
  const color = colorTerreno(terreno)
  const alto = Math.max(9, Math.round(width * 0.24))
  const icono = Math.max(6, Math.round(alto * 0.72))
  const conNombre = width >= 60
  return (
    <>
      <span className="relative inline-flex shrink-0">
      {/* Luz que sube desde el borde del óvalo: franjas verticales que se
          deslizan de lado para dar la impresión de que el terreno gira, con
          un degradado que las apaga hacia arriba. No captura clics. */}
      <span aria-hidden className="absolute left-0 bottom-1/2 pointer-events-none animate-terreno-giro"
        style={{
          width, height: Math.round(width * 0.49), '--tile': `${Math.max(6, Math.round(width * 0.2))}px`,
          backgroundImage: `repeating-linear-gradient(90deg, ${color} 0px, ${color}00 ${Math.max(3, Math.round(width * 0.09))}px, ${color}88 ${Math.max(6, Math.round(width * 0.2))}px)`,
          backgroundSize: `${Math.max(6, Math.round(width * 0.2))}px 100%`,
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
          borderRadius: '50% 50% 0 0 / 30% 30% 0 0',
        }} />
      <button onClick={e => { e.stopPropagation(); setAbierto(true) }} title={`Terreno: ${terreno}`}
        className="flex items-center justify-center gap-0.5 hover:brightness-125 transition-[filter] shrink-0"
        style={{
          width, height: alto, borderRadius: '50%', color: '#fff',
          background: `radial-gradient(ellipse at center, ${color} 0%, ${color}99 70%, ${color}33 100%)`,
          boxShadow: `0 1px 4px ${color}88`,
        }}>
        <Info size={icono} strokeWidth={3} />
        {conNombre && <span className="font-black uppercase leading-none truncate" style={{ fontSize: Math.round(alto * 0.5) }}>{terreno}</span>}
      </button>
      </span>
      {/* Portal: el contenedor de los iconos tiene un translate, y un ancestro con
          transform vuelve su contenedor al `fixed`: el popup quedaba del ancho de
          esa columnita en vez del de la pantalla. */}
      {abierto && createPortal(<TerrenoPopup terreno={terreno} onClose={() => setAbierto(false)} />, document.body)}
    </>
  )
}

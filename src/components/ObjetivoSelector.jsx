import { Crosshair } from 'lucide-react'
import { OTRO_OBJETIVO } from '../lib/objetivos'

// A quién se ataca. Los objetivos salen del campo (PartidaRoom.getObjetivos):
// Pokémon del máster fuera de la pokébola y NPC. "Otro objetivo" cubre lo que
// no está en el campo (otro entrenador, uno mismo, algo narrativo).
//
// Objetivo: { clave, tipo: 'pokemon'|'npc'|'otro', nombre, nombreChat, sprite,
//             hidden, type1, type2 }


export default function ObjetivoSelector({ objetivos = [], valor = null, onChange, oscuro = true }) {
  const opciones = [...objetivos, OTRO_OBJETIVO]
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${oscuro ? 'text-texto-2' : 'text-texto-2'}`}>
        <Crosshair size={11} /> Objetivo
      </span>
      {opciones.map(o => {
        const activa = valor?.clave === o.clave
        return (
          <button key={o.clave} type="button" onClick={() => onChange(o)}
            className={`flex items-center gap-1 rounded-lg pl-1 pr-2 py-0.5 text-[11px] font-bold transition-colors ${
              activa ? 'bg-red-500/20 ring-1 ring-tinte/50 text-peligro' : 'bg-superficie text-texto hover:bg-relleno-2'}`}>
            {o.sprite ? (
              <img src={o.sprite} alt=""
                className={`w-5 h-5 ${o.tipo === 'npc' ? 'object-cover rounded-full bg-superficie' : 'object-contain'} ${o.hidden ? 'brightness-0 opacity-70' : ''}`}
                onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
            ) : o.tipo !== 'otro' ? (
              <span className="w-5 h-5 rounded-full bg-relleno-2 text-texto text-[10px] font-black flex items-center justify-center">?</span>
            ) : <span className="w-1" />}
            {o.nombre}
          </button>
        )
      })}
    </div>
  )
}

/** Ventana previa al lanzar un movimiento: solo pide el objetivo */
export function ObjetivoModal({ titulo, objetivos = [], onElegir, onClose }) {
  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-sm shadow-hoja overflow-hidden">
        <div className="px-4 py-3 border-b border-separador">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <Crosshair size={15} className="text-tinte" /> ¿A quién atacas?
          </h4>
          {titulo && <p className="text-[11px] text-texto-2 mt-0.5 truncate">{titulo}</p>}
        </div>
        <div className="px-4 py-4">
          <ObjetivoSelector objetivos={objetivos} onChange={onElegir} />
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ChevronDown, Eye, EyeOff, Minus, Plus, Swords, X } from 'lucide-react'
import { hpPct, hpColor } from '../../lib/partidaShared'
import NumerosFlotantes from '../NumerosFlotantes'
import { EstadoTrigger, EstadosChips } from '../EstadosControl'
import { incapacitado } from '../../lib/estados'

/* Tarjeta de un NPC en el panel del master: vida, ojo para revelarlo y ataque */
function MasterNpcCard({ npc, onHp, onRemove, onToggleHidden, onAttack, onEstados }) {
  return (
    <div className="relative bg-superficie border border-separador rounded-xl p-3 shadow-lg self-start">
      <NumerosFlotantes valor={npc.hp_current} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img src={`/avatars/${npc.avatar}`} alt=""
            className="w-9 h-9 rounded-lg object-cover bg-elevada shrink-0"
            onError={e => { e.currentTarget.style.opacity = '0.3' }} />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{npc.name}</p>
            <p className="text-[10px] text-texto-2 flex items-center gap-1 mt-0.5">
              Lv.{npc.level}
              {/* Estado alterado: como en la tarjeta del Pokémon, junto al nombre */}
              {onEstados && <EstadoTrigger size={20} title="Estados del NPC" onClick={() => onEstados(npc)} />}
              <EstadosChips estados={npc.estados} size="chico" />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onToggleHidden(npc.uid)}
            className={`transition-colors ${npc.hidden ? 'text-tinte hover:text-tinte' : 'text-texto-2 hover:text-white'}`}
            title={npc.hidden ? 'Revelar a los jugadores' : 'Ocultar a los jugadores'}>
            {npc.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button onClick={() => onRemove(npc.uid)} className="text-texto-2 hover:text-tinte transition-colors" title="Quitar">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button onClick={() => onHp(npc.uid, -1)}
          className="w-8 h-8 shrink-0 rounded-lg bg-elevada hover:bg-acento-hover flex items-center justify-center text-white transition-colors">
          <Minus size={15} />
        </button>
        <div className="flex-1">
          <div className="w-full h-2.5 rounded-full bg-elevada overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${hpPct(npc)}%`, backgroundColor: hpColor(hpPct(npc)) }} />
          </div>
          <p className="text-center text-[11px] font-bold text-white mt-1">HP {npc.hp_current}/{npc.hp_max}</p>
        </div>
        <button onClick={() => onHp(npc.uid, 1)}
          className="w-8 h-8 shrink-0 rounded-lg bg-elevada hover:bg-ok flex items-center justify-center text-white transition-colors">
          <Plus size={15} />
        </button>
      </div>

      {/* Dormido, Congelado o Paralizado con 1: no puede atacar */}
      {incapacitado(npc.estados, npc.estadosMeta) && (
        <p className="mt-2 text-[11px] font-semibold text-aviso">⛔ {incapacitado(npc.estados, npc.estadosMeta)}</p>
      )}
      <button onClick={() => onAttack(npc)} disabled={!!incapacitado(npc.estados, npc.estadosMeta)}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-elevada hover:bg-acento-hover
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-elevada
                   text-texto hover:text-white text-xs font-bold rounded-lg transition-colors">
        <Swords size={14} /> Atacar
      </button>
    </div>
  )
}

/* Sección de NPC invocados, debajo de la de Pokémon */
export function MasterNpcFieldPanel({ npcs, max, onAdd, onHp, onRemove, onToggleHidden, onAttack, onEstados = null }) {
  const full = npcs.length >= max
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="shrink-0 flex flex-col px-4 pt-2">
      <div className="flex items-stretch gap-2">
        <button onClick={onAdd} disabled={full}
          className="shrink-0 flex-1 flex items-center justify-center gap-1.5 py-2 bg-superficie hover:bg-relleno-2
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-relleno
                     border border-separador text-texto text-xs font-semibold rounded-xl transition-colors">
          <Plus size={15} /> NPC <span className="text-texto-2">({npcs.length}/{max})</span>
        </button>
        <button onClick={() => setCollapsed(c => !c)} disabled={npcs.length === 0}
          title={collapsed ? 'Expandir NPC invocados' : 'Comprimir NPC invocados'}
          className="shrink-0 w-10 flex items-center justify-center bg-superficie hover:bg-relleno-2
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-relleno
                     border border-separador text-texto rounded-xl transition-colors">
          <ChevronDown size={16} className={`transition-transform duration-300 ${collapsed ? '-rotate-90' : ''}`} />
        </button>
      </div>
      {!collapsed && npcs.length > 0 && (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2 overflow-auto resize-y content-start max-h-[75vh]">
          {npcs.map(n => (
            <MasterNpcCard key={n.uid} npc={n} onHp={onHp} onRemove={onRemove}
              onToggleHidden={onToggleHidden} onAttack={onAttack} onEstados={onEstados} />
          ))}
        </div>
      )}
    </div>
  )
}

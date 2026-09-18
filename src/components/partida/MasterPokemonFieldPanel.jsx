import { useState } from 'react'
import { ArrowRightLeft, ChevronDown, Eye, EyeOff, Minus, Plus, Search, X, Zap } from 'lucide-react'
import { POKEBALL_SPRITE, hpPct, hpColor, expAlAtrapar } from '../../lib/partidaShared'
import { TypeBadge } from './TypeBadge'

/* Card de un Pokémon del master — colapsable (toggle) */
function MasterPokemonCard({ pokemon, onHp, onRemove, onCast, onToggleHidden, onInspect, onToggleBall, onTransfer, onMoveInfo }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-lg self-start">
      {/* Encabezado (toggle repliega/expande) */}
      <div
        onClick={() => setCollapsed(c => !c)}
        className="flex items-start justify-between gap-2 cursor-pointer select-none"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            <span className="text-white font-bold text-sm truncate">{pokemon.name}</span>
            <span className="text-[10px] text-gray-400 shrink-0">Lv.{pokemon.level}</span>
            {/* Guardar/soltar de la pokébola: dentro se ve un rayo para liberarlo */}
            <button
              onClick={e => { e.stopPropagation(); onToggleBall(pokemon.uid) }}
              className={`shrink-0 transition-colors flex items-center justify-center ${pokemon.inBall ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-white'}`}
              title={pokemon.inBall ? 'Sacar de la pokébola' : 'Guardar en la pokébola'}
            >
              {pokemon.inBall
                ? <Zap size={32} />
                : <img src={POKEBALL_SPRITE} alt="" className="w-8 h-8 object-contain opacity-70 hover:opacity-100"
                    onError={e => { e.target.style.opacity = '0.3' }} />}
            </button>
            {/* Transferir el Pokémon a un entrenador */}
            <button
              onClick={e => { e.stopPropagation(); onTransfer(pokemon) }}
              className="shrink-0 text-gray-500 hover:text-white transition-colors"
              title="Transferir a un entrenador"
            >
              <ArrowRightLeft size={18} />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-1 pl-5">
            <TypeBadge type={pokemon.type1} />
            <TypeBadge type={pokemon.type2} />
            {/* Lo que gana el entrenador que lo atrape. Solo en la tarjeta del
                master: es un dato que el jugador no deberia ver antes de decidir. */}
            {expAlAtrapar(pokemon.level, pokemon.sr) != null && (
              <span title={`Experiencia al atraparlo · 200 x Lv.${pokemon.level} x SR ${pokemon.sr}`}
                className="shrink-0 text-[9px] font-black tabular-nums text-amber-300
                           bg-amber-500/10 border border-amber-500/40 rounded px-1.5 py-0.5">
                {expAlAtrapar(pokemon.level, pokemon.sr).toLocaleString()} EXP
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {pokemon.master_pokemon_id != null && (
            <button
              onClick={e => { e.stopPropagation(); onInspect(pokemon.master_pokemon_id) }}
              className="text-gray-500 hover:text-white transition-colors"
              title="Ver información del Pokémon"
            >
              <Search size={16} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onToggleHidden(pokemon.uid) }}
            className={`transition-colors ${pokemon.hidden ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-white'}`}
            title={pokemon.hidden ? 'Revelar a los jugadores' : 'Ocultar a los jugadores'}
          >
            {pokemon.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(pokemon.uid) }} className="text-gray-500 hover:text-red-400 transition-colors" title="Quitar">
            <X size={16} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Controles de vida */}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => onHp(pokemon.uid, -1)}
              className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors">
              <Minus size={15} />
            </button>
            <div className="flex-1">
              {/* Barra de solo lectura: la vida solo se mueve de a un punto con los botones */}
              <div className="w-full h-2.5 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${hpPct(pokemon)}%`, backgroundColor: hpColor(hpPct(pokemon)) }} />
              </div>
              <p className="text-center text-[11px] font-bold text-white mt-1">
                HP {pokemon.hp_current}/{pokemon.hp_max}
              </p>
            </div>
            <button onClick={() => onHp(pokemon.uid, 1)}
              className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-green-600 flex items-center justify-center text-white transition-colors">
              <Plus size={15} />
            </button>
          </div>

          {/* Movimientos según el nivel */}
          {pokemon.moves?.length > 0 && (
            <div className="mt-3 border-t border-gray-700 pt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Movimientos</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {pokemon.moves.map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <button onClick={e => { e.stopPropagation(); onMoveInfo?.(m) }} title="Ver detalle del movimiento"
                        className="text-white text-xs font-medium truncate underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-amber-300 transition-colors">
                        {m.name}
                      </button>
                      <TypeBadge type={m.type} />
                    </div>
                    <button
                      onClick={() => onCast(pokemon, m.name, m.type)}
                      className="shrink-0 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Lanzar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* Panel de Pokémon del master — botón + grid de Pokémon (máx. según `max`).
   Se llama "FieldPanel" (y no "MasterPokemonPanel") para no chocar con
   src/components/MasterPokemonPanel.jsx, el modal "Mis Pokémon" del dashboard. */
export function MasterPokemonFieldPanel({ pokemons, max = 4, onAdd, onHp, onRemove, onCast, onToggleHidden, onInspect, onToggleBall, onTransfer, onMoveInfo }) {
  const full = pokemons.length >= max
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="shrink-0 flex flex-col px-4 pt-3">
      <div className="flex items-stretch gap-2">
        <button
          onClick={onAdd}
          disabled={full}
          className="shrink-0 flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-800 hover:bg-gray-700
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800
                     border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-colors"
        >
          <Plus size={15} /> Pokémon <span className="text-gray-400">({pokemons.length}/{max})</span>
        </button>
        {/* Repliega la rejilla de invocados sin perderlos de la partida */}
        <button
          onClick={() => setCollapsed(c => !c)}
          disabled={pokemons.length === 0}
          title={collapsed ? 'Expandir Pokémon invocados' : 'Comprimir Pokémon invocados'}
          className="shrink-0 w-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800
                     border border-gray-700 text-gray-300 rounded-xl transition-colors"
        >
          <ChevronDown size={16} className={`transition-transform duration-300 ${collapsed ? '-rotate-90' : ''}`} />
        </button>
      </div>

      {/* Sin alto fijo: la rejilla crece con las tarjetas y solo hace scroll al
          pasar de 75vh. Sigue siendo redimensionable con el borde inferior. */}
      {!collapsed && pokemons.length > 0 && (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2 overflow-auto resize-y content-start max-h-[75vh]">
          {pokemons.map(p => (
            <MasterPokemonCard
              key={p.uid}
              pokemon={p}
              onHp={onHp}
              onRemove={onRemove}
              onCast={onCast}
              onToggleHidden={onToggleHidden}
              onInspect={onInspect}
              onToggleBall={onToggleBall}
              onTransfer={onTransfer}
              onMoveInfo={onMoveInfo}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { Smartphone } from 'lucide-react'
import { POKEBALL_SPRITE, hpPct, hpColor, TYPE_COLORS } from '../../lib/partidaShared'
import { TypeBadge, MysteryMark } from './TypeBadge'
import NumerosFlotantes from '../NumerosFlotantes'
import { ICONO_REDONDO } from '../../lib/trainerCombatShared'
import { ICONO_TIPO } from '../../lib/iconoTipo'
import { EstadosChips } from '../EstadosControl'

/* Aura del color del tipo principal, con su símbolo de fondo (un trueno,
   una llama…) detrás del sprite. */
function AuraTipo({ tipo, children }) {
  const color = TYPE_COLORS[tipo]?.bg ?? '#8E8E93'
  const Icono = ICONO_TIPO[tipo]
  return (
    <span className="relative w-16 h-16 rounded-full shrink-0 grid place-items-center overflow-hidden"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 42%, transparent)` }}>
      {Icono && (
        <Icono aria-hidden size={58} strokeWidth={1.5} className="absolute pointer-events-none"
          style={{ color, opacity: 0.1, filter: `drop-shadow(0 0 6px ${color})` }} />
      )}
      {children}
    </span>
  )
}

/* Tarjeta de vida del Pokémon — vista de trainer/espectador (con imagen) */
export function PokemonHpCard({ p, onPokeball = null, ballSprite = null, onPokedex = null }) {
  const pct    = hpPct(p)
  const hidden = !!p.hidden

  // El master lo guardó en la pokébola: se ve la bola balanceándose con el
  // nombre encima, y no se puede lanzar nada mientras esté dentro.
  if (p.inBall) {
    return (
      <div className="flex flex-col items-center gap-1 w-64">
        <span className="font-bold text-texto text-sm truncate max-w-full bg-superficie border border-separador rounded-lg px-2 py-0.5 shadow-sm">
          {hidden ? '???' : p.name}
        </span>
        <img src={POKEBALL_SPRITE} alt={hidden ? 'Pokémon en la pokébola' : `${p.name} en la pokébola`}
          className="w-16 h-16 object-contain animate-pokeball-wobble drop-shadow-lg"
          onError={e => { e.target.style.opacity = '0.3' }} />
      </div>
    )
  }
  // Efecto de sangrado: pulso de fondo según la vida (se mantiene aunque esté oculto)
  const bleedClass = pct <= 20 ? 'animate-bleed-red' : pct <= 50 ? 'animate-bleed-yellow' : 'cristal'

  return (
    <div className="flex items-center gap-2">
    {(onPokeball || onPokedex) && (
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        {/* Pokébola para intentar atrapar — solo si el trainer tiene alguna */}
        {onPokeball && (
          <button onClick={() => onPokeball(p)} title={`Lanzar pokébola a ${hidden ? 'este Pokémon' : p.name}`}
            data-throw-target={p.uid}
            className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-tinte/50 rounded-full">
            <img src={ballSprite} alt="Lanzar pokébola"
              className="w-9 h-9 object-contain animate-pokeball-idle drop-shadow-md"
              onError={e => { e.target.style.opacity = '0.3' }} />
          </button>
        )}
        {/* Ver en la Pokédex — solo cuando ya se reveló de qué especie es */}
        {onPokedex && (
          <button onClick={() => onPokedex(p)} title={`Ver a ${p.name} en la Pokédex`}
            className={`${ICONO_REDONDO} w-9 h-9`}>
            <Smartphone size={16} />
          </button>
        )}
      </div>
    )}
    <div onClick={onPokedex ? () => onPokedex(p) : undefined}
      title={onPokedex ? `Ver a ${p.name} en la Pokédex` : undefined}
      className={`relative flex items-center gap-3 rounded-[20px] shadow-xl p-2.5 w-64 ${bleedClass}
        ${onPokedex ? 'cursor-pointer hover:ring-2 hover:ring-tinte/60 transition-shadow' : ''}`}>
      {/* El jugador no ve los HP del Pokémon del máster: solo ▼/▲, y nada
          mientras siga oculto */}
      <NumerosFlotantes valor={hidden ? null : p.hp_current} mostrarNumero={false} />
      {/* Sprite */}
      {hidden ? (
        <div className="w-16 h-16 rounded-full shrink-0 bg-relleno flex items-center justify-center">
          <MysteryMark />
        </div>
      ) : (
        <AuraTipo tipo={p.type1}>
          <img src={p.sprite} alt={p.name} className="relative w-14 h-14 object-contain"
            onError={e => { e.target.style.opacity = '0.2' }} />
        </AuraTipo>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-texto text-sm truncate">{hidden ? '???' : p.name}</span>
          {/* El nivel delata lo peligroso que es: se oculta hasta que el máster
              lo revele, igual que el nombre, los tipos y la barra de vida. */}
          <span className="text-xs font-bold text-texto shrink-0">Lv.{hidden ? '??' : p.level}</span>
        </div>
        <div className="flex gap-1 my-1 min-h-[14px]">
          {!hidden && <><TypeBadge type={p.type1} /><TypeBadge type={p.type2} /><EstadosChips estados={p.estados} size="chico" /></>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold tracking-[.04em] text-[#FFD60A]">HP</span>
          {hidden ? (
            <span className="text-[10px] font-bold text-texto">???</span>
          ) : (
            <div className="flex-1 h-1.5 bg-pista rounded-full overflow-hidden">
              <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
            </div>
          )}
        </div>
        {/* Sin hit points: el trainer ve la barra y su color, no las cifras */}
      </div>
    </div>
    </div>
  )
}

/* Tarjeta de un NPC para el jugador: mientras esté oculto no dice ni quién es
   ni cómo va de vida, igual que un Pokémon del campo sin revelar. */
export function NpcHpCard({ n }) {
  const pct    = hpPct(n)
  const hidden = !!n.hidden
  const bleedClass = pct <= 20 ? 'animate-bleed-red' : pct <= 50 ? 'animate-bleed-yellow' : 'cristal'
  return (
    <div className={`relative flex items-center gap-3 rounded-[20px] shadow-xl p-2.5 w-64 ${bleedClass}`}>
      <NumerosFlotantes valor={hidden ? null : n.hp_current} mostrarNumero={false} />
      {hidden ? (
        <div className="w-16 h-16 rounded-full shrink-0 bg-relleno flex items-center justify-center">
          <MysteryMark />
        </div>
      ) : (
        <img src={`/avatars/${n.avatar}`} alt={n.name}
          className="w-16 h-16 object-cover bg-relleno rounded-full shrink-0"
          onError={e => { e.currentTarget.style.opacity = '0.2' }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-texto text-sm truncate">{hidden ? '???' : n.name}</span>
          <span className="text-xs font-bold text-texto shrink-0">Lv.{hidden ? '??' : n.level}</span>
        </div>
        {!hidden && n.estados && <div className="mt-0.5"><EstadosChips estados={n.estados} size="chico" /></div>}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] font-extrabold tracking-[.04em] text-[#FFD60A]">HP</span>
          {hidden ? (
            <span className="text-[10px] font-bold text-texto">???</span>
          ) : (
            <div className="flex-1 h-1.5 bg-pista rounded-full overflow-hidden">
              <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

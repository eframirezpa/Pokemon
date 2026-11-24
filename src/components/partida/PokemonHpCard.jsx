import { useRef, useState } from 'react'
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


/* Celular: deslizar la tarjeta a la derecha la pliega (queda el icono) y a la
   izquierda la abre; tocarla plegada también la abre. Sin onPlegar (escritorio)
   no hace nada y la tarjeta se comporta como siempre. */
const UMBRAL = 35
function useDeslizar({ plegada, onPlegar, onClick }) {
  const inicio = useRef(null)
  const deslizo = useRef(false)
  const [dx, setDx] = useState(0)
  if (!onPlegar) return { handlers: { onClick }, dx: 0 }
  const fin = (e) => {
    const i = inicio.current
    inicio.current = null
    setDx(0)
    if (!i || e.pointerId !== i.id) return
    const mx = e.clientX - i.x, my = e.clientY - i.y
    if (Math.abs(mx) > UMBRAL && Math.abs(mx) > Math.abs(my) * 1.5) {
      deslizo.current = true
      onPlegar(mx > 0)
    }
  }
  return {
    dx,
    handlers: {
      style: { touchAction: 'pan-y' },
      onPointerDown: (e) => {
        inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
        deslizo.current = false
        // El dedo puede salirse de la tarjeta (plegada es solo el icono)
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* sin captura */ }
      },
      onPointerMove: (e) => {
        const i = inicio.current
        if (!i || e.pointerId !== i.id) return
        const mx = e.clientX - i.x
        // Sigue al dedo un poco, solo hacia donde tiene sentido
        setDx(Math.max(-24, Math.min(24, (plegada ? Math.min(mx, 0) : Math.max(mx, 0)) * 0.4)))
      },
      onPointerUp: fin,
      onPointerCancel: () => { inicio.current = null; setDx(0) },
      onClick: (e) => {
        if (deslizo.current) { deslizo.current = false; return }
        if (plegada) { e.stopPropagation(); onPlegar(false); return }
        onClick?.(e)
      },
    },
  }
}

/* Aro de vida alrededor del icono cuando la tarjeta está plegada. Oculto el
   Pokémon, el aro va gris y lleno: no delata la vida. */
function AroVida({ pct, visible, oculto }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden
      className={`absolute -inset-[5px] w-[74px] h-[74px] -rotate-90 pointer-events-none transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <circle cx="50" cy="50" r="47" fill="none" strokeWidth="4" className="stroke-pista" />
      <circle cx="50" cy="50" r="47" fill="none" strokeWidth="4" strokeLinecap="round" pathLength="100"
        strokeDasharray={`${oculto ? 100 : pct} 100`}
        style={{ stroke: oculto ? 'var(--color-texto-2)' : hpColor(pct), transition: 'stroke-dasharray .3s' }} />
    </svg>
  )
}

/* Estados encima del icono, en la tarjeta plegada */
function EstadosPlegada({ estados, visible }) {
  if (!visible) return null
  return (
    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10">
      <EstadosChips estados={estados} iconPx={18} />
    </span>
  )
}

// Clases de la tarjeta según esté plegada o no
const claseTarjeta = (plegada) => `relative flex items-center shadow-xl p-2.5 transition-[width,border-radius,gap,transform] duration-300 ease-[cubic-bezier(.32,.72,0,1)] select-none
  ${plegada ? 'w-[84px] gap-0 rounded-full cursor-pointer' : 'w-64 gap-3 rounded-[20px]'}`
const claseTexto = (plegada) => `flex-1 min-w-0 overflow-hidden transition-opacity duration-200 ${plegada ? 'opacity-0 pointer-events-none' : 'opacity-100'}`

/* Tarjeta de vida del Pokémon — vista de trainer/espectador (con imagen) */
export function PokemonHpCard({ p, onPokeball = null, ballSprite = null, onPokedex = null, plegada = false, onPlegar = null }) {
  const pct    = hpPct(p)
  const hidden = !!p.hidden
  plegada = !!onPlegar && plegada
  const { handlers, dx } = useDeslizar({ plegada, onPlegar, onClick: onPokedex ? () => onPokedex(p) : undefined })

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
    <div {...handlers}
      style={{ ...handlers.style, transform: dx ? `translateX(${dx}px)` : undefined }}
      title={plegada ? `Abrir la tarjeta de ${hidden ? 'este Pokémon' : p.name}` : onPokedex ? `Ver a ${p.name} en la Pokédex` : undefined}
      className={`${claseTarjeta(plegada)} ${bleedClass}
        ${onPokedex && !plegada ? 'cursor-pointer hover:ring-2 hover:ring-tinte/60' : ''}`}>
      {/* El jugador no ve los HP del Pokémon del máster: solo ▼/▲, y nada
          mientras siga oculto */}
      <NumerosFlotantes valor={hidden ? null : p.hp_current} mostrarNumero={false} />
      {/* Sprite */}
      <span className="relative shrink-0">
        {hidden ? (
          <div className="w-16 h-16 rounded-full shrink-0 bg-relleno flex items-center justify-center">
            <MysteryMark />
          </div>
        ) : (
          <AuraTipo tipo={p.type1}>
            <img src={p.sprite} alt={p.name} draggable={false} className="relative w-14 h-14 object-contain"
              onError={e => { e.target.style.opacity = '0.2' }} />
          </AuraTipo>
        )}
        <AroVida pct={pct} visible={plegada} oculto={hidden} />
        <EstadosPlegada estados={p.estados} visible={plegada && !hidden} />
      </span>

      <div className={claseTexto(plegada)}>
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
export function NpcHpCard({ n, plegada = false, onPlegar = null }) {
  const pct    = hpPct(n)
  const hidden = !!n.hidden
  plegada = !!onPlegar && plegada
  const { handlers, dx } = useDeslizar({ plegada, onPlegar })
  const bleedClass = pct <= 20 ? 'animate-bleed-red' : pct <= 50 ? 'animate-bleed-yellow' : 'cristal'
  return (
    <div {...handlers}
      style={{ ...handlers.style, transform: dx ? `translateX(${dx}px)` : undefined }}
      title={plegada ? `Abrir la tarjeta de ${hidden ? 'este NPC' : n.name}` : undefined}
      className={`${claseTarjeta(plegada)} ${bleedClass}`}>
      <NumerosFlotantes valor={hidden ? null : n.hp_current} mostrarNumero={false} />
      <span className="relative shrink-0">
        {hidden ? (
          <div className="w-16 h-16 rounded-full shrink-0 bg-relleno flex items-center justify-center">
            <MysteryMark />
          </div>
        ) : (
          <img src={`/avatars/${n.avatar}`} alt={n.name} draggable={false}
            className="w-16 h-16 object-cover bg-relleno rounded-full shrink-0"
            onError={e => { e.currentTarget.style.opacity = '0.2' }} />
        )}
        <AroVida pct={pct} visible={plegada} oculto={hidden} />
        <EstadosPlegada estados={n.estados} visible={plegada && !hidden} />
      </span>
      <div className={claseTexto(plegada)}>
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

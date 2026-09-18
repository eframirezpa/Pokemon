import { POKEBALL_SPRITE, hpPct, hpColor } from '../../lib/partidaShared'
import { TypeBadge, MysteryMark } from './TypeBadge'

/* Tarjeta de vida del Pokémon — vista de trainer/espectador (con imagen) */
export function PokemonHpCard({ p, onPokeball = null, ballSprite = null }) {
  const pct    = hpPct(p)
  const hidden = !!p.hidden

  // El master lo guardó en la pokébola: se ve la bola balanceándose con el
  // nombre encima, y no se puede lanzar nada mientras esté dentro.
  if (p.inBall) {
    return (
      <div className="flex flex-col items-center gap-1 w-64">
        <span className="font-bold text-gray-900 text-sm truncate max-w-full bg-white border border-gray-300 rounded-lg px-2 py-0.5 shadow-sm">
          {hidden ? '???' : p.name}
        </span>
        <img src={POKEBALL_SPRITE} alt={hidden ? 'Pokémon en la pokébola' : `${p.name} en la pokébola`}
          className="w-16 h-16 object-contain animate-pokeball-wobble drop-shadow-lg"
          onError={e => { e.target.style.opacity = '0.3' }} />
      </div>
    )
  }
  // Efecto de sangrado: pulso de fondo según la vida (se mantiene aunque esté oculto)
  const bleedClass = pct <= 20 ? 'animate-bleed-red' : pct <= 50 ? 'animate-bleed-yellow' : 'bg-gray-100'

  return (
    <div className="flex items-center gap-2">
    {/* Pokébola para intentar atrapar — solo si el trainer tiene alguna */}
    {onPokeball && (
      <button onClick={() => onPokeball(p)} title={`Lanzar pokébola a ${hidden ? 'este Pokémon' : p.name}`}
        data-throw-target={p.uid}
        className="shrink-0 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400 rounded-full">
        <img src={ballSprite} alt="Lanzar pokébola"
          className="w-9 h-9 object-contain animate-pokeball-idle drop-shadow-md"
          onError={e => { e.target.style.opacity = '0.3' }} />
      </button>
    )}
    <div className={`flex items-center gap-3 border-2 border-gray-700 rounded-2xl shadow-xl p-2.5 w-64 ${bleedClass}`}>
      {/* Sprite */}
      {hidden ? (
        <div className="w-16 h-16 rounded-xl shrink-0 border border-gray-300 bg-white flex items-center justify-center">
          <MysteryMark />
        </div>
      ) : (
        <img src={p.sprite} alt={p.name}
          className="w-16 h-16 object-contain bg-white rounded-xl shrink-0 border border-gray-300"
          onError={e => { e.target.style.opacity = '0.2' }} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-900 text-sm truncate">{hidden ? '???' : p.name}</span>
          {/* El nivel delata lo peligroso que es: se oculta hasta que el máster
              lo revele, igual que el nombre, los tipos y la barra de vida. */}
          <span className="text-xs font-bold text-gray-700 shrink-0">Lv.{hidden ? '??' : p.level}</span>
        </div>
        <div className="flex gap-1 my-1 min-h-[14px]">
          {!hidden && <><TypeBadge type={p.type1} /><TypeBadge type={p.type2} /></>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black text-amber-600">HP</span>
          {hidden ? (
            <span className="text-[10px] font-bold text-gray-700">???</span>
          ) : (
            <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
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
  const bleedClass = pct <= 20 ? 'animate-bleed-red' : pct <= 50 ? 'animate-bleed-yellow' : 'bg-gray-100'
  return (
    <div className={`flex items-center gap-3 border-2 border-gray-700 rounded-2xl shadow-xl p-2.5 w-64 ${bleedClass}`}>
      {hidden ? (
        <div className="w-16 h-16 rounded-xl shrink-0 border border-gray-300 bg-white flex items-center justify-center">
          <MysteryMark />
        </div>
      ) : (
        <img src={`/avatars/${n.avatar}`} alt={n.name}
          className="w-16 h-16 object-cover bg-white rounded-xl shrink-0 border border-gray-300"
          onError={e => { e.currentTarget.style.opacity = '0.2' }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-gray-900 text-sm truncate">{hidden ? '???' : n.name}</span>
          <span className="text-xs font-bold text-gray-700 shrink-0">Lv.{hidden ? '??' : n.level}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[9px] font-black text-amber-600">HP</span>
          {hidden ? (
            <span className="text-[10px] font-bold text-gray-700">???</span>
          ) : (
            <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
              <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

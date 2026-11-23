import { Crown, ChevronRight } from 'lucide-react'

/**
 * Quién juega ahora y quién sigue. La ve toda la mesa mientras dure el combate.
 *
 * El botón de terminar turno solo le sale a quien le toca: el máster lleva los
 * suyos desde su panel, donde además puede retroceder.
 */
export default function BarraTurno({ iniciativa, userId, onTerminar, busy = false }) {
  if (iniciativa?.estado !== 'activa') return null
  const participantes = iniciativa.participantes || []
  if (!participantes.length) return null

  const turno = Number(iniciativa.turno) || 0
  const actual = participantes[turno]
  const siguiente = participantes[(turno + 1) % participantes.length]
  const esMio = actual?.user_id === userId

  return (
    // Cápsula de cristal oscuro. En el turno propio el foco va aquí (no en el
    // avatar): anillo morado que late y el texto crece un poco al compás.
    <div className={`modo-oscuro cristal pointer-events-auto flex items-center gap-2.5 rounded-full text-texto
                    h-11 pl-4 pr-1.5 max-w-full min-w-0 whitespace-nowrap ${esMio ? 'ring-[3px] ring-acento/60 border-[#B45CE6] animate-turno-aura' : ''}`}>
      <span className="text-[11px] font-bold uppercase tracking-[.06em] text-tinte shrink-0">
        {/* En el celular la barra va entre dos botones: «R1» en vez de «Ronda 1» */}
        <span className="hidden sm:inline">Ronda </span><span className="sm:hidden">R</span>{iniciativa.ronda ?? 1}
      </span>

      <div className="flex items-center gap-1.5 min-w-0">
        {actual?.es_master && <Crown size={13} className="text-[#FFD60A] shrink-0" />}
        {/* Sin truncate en el turno propio: recortaría el brillo, y el margen deja
            sitio para cuando las letras crecen */}
        <span className={`text-[15px] font-bold ${esMio ? 'inline-block origin-left mr-2 text-white animate-turno-texto' : 'truncate text-white'}`}>
          {esMio ? '¡Es tu turno!' : (actual?.nombre || '—')}
        </span>
      </div>

      {participantes.length > 1 && (
        // En el celular la barra va entre dos botones: el «sigue» no cabe
        <span className="hidden sm:flex items-center gap-2.5 min-w-0">
          <ChevronRight size={14} className="text-texto-2 shrink-0" />
          <span className="text-[13px] text-texto-2 truncate shrink min-w-0">
            sigue <span className="font-semibold text-[#EBEBF5]">{siguiente?.nombre || '—'}</span>
          </span>
        </span>
      )}

      {esMio && onTerminar ? (
        <button type="button" onClick={e => { e.stopPropagation(); onTerminar() }} disabled={busy}
          className="shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold text-white bg-acento hover:bg-acento-hover
                     disabled:opacity-40 transition-colors">
          Terminar<span className="hidden sm:inline"> turno</span>
        </button>
      ) : <span className="w-2.5 shrink-0" aria-hidden />}
    </div>
  )
}

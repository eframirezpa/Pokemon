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
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border-2 border-amber-500/60 bg-gray-900/95
                    px-3 py-1.5 shadow-2xl backdrop-blur-sm">
      <span className="text-[9px] font-black uppercase tracking-widest text-amber-400/80 shrink-0">
        R{iniciativa.ronda ?? 1}
      </span>

      <div className="flex items-center gap-1.5 min-w-0">
        {actual?.es_master && <Crown size={12} className="text-amber-400 shrink-0" />}
        <span className={`text-sm font-black truncate ${esMio ? 'text-amber-300' : 'text-white'}`}>
          {esMio ? '¡Es tu turno!' : (actual?.nombre || '—')}
        </span>
      </div>

      {participantes.length > 1 && (
        <>
          <ChevronRight size={13} className="text-gray-600 shrink-0" />
          <span className="text-[11px] text-gray-400 truncate shrink min-w-0">
            sigue <span className="font-semibold text-gray-300">{siguiente?.nombre || '—'}</span>
          </span>
        </>
      )}

      {esMio && onTerminar && (
        <button onClick={onTerminar} disabled={busy}
          className="shrink-0 ml-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700
                     disabled:opacity-40 px-2.5 py-1 rounded-lg transition-colors">
          Terminar turno
        </button>
      )}
    </div>
  )
}

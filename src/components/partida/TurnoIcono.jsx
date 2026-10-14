import { useState } from 'react'
import { Hourglass } from 'lucide-react'
import BarraTurno from '../BarraTurno'
import { participanteEnTurno } from '../../lib/turno'
import { ICONO_REDONDO } from '../../lib/trainerCombatShared'

/**
 * El turno en la columna de iconos (entrenador y máster): un icono que al
 * tocarlo despliega la barra de turno, y al tocar la barra vuelve a icono.
 * Con halo ámbar cuando el turno es de quien mira.
 */
export function TurnoIcono({ iniciativa, userId, onTerminar, busy = false }) {
  const [abierto, setAbierto] = useState(false)
  if (iniciativa?.estado !== 'activa') return null
  const enTurno = participanteEnTurno(iniciativa)
  const miTurno = !!enTurno && String(enTurno.user_id) === String(userId)

  if (abierto) {
    return (
      <div className="shrink-0 max-w-[calc(100vw-1.5rem)] cursor-pointer" title="Tocar para plegar"
        onClick={() => setAbierto(false)}>
        <BarraTurno iniciativa={iniciativa} userId={userId} onTerminar={onTerminar} busy={busy} />
      </div>
    )
  }
  return (
    <button onClick={() => setAbierto(true)}
      title={miTurno ? '¡Es tu turno! Toca para ver el turno' : `Turno de ${enTurno?.nombre || '—'} · toca para ver`}
      className={`pointer-events-auto ${miTurno
        ? 'shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 animate-turno-anillo transition-colors'
        : `${ICONO_REDONDO} w-10 h-10`}`}>
      <Hourglass size={18} />
    </button>
  )
}

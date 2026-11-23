import { useEffect, useState } from 'react'
import { Hourglass } from 'lucide-react'
import BarraTurno from '../BarraTurno'
import { participanteEnTurno, posicionTurno, debeDesplegarTurno } from '../../lib/turno'
import { ICONO_REDONDO, ICONO_REDONDO_ACTIVO } from '../../lib/trainerCombatShared'

const leer = (clave) => {
  try { return JSON.parse(localStorage.getItem(clave)) } catch { return null }
}
const guardar = (clave, valor) => {
  try { valor == null ? localStorage.removeItem(clave) : localStorage.setItem(clave, JSON.stringify(valor)) } catch { /* sin almacenamiento */ }
}

/**
 * El turno en la columna de iconos (entrenador y máster).
 *
 * Al lanzarse la iniciativa la barra de turno queda desplegada. Si el jugador
 * la pliega (tocándola), queda como icono hasta que su turno está por llegar
 * —juega el participante justo anterior a él— o es su turno: entonces se
 * despliega sola y se queda así hasta que la vuelva a plegar.
 *
 * Lo plegado se guarda por partida (localStorage), junto con el turno en que
 * se plegó: así no se pierde al recargar, y un combate nuevo (que empieza en
 * un turno anterior al guardado) vuelve a arrancar desplegado.
 */
export function TurnoIcono({ iniciativa, userId, onTerminar, busy = false, partidaId = null }) {
  const clave = `turno-plegado-${partidaId ?? 'sin-partida'}`
  // { en: posición del turno en que se plegó } o null si está desplegada
  const [plegado, setPlegado] = useState(() => leer(clave))

  const activa = iniciativa?.estado === 'activa'
  const enTurno = participanteEnTurno(iniciativa)
  const miTurno = !!enTurno && String(enTurno.user_id) === String(userId)
  const pos = posicionTurno(iniciativa)

  // Ajuste durante el render (sin efecto): se despliega sola si llegó un turno
  // nuevo que me toca o me precede, o si empezó un combate nuevo.
  if (debeDesplegarTurno(plegado, iniciativa, userId)) setPlegado(null)

  // Lo guardado sigue al estado mientras hay combate. No se borra al no haber
  // iniciativa: al recargar llega un instante después y se perdería; un
  // combate nuevo ya se detecta por la posición del turno.
  useEffect(() => { if (activa) guardar(clave, plegado) }, [clave, activa, plegado])

  if (!activa) return null

  if (!plegado) {
    return (
      <div className="min-w-0 max-w-full cursor-pointer" title="Tocar para plegar"
        onClick={() => setPlegado({ en: pos })}>
        <BarraTurno iniciativa={iniciativa} userId={userId} onTerminar={onTerminar} busy={busy} />
      </div>
    )
  }
  return (
    <button type="button" onClick={() => setPlegado(null)}
      title={miTurno ? '¡Es tu turno! Toca para ver el turno' : `Turno de ${enTurno?.nombre || '—'} · toca para ver`}
      className={`pointer-events-auto w-10 h-10 ${miTurno ? `${ICONO_REDONDO_ACTIVO} animate-turno-anillo` : ICONO_REDONDO}`}>
      <Hourglass size={18} />
    </button>
  )
}

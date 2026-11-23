import { Dices } from 'lucide-react'
import { useDados } from './dadosContext'
import { ICONO_REDONDO_ACTIVO } from '../../lib/trainerCombatShared'

/** Botón redondo que abre la bandeja de dados. Sin tirador (fuera de una partida) no se pinta. */
export default function BotonBandejaDados({ className = '' }) {
  const dados = useDados()
  if (!dados) return null
  return (
    <button onClick={dados.abrirBandeja} title="Tirar dados"
      className={`${ICONO_REDONDO_ACTIVO} w-10 h-10 ${className}`}>
      <Dices size={18} />
    </button>
  )
}

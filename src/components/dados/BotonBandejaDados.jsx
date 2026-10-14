import { Dices } from 'lucide-react'
import { useDados } from './dadosContext'

/** Botón redondo que abre la bandeja de dados. Sin tirador (fuera de una partida) no se pinta. */
export default function BotonBandejaDados({ className = '' }) {
  const dados = useDados()
  if (!dados) return null
  return (
    <button onClick={dados.abrirBandeja} title="Tirar dados"
      className={`flex items-center justify-center w-10 h-10 rounded-full bg-red-700 hover:bg-red-600 text-white
                  shadow-lg border border-red-500 transition-all ${className}`}>
      <Dices size={18} />
    </button>
  )
}

import { Dices } from 'lucide-react'
import { useDados } from './dadosContext'

/**
 * Dado pequeño junto a un campo donde se escribe una tirada: tira lo que
 * corresponde y entrega el resultado (onResultado). Fuera de una partida no
 * hay tirador, así que no se pinta y el campo se sigue llenando a mano.
 * usar: 'total' entrega el total con modificador; 'dado' solo lo que salió en
 * el dado (para campos que suman el modificador aparte, como la iniciativa).
 */
export default function BotonDado({ notacion, etiqueta, onResultado, usar = 'total', className = '' }) {
  const dados = useDados()
  if (!dados || !notacion) return null
  return (
    <button type="button" disabled={dados.tirando} title={`Tirar ${notacion}`}
      onClick={() => dados.tirar(notacion, { etiqueta })
        .then(r => onResultado(usar === 'dado' ? r.usados.reduce((a, v) => a + v, 0) : r.total))
        .catch(() => {})}
      className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700
                  text-white shadow disabled:opacity-40 transition-colors ${className}`}>
      <Dices size={15} />
    </button>
  )
}

import { Dices } from 'lucide-react'
import { useDados } from './dadosContext'

/**
 * Dado pequeño junto a un campo donde se escribe una tirada: tira lo que
 * corresponde y entrega el resultado (onResultado). Fuera de una partida no
 * hay tirador, así que no se pinta y el campo se sigue llenando a mano.
 * usar: 'total' entrega el total con modificador; 'dado' solo lo que salió en
 * el dado (para campos que suman el modificador aparte, como la iniciativa).
 *
 * Estados alterados (lib/estados.js):
 *   modo: 'desventaja' | 'ventaja' → con 1d20 se tiran dos y se usa el menor/mayor
 *   menorDeDos: se tira dos veces y se usa la tirada menor (daño con Quemado)
 * Con cualquiera de los dos el botón se ve distinto y el título dice por qué.
 */
export default function BotonDado({ notacion, etiqueta, onResultado, usar = 'total', className = '', modo = null, menorDeDos = false, motivo = null }) {
  const dados = useDados()
  if (!dados || !notacion) return null
  const valor = (r) => (usar === 'dado' ? r.usados.reduce((a, v) => a + v, 0) : r.total)
  const tirar = async () => {
    if (menorDeDos) {
      const a = await dados.tirar(notacion, { etiqueta: etiqueta ? `${etiqueta} (1 de 2)` : '1 de 2' })
      const b = await dados.tirar(notacion, { etiqueta: etiqueta ? `${etiqueta} (2 de 2)` : '2 de 2' })
      return Math.min(valor(a), valor(b))
    }
    return valor(await dados.tirar(notacion, { etiqueta, modo }))
  }
  const especial = modo || menorDeDos
  const titulo = menorDeDos ? `Tirar ${notacion} dos veces y usar la menor${motivo ? ` (${motivo})` : ''}`
    : modo ? `Tirar ${notacion} con ${modo}${motivo ? ` (${motivo})` : ''}` : `Tirar ${notacion}`
  return (
    <button type="button" disabled={dados.tirando} title={titulo} aria-label={titulo}
      onClick={() => tirar().then(onResultado).catch(() => {})}
      className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-white shadow disabled:opacity-40 transition-colors
                  ${especial ? 'bg-purple-700 hover:bg-purple-800 ring-2 ring-amber-300/70' : 'bg-red-600 hover:bg-red-700'} ${className}`}>
      <Dices size={15} />
    </button>
  )
}

/** Aviso corto bajo una tirada con desventaja: "Desventaja · Envenenado". */
export function AvisoDesventaja({ motivo, texto = 'Desventaja', className = '' }) {
  if (!motivo) return null
  return (
    <p className={`text-center text-[11px] font-bold text-amber-300 ${className}`}>
      ⬇ {texto} · {motivo}
    </p>
  )
}

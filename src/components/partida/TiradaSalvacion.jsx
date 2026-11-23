import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import Hoja from '../ui/Hoja'
import Boton from '../ui/Boton'
import BotonDado from '../dados/BotonDado'

const signo = (n) => (n >= 0 ? `+${n}` : `${n}`)

/**
 * Tirada de salvación que pide el DM (plan-xp-y-mesa, etapa 5C). La ve el
 * jugador dueño del objetivo: tira el d20 (dado de la app o escrito a mano) y
 * el resultado vuelve al DM, que aplica el efecto. El bono ya viene calculado
 * desde la ficha (modificador + proficiencia si es competente).
 *
 *   pedida: { id, objetivo, atacante, move, atributo, dc, bono }
 */
export default function TiradaSalvacion({ pedida, onResponder }) {
  const [d20, setD20] = useState('')
  const n = Number(d20)
  const valido = Number.isInteger(n) && n >= 1 && n <= 20
  const total = valido ? n + (Number(pedida.bono) || 0) : null
  const supera = total != null ? total >= Number(pedida.dc) : null

  return (
    <Hoja z="z-[86]" ancho="sm:max-w-sm"
      titulo={<span className="flex items-center gap-2"><ShieldAlert size={18} className="text-aviso" /> ¡Tirada de salvación!</span>}
      pie={
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[13px] font-semibold ${supera == null ? 'text-texto-2' : supera ? 'text-ok' : 'text-peligro'}`}>
            {supera == null ? `Necesitas ${pedida.dc} o más` : supera ? `${total}: ¡la superas!` : `${total}: no la superas`}
          </p>
          <Boton disabled={!valido} onClick={() => onResponder({ id: pedida.id, d20: n, bono: Number(pedida.bono) || 0, total })}>
            Enviar al DM
          </Boton>
        </div>
      }>
      <p className="text-[15px]">
        <b>{pedida.atacante}</b> usó <b>{pedida.move}</b> contra <b>{pedida.objetivo}</b>.
      </p>
      <p className="text-[15px] mt-1">
        Tira salvación de <b>{pedida.atributo}</b> contra <b>DC {pedida.dc}</b>.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <input type="number" min={1} max={20} inputMode="numeric" value={d20} placeholder="1d20"
          onChange={e => setD20(e.target.value)} aria-label="Resultado del d20"
          className="w-20 h-12 rounded-xl bg-relleno text-center text-[22px] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />
        <BotonDado notacion="1d20" etiqueta={`Salvación de ${pedida.atributo}`} usar="dado" onResultado={v => setD20(String(v))} className="!w-12 !h-12 !rounded-xl" />
        <span className="text-[22px] font-bold tabular-nums text-texto-2">{signo(Number(pedida.bono) || 0)}</span>
      </div>
    </Hoja>
  )
}

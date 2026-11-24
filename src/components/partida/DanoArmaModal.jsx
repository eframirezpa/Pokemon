import { useState } from 'react'
import { X, Swords } from 'lucide-react'
import BotonDado, { AvisoDesventaja } from '../dados/BotonDado'
import { tiradaArma, danoArma } from '../../lib/armaDano'

const signo = m => (m >= 0 ? `+${m}` : `${m}`)

// Ventana de daño del ataque de un entrenador, como la de los movimientos del
// Pokémon: primero se tira el ataque (en la fórmula) y después, aparte, el daño.
//
// dados: lo que devuelve dadosArma (o GOLPE_SIN_ARMA). mod: el modificador del
// stat con el que se atacó. En un crítico se tiran el doble de dados; el daño
// fijo (sin arma, cerbatana) no se duplica.
// menorDeDos: motivo (Quemado) → los dados se tiran dos veces y se usa el menor.
export default function DanoArmaModal({ arma, dados, tipo = null, elemental = false, mod = 0, statKey = null, critico = false, onConfirmar, onOmitir, menorDeDos = null }) {
  const [valor, setValor] = useState('')
  const t = tiradaArma(dados, critico)
  const dano = danoArma(dados, { valor, mod, critico })
  const fuera = !!t && valor !== '' && !dano
  const nombre = arma ? arma.weapon_type_name : 'Sin arma'

  return (
    <div className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo">
      <div role="dialog" aria-label={`Daño de ${nombre}`}
        className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-xs shadow-hoja overflow-hidden">
        <div className="px-4 py-3 border-b border-separador flex items-center justify-between gap-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
            <Swords size={15} className="text-tinte shrink-0" />
            <span className="truncate">Daño · {nombre}</span>
          </h3>
          <button onClick={onOmitir} title="Lanzar sin daño" className="text-texto-2 hover:text-white shrink-0"><X size={16} /></button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {critico && t && (
            <p className="text-center text-[11px] font-black uppercase tracking-widest text-tinte">
              ¡Golpe crítico! · doble de dados
            </p>
          )}
          {t && <AvisoDesventaja motivo={menorDeDos} texto="Tira dos veces y usa la menor" />}
          <div className="flex items-center justify-center gap-1.5 font-black">
            {t ? (
              <>
                <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder={t.notacion}
                  className={`w-16 h-10 text-center rounded-xl border-2 bg-superficie tabular-nums text-white
                              placeholder:text-texto-2 placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/60 ${
                    fuera ? 'border-acento' : critico ? 'border-tinte/60' : 'border-separador'}`} />
                <BotonDado notacion={t.notacion} usar="dado" className="w-10 h-10 rounded-xl"
                  menorDeDos={!!menorDeDos} motivo={menorDeDos}
                  etiqueta={`Daño de ${nombre}`} onResultado={v => setValor(String(v))} />
              </>
            ) : (
              <span className="h-10 px-3 rounded-xl border-2 border-separador flex items-center text-white tabular-nums">{dados.valor}</span>
            )}
            <span className="text-texto-2 text-sm">+</span>
            <span title={statKey ? `Modificador de ${statKey}` : 'Modificador'}
              className="h-10 px-2.5 rounded-xl border-2 border-sky-500/60 text-sky-200 flex items-center tabular-nums text-sm">
              {signo(mod)}
            </span>
            <span className="text-texto-2 text-sm">=</span>
            <span className="h-10 min-w-12 px-2.5 rounded-xl border-2 border-peligro/70 text-peligro flex items-center justify-center tabular-nums text-lg">
              {dano ? dano.total : '—'}
            </span>
          </div>

          <p className="text-center text-[11px] text-texto-2 leading-relaxed">
            {t ? `Tira ${t.notacion}${critico ? ' (doble por crítico)' : ''}: entre ${t.min} y ${t.max}` : 'Daño fijo'}
            {statKey && ` · más ${statKey}`}{tipo && ` · ${tipo}`}
          </p>
          {elemental && (
            <p className="text-center text-[11px] text-texto-2">
              Proyectil elemental: el daño es de tipo <b className="text-texto">{tipo}</b> y contra un Pokémon cuentan sus debilidades, resistencias e inmunidades.
            </p>
          )}
          {fuera && <p className="text-center text-[11px] text-tinte font-medium">Con {t.notacion} sale entre {t.min} y {t.max}.</p>}
        </div>

        <div className="px-4 py-3 border-t border-separador flex items-center justify-end gap-2">
          <button onClick={onOmitir} className="text-xs font-bold text-texto hover:text-white px-3 py-2">Sin daño</button>
          <button disabled={!dano} onClick={() => onConfirmar({ ...dano, tipo: tipo || null })}
            className="text-xs font-black uppercase tracking-wide text-white bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors">
            Lanzar daño
          </button>
        </div>
      </div>
    </div>
  )
}

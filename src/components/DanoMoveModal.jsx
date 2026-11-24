import { useState } from 'react'
import { X, Swords, HeartPulse } from 'lucide-react'
import BotonDado, { AvisoDesventaja } from './dados/BotonDado'
import {
  esCuracion, dadosPorNivel, parseDados, tirada as calcularTirada, modificadorDano, usaPower, reglaRonda, rondaValida,
  magnitudDe, esFling, danoFling,
} from '../lib/danoMove'
import { danoTrasRelacion, etiquetaRelacion, cuentaRelacion } from '../lib/objetivos'

// Ventana de daño de un movimiento del Pokémon. Sale después de elegir los PP,
// solo si el movimiento tiene daño (move_has_damage = 1); las reglas viven en
// lib/danoMove.js.
//
// power: el que se eligió en la fórmula del ataque ({ nombre, mod }). Si el
// movimiento no pasó por la fórmula y el modificador es MOVE, se elige aquí.
//
// Magnitude: primero se tira un d100 (paso propio) que decide la magnitud y
// sus dados; luego el daño como en cualquier otro. Sin power de la fórmula usa STR.

const CARACTERISTICAS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const signo = m => (m >= 0 ? `+${m}` : `${m}`)

// stab: lo que suma el STAB si el movimiento es de un tipo del Pokémon (0 si no).
// objetivo + relacion: a quién se ataca y si es vulnerable/resistente/inmune al
// tipo del movimiento; solo informa, el daño anunciado es el de la tirada.
// menorDeDos: motivo (Quemado) → el daño se tira dos veces y se usa el menor.
export default function DanoMoveModal({ move, nivel, stats = [], critico = false, power = null, heldItems = [], stab = 0, objetivo = null, relacion = 'neutral', onConfirmar, onOmitir, menorDeDos = null }) {
  const curacion = esCuracion(move)
  // El STAB es del daño: una curación no lo lleva
  const stabN = curacion ? 0 : (Number(stab) || 0)
  // El crítico duplica los dados del daño; una curación no tiene crítico
  const crit = critico && !curacion
  const texto = dadosPorNivel(move, nivel)
  const dados = parseDados(texto)

  const modDe = (key) => Number(stats.find(s => String(s.key || '').toUpperCase() === key)?.mod) || 0
  // Powers del movimiento para elegir aquí si la fórmula no lo eligió ('ANY' = cualquiera)
  const powers = [move.move_power_1, move.move_power_2, move.move_power_3]
    .map(p => String(p || '').trim().toUpperCase())
    .flatMap(p => (p === 'ANY' ? CARACTERISTICAS : CARACTERISTICAS.includes(p) ? [p] : []))
    .filter((p, i, a) => a.indexOf(p) === i)
  const magnitud = dados.tipo === 'magnitud'
  const hayQueElegir = usaPower(move) && !power && !magnitud && powers.length > 1
  // Sin elección posible: el único power (o ninguno, que vale 0)
  const [powerSel, setPowerSel] = useState(powers.length === 1 ? powers[0] : null)
  const powerUsado = power
    || (magnitud ? { nombre: 'STR', mod: modDe('STR') } : null)
    || (powerSel ? { nombre: powerSel, mod: modDe(powerSel) } : null)

  // Magnitude: el d100 va en su propio paso, antes del daño
  const [paso, setPaso] = useState(magnitud ? 'd100' : 'dano')
  const [d100, setD100] = useState('')
  const mg = magnitud ? magnitudDe(d100) : null

  const [ronda, setRonda]   = useState('1')
  const [valor, setValor]   = useState('')  // lo que sumaron los dados (o el daño a mano)
  // Fling: qué held item lanza (si lleva varios); el primero por defecto
  const [heldSel, setHeldSel] = useState(heldItems[0]?.personaje_pokemon_held_item_id ?? null)

  // Por ronda: cada movimiento tiene su regla (Rollout R dados hasta 5,
  // Outrage 2^(R-1) dados hasta 3)
  const regla = reglaRonda(move)
  const t = calcularTirada(dados, { critico: crit, ronda, regla, d100 })
  const mod = modificadorDano(move, { modMove: powerUsado?.mod ?? 0, nivel })

  // Lo que aportan los dados: fijo, la tirada escrita (validada) o a mano
  const n = valor === '' ? null : Math.trunc(Number(valor))
  const fueraDeRango = t && n != null && (n < t.min || n > t.max)
  const base = dados.tipo === 'fijo' ? dados.valor : n
  const listo = base != null && !fueraDeRango && (!hayQueElegir || powerUsado)
  const total = listo ? Math.max(0, base + mod.valor + stabN) : null
  // Lo que le haría al objetivo según su tipo (solo daño, no curación)
  const rel = curacion ? 'neutral' : relacion
  const totalObjetivo = total != null && etiquetaRelacion(rel) ? danoTrasRelacion(total, rel) : null

  const confirmar = () => {
    if (!listo) return
    onConfirmar({
      total, dados: base, modificador: mod.valor, stab: stabN, curacion, critico: crit,
      notacion: t?.notacion || (dados.tipo === 'fijo' ? String(dados.valor) : texto),
    })
  }

  const Icono = curacion ? HeartPulse : Swords

  // Fling: el daño es el precio del held item entre 100 (0 si no lleva o el
  // precio no sirve). Es informativo: sin dados ni modificador.
  if (esFling(move)) {
    const item = heldItems.find(h => h.personaje_pokemon_held_item_id === heldSel) || null
    const dano = danoFling(item?.item_cost)
    return (
      <div className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo">
        <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-xs shadow-hoja overflow-hidden">
          <div className="px-4 py-3 border-b border-separador flex items-center justify-between gap-2">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
              <Swords size={15} className="text-tinte shrink-0" /> <span className="truncate">Daño · {move.move_name}</span>
            </h3>
            <button onClick={onOmitir} title="Lanzar sin daño" className="text-texto-2 hover:text-white shrink-0"><X size={16} /></button>
          </div>
          <div className="px-4 py-4 space-y-3">
            {heldItems.length === 0 ? (
              <p className="text-center text-xs text-texto-2">El Pokémon no tiene un held item equipado: no hay nada que lanzar.</p>
            ) : (
              <>
                <p className="text-center text-xs text-texto">Lanza su held item:</p>
                <div className="space-y-1.5">
                  {heldItems.map(h => {
                    const activo = h.personaje_pokemon_held_item_id === heldSel
                    return (
                      <button key={h.personaje_pokemon_held_item_id} onClick={() => setHeldSel(h.personaje_pokemon_held_item_id)}
                        className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors ${
                          activo ? 'bg-sky-500/15 ring-1 ring-sky-400' : 'bg-superficie hover:bg-relleno-2'}`}>
                        {h.item_media_sprite && <img src={h.item_media_sprite} alt="" className="w-6 h-6 object-contain shrink-0" />}
                        <span className="flex-1 min-w-0 text-sm font-bold text-white truncate">{h.item_name}</span>
                        <span className="text-[11px] text-texto-2 tabular-nums shrink-0">{h.item_cost != null ? `${Number(h.item_cost).toLocaleString()} po` : '—'}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <div className="flex items-center justify-center gap-1.5 font-black">
              <span className="text-xs text-texto-2">{item?.item_cost != null ? `${Number(item.item_cost).toLocaleString()} ÷ 100 =` : 'Daño'}</span>
              <span className="h-10 min-w-12 px-2.5 rounded-xl border-2 border-peligro/70 text-peligro flex items-center justify-center tabular-nums text-lg">{dano}</span>
            </div>
            <p className="text-center text-[11px] text-texto-2">Daño informativo: el precio del held item entre 100.{item && ' El item se pierde al lanzarlo.'}</p>
          </div>
          <div className="px-4 py-3 border-t border-separador flex items-center justify-end gap-2">
            <button onClick={onOmitir} className="text-xs font-bold text-texto hover:text-white px-3 py-2">Sin daño</button>
            <button onClick={() => onConfirmar({ total: dano, dados: null, modificador: 0, curacion: false, critico: crit, notacion: item?.item_name || 'Fling', heldItem: item })}
              className="text-xs font-black uppercase tracking-wide text-white bg-acento hover:bg-acento-hover px-4 py-2 rounded-lg transition-colors">
              Lanzar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo">
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-xs shadow-hoja overflow-hidden">
        <div className="px-4 py-3 border-b border-separador flex items-center justify-between gap-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
            <Icono size={15} className={`${curacion ? 'text-emerald-400' : 'text-tinte'} shrink-0`} />
            <span className="truncate">{curacion ? 'Curación' : 'Daño'} · {move.move_name}</span>
          </h3>
          <button onClick={onOmitir} title="Lanzar sin daño" className="text-texto-2 hover:text-white shrink-0"><X size={16} /></button>
        </div>

        {paso === 'd100' ? (
        <div className="px-4 py-4 space-y-3">
          <p className="text-center text-xs text-texto">Tira <b className="text-white">1d100</b> para saber la magnitud del temblor.</p>
          <div className="flex items-center justify-center gap-1.5 font-black">
            <input type="number" min={1} max={100} value={d100} onChange={e => setD100(e.target.value)} placeholder="1d100"
              className={`w-20 h-10 text-center rounded-xl border-2 bg-superficie tabular-nums text-white placeholder:text-texto-2 placeholder:text-xs
                          focus:outline-none focus:ring-2 focus:ring-tinte/60 ${d100 !== '' && !mg ? 'border-acento' : 'border-separador'}`} />
            <BotonDado notacion="1d100" usar="dado" className="w-10 h-10 rounded-xl"
              etiqueta={`Magnitud de ${move.move_name}`} onResultado={v => setD100(String(v))} />
          </div>
          {mg ? (
            <p className="text-center text-sm font-black text-tinte">
              Magnitud {mg.magnitud} · {t?.notacion}{crit ? ' (doble por crítico)' : ''}
            </p>
          ) : d100 !== '' && <p className="text-center text-[11px] text-tinte font-medium">Debe estar entre 1 y 100.</p>}
          {dados.factor > 1 && (
            <p className="text-center text-[11px] text-texto-2">A este nivel los dados de la magnitud van ×{dados.factor}.</p>
          )}
        </div>
        ) : (
        <div className="px-4 py-4 space-y-3">
          {mg && (
            <p className="text-center text-[11px] text-texto-2">
              Magnitud <b className="text-tinte">{mg.magnitud}</b> (d100: {d100}) ·{' '}
              <button onClick={() => { setPaso('d100'); setValor('') }} className="underline hover:text-white">cambiar</button>
            </p>
          )}
          {crit && (
            <p className="text-center text-[11px] font-black uppercase tracking-widest text-tinte">
              ¡Golpe crítico! · doble de dados
            </p>
          )}
          {!curacion && t && <AvisoDesventaja motivo={menorDeDos} texto="Tira dos veces y usa la menor" />}

          {/* Power para el modificador, si no vino de la fórmula */}
          {hayQueElegir && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-texto-2">Move</span>
              {powers.map(p => (
                <button key={p} onClick={() => setPowerSel(p)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                    powerSel === p ? 'bg-sky-500/20 ring-1 ring-sky-400 text-sky-200' : 'bg-superficie text-texto hover:bg-relleno-2'}`}>
                  {p} {signo(modDe(p))}
                </button>
              ))}
            </div>
          )}

          {/* Por ronda (Outrage, Rollout): la ronda dice cuántos dados */}
          {dados.tipo === 'ronda' && (
            <label className="flex items-center justify-center gap-2 text-xs text-texto">
              Ronda
              <input type="number" min={1} max={regla.max ?? undefined} value={ronda}
                // Vacío se deja para poder escribir; cualquier otro valor se lleva de 1 al tope
                onChange={e => { const v = e.target.value; setRonda(v === '' ? v : String(rondaValida(v, regla))); setValor('') }}
                className="w-14 h-8 text-center rounded-lg border-2 border-separador bg-superficie font-black text-white focus:outline-none focus:ring-2 focus:ring-sky-400/60" />
              <span className="text-[10px] text-texto-2">
                {regla.formula !== 'R' && `${regla.formula} dados · `}{regla.max ? `máx. ${regla.max}` : ''}
              </span>
            </label>
          )}

          <div className="flex items-center justify-center gap-1.5 font-black">
            {dados.tipo === 'fijo' ? (
              <span className="h-10 px-3 rounded-xl border-2 border-separador flex items-center text-white tabular-nums">{dados.valor}</span>
            ) : (
              <>
                <input type="number" value={valor} onChange={e => setValor(e.target.value)}
                  placeholder={t ? t.notacion : 'Daño'}
                  className={`w-16 h-10 text-center rounded-xl border-2 bg-superficie tabular-nums text-white
                              placeholder:text-texto-2 placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/60 ${
                    fueraDeRango ? 'border-acento' : crit ? 'border-tinte/60' : 'border-separador'}`} />
                {t && (
                  <BotonDado notacion={t.notacion} usar="dado" className="w-10 h-10 rounded-xl"
                    menorDeDos={!!menorDeDos && !curacion} motivo={menorDeDos}
                    etiqueta={`${curacion ? 'Curación' : 'Daño'} de ${move.move_name}`}
                    onResultado={v => setValor(String(v))} />
                )}
              </>
            )}
            {mod.etiqueta && (
              <>
                <span className="text-texto-2 text-sm">+</span>
                <span title={mod.etiqueta === 'Nivel' ? 'Nivel del Pokémon' : `Modificador ${powerUsado?.nombre || ''}`}
                  className="h-10 px-2.5 rounded-xl border-2 border-sky-500/60 text-sky-200 flex items-center tabular-nums text-sm">
                  {signo(mod.valor)}
                </span>
              </>
            )}
            {stabN > 0 && (
              <>
                <span className="text-texto-2 text-sm">+</span>
                <span title="STAB: el movimiento es del mismo tipo que el Pokémon"
                  className="h-10 px-2 rounded-xl border-2 border-emerald-500/60 text-emerald-200 flex flex-col items-center justify-center leading-none">
                  <span className="text-[8px] font-black tracking-widest">STAB</span>
                  <span className="text-sm tabular-nums">{signo(stabN)}</span>
                </span>
              </>
            )}
            <span className="text-texto-2 text-sm">=</span>
            <span className={`h-10 min-w-12 px-2.5 rounded-xl border-2 flex items-center justify-center tabular-nums text-lg ${
              curacion ? 'border-emerald-500/70 text-emerald-200' : 'border-peligro/70 text-peligro'}`}>
              {total ?? '—'}
            </span>
          </div>

          <p className="text-center text-[11px] text-texto-2 leading-relaxed">
            {dados.tipo === 'fijo' && `${curacion ? 'Curación' : 'Daño'} fijo`}
            {t && `Tira ${t.notacion}${crit ? ' (doble por crítico)' : ''}: entre ${t.min} y ${t.max}`}
            {dados.tipo === 'manual' && `Escríbelo a mano. La tabla dice: ${texto || '—'}`}
            {mod.etiqueta && ` · ${mod.etiqueta === 'Nivel' ? `más el nivel (${nivel})` : `más ${mod.etiqueta}${powerUsado ? ` (${powerUsado.nombre})` : ''}`}`}
          </p>
          {fueraDeRango && <p className="text-center text-[11px] text-tinte font-medium">Con {t.notacion} sale entre {t.min} y {t.max}.</p>}
          {/* Efectividad contra el objetivo: el DM decide si lo aplica */}
          {etiquetaRelacion(rel) && objetivo && (
            <p className={`text-center text-xs font-bold rounded-lg px-2 py-1.5 ${
              rel === 'vuln' ? 'bg-red-500/15 text-peligro' : rel === 'immune' ? 'bg-elevada text-texto' : 'bg-sky-500/15 text-sky-200'}`}>
              {objetivo} es {etiquetaRelacion(rel)} a {move.move_type}
              {totalObjetivo != null && <> → <span className="tabular-nums">{total} {cuentaRelacion(rel)} = {totalObjetivo}</span></>}
            </p>
          )}
        </div>
        )}

        <div className="px-4 py-3 border-t border-separador flex items-center justify-end gap-2">
          <button onClick={onOmitir} className="text-xs font-bold text-texto hover:text-white px-3 py-2">Sin daño</button>
          {paso === 'd100' ? (
            <button onClick={() => { setValor(''); setPaso('dano') }} disabled={!mg}
              className="text-xs font-black uppercase tracking-wide text-white bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors">
              Continuar
            </button>
          ) : (
          <button onClick={confirmar} disabled={!listo}
            className="text-xs font-black uppercase tracking-wide text-white bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors">
            Lanzar
          </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { X, Swords, HeartPulse } from 'lucide-react'
import BotonDado from './dados/BotonDado'
import {
  esCuracion, dadosPorNivel, parseDados, tirada as calcularTirada, modificadorDano, usaPower, reglaRonda, rondaValida,
  magnitudDe, esFling, danoFling,
} from '../lib/danoMove'

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

export default function DanoMoveModal({ move, nivel, stats = [], critico = false, power = null, heldItems = [], onConfirmar, onOmitir }) {
  const curacion = esCuracion(move)
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
  const total = listo ? Math.max(0, base + mod.valor) : null

  const confirmar = () => {
    if (!listo) return
    onConfirmar({
      total, dados: base, modificador: mod.valor, curacion, critico: crit,
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
      <div className="fixed inset-0 z-[125] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
              <Swords size={15} className="text-red-400 shrink-0" /> <span className="truncate">Daño · {move.move_name}</span>
            </h3>
            <button onClick={onOmitir} title="Lanzar sin daño" className="text-gray-400 hover:text-white shrink-0"><X size={16} /></button>
          </div>
          <div className="px-4 py-4 space-y-3">
            {heldItems.length === 0 ? (
              <p className="text-center text-xs text-gray-400">El Pokémon no tiene un held item equipado: no hay nada que lanzar.</p>
            ) : (
              <>
                <p className="text-center text-xs text-gray-300">Lanza su held item:</p>
                <div className="space-y-1.5">
                  {heldItems.map(h => {
                    const activo = h.personaje_pokemon_held_item_id === heldSel
                    return (
                      <button key={h.personaje_pokemon_held_item_id} onClick={() => setHeldSel(h.personaje_pokemon_held_item_id)}
                        className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors ${
                          activo ? 'bg-sky-500/15 ring-1 ring-sky-400' : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                        {h.item_media_sprite && <img src={h.item_media_sprite} alt="" className="w-6 h-6 object-contain shrink-0" />}
                        <span className="flex-1 min-w-0 text-sm font-bold text-white truncate">{h.item_name}</span>
                        <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{h.item_cost != null ? `${Number(h.item_cost).toLocaleString()} po` : '—'}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <div className="flex items-center justify-center gap-1.5 font-black">
              <span className="text-xs text-gray-400">{item?.item_cost != null ? `${Number(item.item_cost).toLocaleString()} ÷ 100 =` : 'Daño'}</span>
              <span className="h-10 min-w-12 px-2.5 rounded-xl border-2 border-red-500/70 text-red-200 flex items-center justify-center tabular-nums text-lg">{dano}</span>
            </div>
            <p className="text-center text-[11px] text-gray-500">Daño informativo: el precio del held item entre 100.{item && ' El item se pierde al lanzarlo.'}</p>
          </div>
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-end gap-2">
            <button onClick={onOmitir} className="text-xs font-bold text-gray-300 hover:text-white px-3 py-2">Sin daño</button>
            <button onClick={() => onConfirmar({ total: dano, dados: null, modificador: 0, curacion: false, critico: crit, notacion: item?.item_name || 'Fling', heldItem: item })}
              className="text-xs font-black uppercase tracking-wide text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors">
              Lanzar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
            <Icono size={15} className={`${curacion ? 'text-emerald-400' : 'text-red-400'} shrink-0`} />
            <span className="truncate">{curacion ? 'Curación' : 'Daño'} · {move.move_name}</span>
          </h3>
          <button onClick={onOmitir} title="Lanzar sin daño" className="text-gray-400 hover:text-white shrink-0"><X size={16} /></button>
        </div>

        {paso === 'd100' ? (
        <div className="px-4 py-4 space-y-3">
          <p className="text-center text-xs text-gray-300">Tira <b className="text-white">1d100</b> para saber la magnitud del temblor.</p>
          <div className="flex items-center justify-center gap-1.5 font-black">
            <input type="number" min={1} max={100} value={d100} onChange={e => setD100(e.target.value)} placeholder="1d100"
              className={`w-20 h-10 text-center rounded-xl border-2 bg-gray-900/60 tabular-nums text-white placeholder:text-gray-500 placeholder:text-xs
                          focus:outline-none focus:ring-2 focus:ring-amber-400/60 ${d100 !== '' && !mg ? 'border-red-500' : 'border-gray-600'}`} />
            <BotonDado notacion="1d100" usar="dado" className="w-10 h-10 rounded-xl"
              etiqueta={`Magnitud de ${move.move_name}`} onResultado={v => setD100(String(v))} />
          </div>
          {mg ? (
            <p className="text-center text-sm font-black text-amber-300">
              Magnitud {mg.magnitud} · {t?.notacion}{crit ? ' (doble por crítico)' : ''}
            </p>
          ) : d100 !== '' && <p className="text-center text-[11px] text-red-400 font-medium">Debe estar entre 1 y 100.</p>}
          {dados.factor > 1 && (
            <p className="text-center text-[11px] text-gray-400">A este nivel los dados de la magnitud van ×{dados.factor}.</p>
          )}
        </div>
        ) : (
        <div className="px-4 py-4 space-y-3">
          {mg && (
            <p className="text-center text-[11px] text-gray-400">
              Magnitud <b className="text-amber-300">{mg.magnitud}</b> (d100: {d100}) ·{' '}
              <button onClick={() => { setPaso('d100'); setValor('') }} className="underline hover:text-white">cambiar</button>
            </p>
          )}
          {crit && (
            <p className="text-center text-[11px] font-black uppercase tracking-widest text-amber-300">
              ¡Golpe crítico! · doble de dados
            </p>
          )}

          {/* Power para el modificador, si no vino de la fórmula */}
          {hayQueElegir && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Move</span>
              {powers.map(p => (
                <button key={p} onClick={() => setPowerSel(p)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                    powerSel === p ? 'bg-sky-500/20 ring-1 ring-sky-400 text-sky-200' : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700'}`}>
                  {p} {signo(modDe(p))}
                </button>
              ))}
            </div>
          )}

          {/* Por ronda (Outrage, Rollout): la ronda dice cuántos dados */}
          {dados.tipo === 'ronda' && (
            <label className="flex items-center justify-center gap-2 text-xs text-gray-300">
              Ronda
              <input type="number" min={1} max={regla.max ?? undefined} value={ronda}
                // Vacío se deja para poder escribir; cualquier otro valor se lleva de 1 al tope
                onChange={e => { const v = e.target.value; setRonda(v === '' ? v : String(rondaValida(v, regla))); setValor('') }}
                className="w-14 h-8 text-center rounded-lg border-2 border-gray-600 bg-gray-900/60 font-black text-white focus:outline-none focus:ring-2 focus:ring-sky-400/60" />
              <span className="text-[10px] text-gray-500">
                {regla.formula !== 'R' && `${regla.formula} dados · `}{regla.max ? `máx. ${regla.max}` : ''}
              </span>
            </label>
          )}

          <div className="flex items-center justify-center gap-1.5 font-black">
            {dados.tipo === 'fijo' ? (
              <span className="h-10 px-3 rounded-xl border-2 border-gray-600 flex items-center text-white tabular-nums">{dados.valor}</span>
            ) : (
              <>
                <input type="number" value={valor} onChange={e => setValor(e.target.value)}
                  placeholder={t ? t.notacion : 'Daño'}
                  className={`w-16 h-10 text-center rounded-xl border-2 bg-gray-900/60 tabular-nums text-white
                              placeholder:text-gray-500 placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-sky-400/60 ${
                    fueraDeRango ? 'border-red-500' : crit ? 'border-amber-400' : 'border-gray-600'}`} />
                {t && (
                  <BotonDado notacion={t.notacion} usar="dado" className="w-10 h-10 rounded-xl"
                    etiqueta={`${curacion ? 'Curación' : 'Daño'} de ${move.move_name}`}
                    onResultado={v => setValor(String(v))} />
                )}
              </>
            )}
            {mod.etiqueta && (
              <>
                <span className="text-gray-500 text-sm">+</span>
                <span title={mod.etiqueta === 'Nivel' ? 'Nivel del Pokémon' : `Modificador ${powerUsado?.nombre || ''}`}
                  className="h-10 px-2.5 rounded-xl border-2 border-sky-500/60 text-sky-200 flex items-center tabular-nums text-sm">
                  {signo(mod.valor)}
                </span>
              </>
            )}
            <span className="text-gray-500 text-sm">=</span>
            <span className={`h-10 min-w-12 px-2.5 rounded-xl border-2 flex items-center justify-center tabular-nums text-lg ${
              curacion ? 'border-emerald-500/70 text-emerald-200' : 'border-red-500/70 text-red-200'}`}>
              {total ?? '—'}
            </span>
          </div>

          <p className="text-center text-[11px] text-gray-400 leading-relaxed">
            {dados.tipo === 'fijo' && `${curacion ? 'Curación' : 'Daño'} fijo`}
            {t && `Tira ${t.notacion}${crit ? ' (doble por crítico)' : ''}: entre ${t.min} y ${t.max}`}
            {dados.tipo === 'manual' && `Escríbelo a mano. La tabla dice: ${texto || '—'}`}
            {mod.etiqueta && ` · ${mod.etiqueta === 'Nivel' ? `más el nivel (${nivel})` : `más ${mod.etiqueta}${powerUsado ? ` (${powerUsado.nombre})` : ''}`}`}
          </p>
          {fueraDeRango && <p className="text-center text-[11px] text-red-400 font-medium">Con {t.notacion} sale entre {t.min} y {t.max}.</p>}
        </div>
        )}

        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-end gap-2">
          <button onClick={onOmitir} className="text-xs font-bold text-gray-300 hover:text-white px-3 py-2">Sin daño</button>
          {paso === 'd100' ? (
            <button onClick={() => { setValor(''); setPaso('dano') }} disabled={!mg}
              className="text-xs font-black uppercase tracking-wide text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors">
              Continuar
            </button>
          ) : (
          <button onClick={confirmar} disabled={!listo}
            className="text-xs font-black uppercase tracking-wide text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors">
            Lanzar
          </button>
          )}
        </div>
      </div>
    </div>
  )
}

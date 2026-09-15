import { useState } from 'react'
import { X, Sword, Shield, Check } from 'lucide-react'

// Fórmula(s) del ataque de un movimiento del Pokémon.
//
// Sale ANTES de la ventana de PP: primero se resuelve la tirada y después se
// decide cuánto se gasta. Cerrarla con la X o el fondo cancela el lanzamiento;
// solo Atacar sigue a los PP.
//
// Un movimiento puede traer dos fórmulas independientes, según qué columnas
// del catálogo traigan información:
//
//   move_attack_scope    → Attack  = 1d20 + PROF + Power Mod + Bonus
//   move_save_attribute  → Move DC = 8    + PROF + Power Mod + Bonus
//
// Sin ninguna de las dos, este modal no se abre (TrainerPartida salta directo
// a la ventana de PP). Con las dos, Attack va arriba y Move DC debajo, en el
// mismo popup: un solo botón para continuar.
//
// move_save_attribute NO es la característica que entra en la cuenta de la DC:
// es la tirada de salvación que hace el OBJETIVO para resistirla (a veces ni
// siquiera coincide con move_power_1/2/3, que es lo que usa el Pokémon
// atacante). Por eso solo se muestra como referencia junto al título.
//
// Un movimiento puede atacar con más de una característica (move_power_1..3).
// Se pinta una fila por cada una. Cuando las dos fórmulas aplican, la fila que
// se elija para Attack es la MISMA que calcula la Move DC: es la misma acción,
// así que el Power Mod tiene que ser el mismo en las dos. Cuando solo hay Move
// DC (movimientos de estado sin ataque), es esa sección la que lleva su propio
// selector de fila.
//
// 'ANY' no es una característica concreta sino la elección del jugador, así que
// esa fila trae un select. 'VARIES' y 'None' no dan modificador y valen 0.

const CARACTERISTICAS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const signo = m => (m >= 0 ? `+${m}` : `${m}`)

export default function FormulaAtaqueModal({ move, prof = 0, stats = [], bonoRuta = { total: 0, detalle: [] },
                                            onClose, onAtacar }) {
  const profN = Number(prof) || 0
  const modDe = (key) => {
    const s = stats.find(x => String(x.key || '').toUpperCase() === String(key || '').toUpperCase())
    return Number(s?.mod) || 0
  }

  // Qué fórmulas aplican, según el catálogo. Si TrainerPartida hizo bien su
  // trabajo este modal no debería abrirse con las dos en null, pero por si
  // acaso no se rompe: simplemente no pinta ningún bloque.
  const tieneAtaque = !!String(move?.move_attack_scope || '').trim()
  const tieneDC = !!String(move?.move_save_attribute || '').trim()

  const powers = [move?.move_power_1, move?.move_power_2, move?.move_power_3]
    .map(p => String(p || '').trim().toUpperCase())
    .filter(p => CARACTERISTICAS.includes(p) || p === 'ANY')

  // Sin power utilizable el término vale 0, pero la fila sigue estando: la
  // tirada, la DC y la proficiencia se suman igual.
  const filas = powers.length > 0
    ? powers.map((p, i) => ({ clave: `${p}-${i}`, nombre: p, elegible: p === 'ANY' }))
    : [{ clave: 'sin-power', nombre: null, elegible: false }]

  const [dados, setDados] = useState({})
  // Bonus por fila: arranca en lo que da la ruta del entrenador y se puede
  // ajustar en mesa. Se comparte entre Attack y Move DC de la misma fila: es
  // el mismo bono aplicado a la misma acción. Los bonos condicionales de
  // feats (Terrain Adept) NO entran aquí: dependen de dónde se pelee, y
  // siguen saliendo aparte como recordatorio.
  const [bonus, setBonus] = useState({})
  const bonusDe = (clave) => (bonus[clave] === undefined ? String(bonoRuta.total || 0) : bonus[clave])
  // Característica elegida en las filas 'ANY'
  const [elegidas, setElegidas] = useState({})
  // Fila activa: compartida entre los dos bloques. Con una sola no hay nada
  // que decidir.
  const [filaSel, setFilaSel] = useState(filas[0].clave)

  const setDado = (clave, texto) => {
    if (texto === '') return setDados(d => ({ ...d, [clave]: '' }))
    const n = Math.trunc(Number(texto))
    if (!Number.isFinite(n)) return
    setDados(d => ({ ...d, [clave]: String(Math.max(1, Math.min(20, n))) }))
  }

  const modDeFila = (f) => {
    if (f.nombre === null) return 0
    if (f.elegible) return elegidas[f.clave] ? modDe(elegidas[f.clave]) : 0
    return modDe(f.nombre)
  }
  const totalAtaqueDeFila = (f) => {
    const t = dados[f.clave] ?? ''
    const b = bonusDe(f.clave)
    return (t === '' ? 0 : Number(t)) + profN + modDeFila(f) + (b === '' ? 0 : Number(b))
  }
  // Move DC: el término del d20 es un 8 fijo, no hay nada que tirar.
  const totalDCDeFila = (f) => {
    const b = bonusDe(f.clave)
    return 8 + profN + modDeFila(f) + (b === '' ? 0 : Number(b))
  }

  const varias = filas.length > 1
  const sel = filas.find(f => f.clave === filaSel) || filas[0]
  const tiradaPuesta = (dados[sel.clave] ?? '') !== ''
  // Una fila 'ANY' sin característica elegida no tiene modificador que sumar
  const faltaElegir = sel.elegible && !elegidas[sel.clave]

  // El selector de fila (radio + clic) vive en el bloque de Attack si está
  // presente; si el movimiento no ataca (solo Move DC), Move DC lo lleva ella.
  const seleccionEnAtaque = tieneAtaque

  // El botón: con Attack presente sigue exigiendo la tirada (y resolver un
  // 'ANY'), igual que antes. Sin Attack -un movimiento de estado con Move DC
  // sola- no hay ningún d20 que escribir, así que el botón queda siempre
  // disponible.
  const puedeContinuar = tieneAtaque ? (tiradaPuesta && !faltaElegir) : true

  const confirmar = () => {
    const ataque = tieneAtaque ? totalAtaqueDeFila(sel) : null
    const dificultad = tieneDC ? totalDCDeFila(sel) : null
    onAtacar(ataque, dificultad)
  }

  // Una fila de cualquiera de los dos bloques. `d20` decide si lleva tirada
  // (Attack) o el 8 fijo (Move DC); `interactivo` decide si esta fila trae el
  // radio de selección o solo muestra el resultado de la ya elegida arriba.
  const pintarFila = (f, { d20, interactivo, total, colorBase }) => {
    const critico = d20 && Number(dados[f.clave] || 0) === 20
    const activa = f.clave === filaSel
    return (
      <div key={f.clave}
        onClick={() => interactivo && varias && setFilaSel(f.clave)}
        className={`flex items-center justify-center gap-0.5 flex-wrap rounded-xl transition-colors ${
          interactivo && varias ? `cursor-pointer px-1.5 py-1.5 ${
            activa ? 'bg-sky-500/10 ring-1 ring-sky-500/50' : 'hover:bg-gray-700/40'}` : ''}`}>

        {/* Marca de la fila elegida, solo en el bloque interactivo con varias filas */}
        {interactivo && varias && (
          <span className={`shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
            activa ? 'border-sky-400 bg-sky-500/30' : 'border-gray-600'}`}>
            {activa && <Check size={10} className="text-sky-200" />}
          </span>
        )}

        {/* El nombre del power abre la fila; sin power no hay etiqueta */}
        {f.nombre && (
          <span className="shrink-0 w-8 text-[10px] font-black text-gray-400 uppercase tracking-wide">
            {f.nombre}
          </span>
        )}

        <div className="relative shrink-0">
          {critico && (
            <span className="absolute inset-0 rounded-xl bg-amber-400/40 animate-ping pointer-events-none" />
          )}
          <div className={`relative w-11 h-9 rounded-xl border-2 flex items-center justify-center
                           font-black text-base tabular-nums transition-all ${
            critico
              ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.7)]'
              : 'bg-gray-900/60 border-gray-600 text-white'}`}>
            {total}
          </div>
        </div>

        <span className="text-gray-500 font-black shrink-0 text-xs">=</span>

        <div className="flex items-center gap-0.5 flex-wrap justify-center">
          {d20 ? (
            <input type="number" min={1} max={20} value={dados[f.clave] ?? ''}
              onClick={e => e.stopPropagation()}
              onChange={e => setDado(f.clave, e.target.value)}
              placeholder="1d20"
              className={`shrink-0 w-11 h-9 text-center rounded-xl border-2 bg-gray-900/60 font-black tabular-nums
                          text-white placeholder:text-gray-500 placeholder:font-bold placeholder:text-xs
                          focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-colors ${
                critico ? 'border-amber-400' : 'border-gray-600'}`} />
          ) : (
            <span className={`shrink-0 w-11 h-9 rounded-xl border-2 font-black tabular-nums
                              flex items-center justify-center ${colorBase}`}
              title="La Move DC no se tira: es un valor fijo">
              8
            </span>
          )}

          <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

          {/* PROF: fija, sale del Pokémon */}
          <span className="shrink-0 h-9 min-w-[2rem] px-0.5 rounded-xl border-2 border-emerald-500/60
                           bg-emerald-500/15 text-emerald-200 font-black tabular-nums
                           flex items-center justify-center" title="Proficiencia del Pokémon">
            {signo(profN)}
          </span>

          <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

          {/* En ANY la característica la elige el jugador. Solo se puede elegir
              desde el bloque interactivo; el otro bloque solo muestra el
              resultado ya decidido. */}
          {f.elegible ? (
            interactivo ? (
              <select value={elegidas[f.clave] || ''}
                onClick={e => e.stopPropagation()}
                onChange={e => {
                  const k = e.target.value
                  setElegidas(v => ({ ...v, [f.clave]: k }))
                  if (varias) setFilaSel(f.clave)
                }}
                title="Elige la característica del ataque"
                className={`shrink-0 h-9 px-0.5 rounded-xl border-2 bg-gray-900/60 text-[9px] font-black
                            focus:outline-none focus:ring-2 focus:ring-sky-400/50 transition-colors ${
                  elegidas[f.clave] ? 'border-sky-500/60 text-sky-200' : 'border-dashed border-gray-600 text-gray-300'}`}>
                <option value="">Elegir</option>
                {CARACTERISTICAS.map(k => (
                  <option key={k} value={k}>{k} {signo(modDe(k))}</option>
                ))}
              </select>
            ) : (
              <span className={`shrink-0 h-9 min-w-[2rem] px-0.5 rounded-xl border-2 border-sky-500/60
                                bg-sky-500/15 font-black tabular-nums flex items-center justify-center ${
                  modDeFila(f) < 0 ? 'text-red-300' : 'text-sky-200'}`}
                title={elegidas[f.clave] ? `Modificador de ${elegidas[f.clave]}` : 'Aún sin elegir arriba'}>
                {elegidas[f.clave] ? signo(modDeFila(f)) : '—'}
              </span>
            )
          ) : (
            <span className={`shrink-0 h-9 min-w-[2rem] px-0.5 rounded-xl border-2 border-sky-500/60
                              bg-sky-500/15 font-black tabular-nums flex items-center justify-center ${
                modDeFila(f) < 0 ? 'text-red-300' : 'text-sky-200'}`}
              title={f.nombre ? `Modificador de ${f.nombre}` : 'El movimiento no ataca con ninguna característica'}>
              {signo(modDeFila(f))}
            </span>
          )}

          <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

          <input type="number" value={bonusDe(f.clave)}
            onClick={e => e.stopPropagation()}
            onChange={e => setBonus(b => ({ ...b, [f.clave]: e.target.value }))}
            title={bonoRuta.detalle.length
              ? bonoRuta.detalle.map(d => `Nv ${d.nivel} ${d.nombre}: ${d.valor >= 0 ? '+' : ''}${d.valor}`).join(' · ')
              : 'Bonus adicional'}
            className={`shrink-0 w-11 h-9 text-center rounded-xl border-2 bg-gray-900/60 font-black tabular-nums
                        text-white focus:outline-none focus:ring-2 focus:ring-violet-400/60 transition-colors ${
              bonoRuta.total ? 'border-violet-500/60' : 'border-gray-600'}`} />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
          <h4 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
            <Sword size={15} className="text-amber-400 shrink-0" /> Formula
          </h4>
          <button onClick={onClose} className="text-gray-400 hover:text-white shrink-0"><X size={16} /></button>
        </div>

        <div className="px-4 py-4">
          {move?.move_name && (
            <p className="text-center text-[11px] text-gray-400 truncate mb-3">{move.move_name}</p>
          )}

          {/* ── Bloque Attack: solo si move_attack_scope trae información ── */}
          {tieneAtaque && (
            <div>
              <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 font-black">
                <span className="text-gray-300 text-sm">Attack</span>
                <span className="text-gray-500 text-sm">=</span>
                <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-md px-2 py-1">
                  1d20
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-md px-2 py-1">
                  PROF
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/40 rounded-md px-2 py-1">
                  Power Mod
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-violet-300 bg-violet-500/10 border border-violet-500/40 rounded-md px-2 py-1">
                  Bonus
                </span>
              </div>

              {varias && (
                <p className="mt-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Elige con cuál atacas
                </p>
              )}

              <div className="mt-3 border-t border-gray-700 pt-3 space-y-2">
                {filas.map(f => pintarFila(f, {
                  d20: true, interactivo: seleccionEnAtaque,
                  total: totalAtaqueDeFila(f), colorBase: '',
                }))}
              </div>

              {tiradaPuesta && Number(dados[sel.clave]) === 20 && (
                <p className="mt-2 text-center text-[10px] font-black uppercase tracking-widest text-amber-300">
                  ¡Golpe crítico!
                </p>
              )}
            </div>
          )}

          {/* ── Bloque Move DC: solo si move_save_attribute trae información ── */}
          {tieneDC && (
            <div className={tieneAtaque ? 'mt-4 border-t border-gray-700 pt-4' : ''}>
              <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 font-black">
                <span className="text-gray-300 text-sm">Move DC</span>
                <span className="text-gray-500 text-sm">=</span>
                <span className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/40 rounded-md px-2 py-1">
                  8
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-md px-2 py-1">
                  PROF
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/40 rounded-md px-2 py-1">
                  Power Mod
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-violet-300 bg-violet-500/10 border border-violet-500/40 rounded-md px-2 py-1">
                  Bonus
                </span>
                {/* Informativo: qué tirada hace el OBJETIVO para resistirla. No
                    entra en la cuenta, es la que ya trae move_save_attribute. */}
                {move?.move_save_attribute && (
                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-gray-400
                                   bg-gray-700/60 border border-gray-600 rounded-full px-2 py-0.5">
                    <Shield size={10} /> Salva {move.move_save_attribute}
                  </span>
                )}
              </div>

              {!seleccionEnAtaque && varias && (
                <p className="mt-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Elige con cuál se calcula
                </p>
              )}

              <div className="mt-3 border-t border-gray-700 pt-3 space-y-2">
                {(seleccionEnAtaque ? [sel] : filas).map(f => pintarFila(f, {
                  d20: false, interactivo: !seleccionEnAtaque,
                  total: totalDCDeFila(f), colorBase: 'bg-rose-500/15 border-rose-500/60 text-rose-200',
                }))}
              </div>
            </div>
          )}

          <button onClick={confirmar}
            disabled={!puedeContinuar}
            title={!puedeContinuar
              ? (faltaElegir ? 'Elige la característica del ataque' : 'Escribe primero el resultado del d20')
              : 'Continuar a los PP'}
            className="mt-4 w-full flex items-center justify-center gap-1.5 h-10 rounded-xl
                       text-xs font-black uppercase tracking-widest text-white transition-colors
                       bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
            <Sword size={14} /> Atacar
          </button>
        </div>
      </div>
    </div>
  )
}

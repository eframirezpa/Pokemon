import { useState } from 'react'
import { X, Sword, Check } from 'lucide-react'

// Fórmula del ataque de un movimiento del Pokémon.
//
// Sale ANTES de la ventana de PP: primero se resuelve la tirada y después se
// decide cuánto se gasta. Cerrarla con la X o el fondo cancela el lanzamiento;
// solo Atacar sigue a los PP.
//
// Un movimiento puede atacar con más de una característica (move_power_1..3).
// Se pinta una fila por cada una, con su propia tirada, y se elige con cuál se
// ataca: el poder que se anuncia a la partida es el de la fila elegida.
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

  const powers = [move?.move_power_1, move?.move_power_2, move?.move_power_3]
    .map(p => String(p || '').trim().toUpperCase())
    .filter(p => CARACTERISTICAS.includes(p) || p === 'ANY')

  // Sin power utilizable el término vale 0, pero la fila sigue estando: la
  // tirada y la proficiencia se suman igual.
  const filas = powers.length > 0
    ? powers.map((p, i) => ({ clave: `${p}-${i}`, nombre: p, elegible: p === 'ANY' }))
    : [{ clave: 'sin-power', nombre: null, elegible: false }]

  const [dados, setDados] = useState({})
  // Bonus por fila: arranca en lo que da la ruta del entrenador y se puede
  // ajustar en mesa. Los bonos condicionales de feats (Terrain Adept) NO entran
  // aquí: dependen de dónde se pelee, y siguen saliendo como recordatorio.
  const [bonus, setBonus] = useState({})
  const bonusDe = (clave) => (bonus[clave] === undefined ? String(bonoRuta.total || 0) : bonus[clave])
  // Característica elegida en las filas 'ANY'
  const [elegidas, setElegidas] = useState({})
  // Fila con la que se ataca. Con una sola no hay nada que decidir.
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
  const totalDeFila = (f) => {
    const t = dados[f.clave] ?? ''
    const b = bonusDe(f.clave)
    return (t === '' ? 0 : Number(t)) + profN + modDeFila(f) + (b === '' ? 0 : Number(b))
  }

  const varias = filas.length > 1
  const sel = filas.find(f => f.clave === filaSel) || filas[0]
  const tiradaPuesta = (dados[sel.clave] ?? '') !== ''
  // Una fila 'ANY' sin característica elegida no tiene modificador que sumar
  const faltaElegir = sel.elegible && !elegidas[sel.clave]

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
          {/* La fórmula en abstracto, igual que en el panel del entrenador */}
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

          {move?.move_name && (
            <p className="mt-2 text-center text-[11px] text-gray-400 truncate">{move.move_name}</p>
          )}

          {varias && (
            <p className="mt-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Elige con cuál atacas
            </p>
          )}

          {/* Una fila por característica de ataque del movimiento */}
          <div className="mt-3 border-t border-gray-700 pt-3 space-y-2">
            {filas.map(f => {
              const texto = dados[f.clave] ?? ''
              const n20 = texto === '' ? 0 : Number(texto)
              const mod = modDeFila(f)
              const extra = bonusDe(f.clave)
              const total = n20 + profN + mod + (extra === '' ? 0 : Number(extra))
              const critico = n20 === 20
              const activa = f.clave === filaSel
              return (
                <div key={f.clave}
                  onClick={() => varias && setFilaSel(f.clave)}
                  className={`flex items-center justify-center gap-0.5 flex-wrap rounded-xl transition-colors ${
                    varias ? `cursor-pointer px-1.5 py-1.5 ${
                      activa ? 'bg-sky-500/10 ring-1 ring-sky-500/50' : 'hover:bg-gray-700/40'}` : ''}`}>

                  {/* Marca de la fila elegida, solo cuando hay más de una */}
                  {varias && (
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
                    <input type="number" min={1} max={20} value={texto}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setDado(f.clave, e.target.value)}
                      placeholder="1d20"
                      className={`shrink-0 w-11 h-9 text-center rounded-xl border-2 bg-gray-900/60 font-black tabular-nums
                                  text-white placeholder:text-gray-500 placeholder:font-bold placeholder:text-xs
                                  focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-colors ${
                        critico ? 'border-amber-400' : 'border-gray-600'}`} />

                    <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

                    {/* PROF: fija, sale del Pokémon */}
                    <span className="shrink-0 h-9 min-w-[2rem] px-0.5 rounded-xl border-2 border-emerald-500/60
                                     bg-emerald-500/15 text-emerald-200 font-black tabular-nums
                                     flex items-center justify-center" title="Proficiencia del Pokémon">
                      {signo(profN)}
                    </span>

                    <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

                    {/* En ANY la característica la elige el jugador */}
                    {f.elegible ? (
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
                          mod < 0 ? 'text-red-300' : 'text-sky-200'}`}
                        title={f.nombre ? `Modificador de ${f.nombre}` : 'El movimiento no ataca con ninguna característica'}>
                        {signo(mod)}
                      </span>
                    )}

                    <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

                    <input type="number" value={extra}
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
            })}
          </div>

          {(dados[sel.clave] ?? '') !== '' && Number(dados[sel.clave]) === 20 && (
            <p className="mt-2 text-center text-[10px] font-black uppercase tracking-widest text-amber-300">
              ¡Golpe crítico!
            </p>
          )}

          {/* Atacar pasa a la ventana de PP con el poder de la fila elegida */}
          <button onClick={() => onAtacar(totalDeFila(sel))}
            disabled={!tiradaPuesta || faltaElegir}
            title={!tiradaPuesta ? 'Escribe primero el resultado del d20'
                 : faltaElegir ? 'Elige la característica del ataque' : 'Continuar a los PP'}
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

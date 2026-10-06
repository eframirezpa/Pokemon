import { useState, useEffect } from 'react'
import { X, Check, ChevronLeft, AlertTriangle, Minus, Plus, Sparkles } from 'lucide-react'
import { apiFetch } from '../api'
import LoadingOverlay from './LoadingOverlay'
import PokeballSpinner from './PokeballSpinner'
import PokemonSummonFx from './PokemonSummonFx'

// Reglas de poke5e para repartir los puntos de la evolución
const MAX_POR_STAT = 4
const TOPE_STAT = 20
const STATS = [['str', 'STR'], ['dex', 'DEX'], ['con', 'CON'], ['int', 'INT'], ['wis', 'WIS'], ['cha', 'CHA']]

const capacidad = (base, tope) => STATS.reduce((a, [k]) => a + Math.max(0, Math.min(MAX_POR_STAT, tope - (base?.[k] || 0))), 0)

function Condicion({ c, confirmada, onToggle }) {
  if (c.cumple === null) {
    return (
      <label className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 cursor-pointer select-none">
        <input type="checkbox" checked={confirmada} onChange={onToggle} className="mt-0.5 accent-amber-600" />
        <span>El DM confirma que se cumple: <b>{c.texto}</b></span>
      </label>
    )
  }
  return (
    <div className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 border ${
      c.cumple ? 'text-green-800 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
      {c.cumple ? <Check size={13} className="shrink-0" /> : <X size={13} className="shrink-0" />}
      <span>{c.texto}</span>
    </div>
  )
}

/**
 * Evolución de un Pokémon del entrenador. Pasos: elegir a qué evoluciona
 * (con sus condiciones), repartir los puntos de stat, elegir habilidad si la
 * actual no existe en la forma nueva, y confirmar o posponer. El servidor
 * revalida todo; aquí solo se guía al jugador.
 */
export default function EvolucionModal({ personajeId, pokemon, onClose, onEvolved }) {
  const idpp = pokemon.id_personaje_pokemon
  const [data, setData]       = useState(null)
  const [error, setError]     = useState('')
  const [paso, setPaso]       = useState('elegir') // elegir | puntos | pasiva | movimientos | resumen
  const [sel, setSel]         = useState(null)     // opción elegida
  const [confirmadas, setConfirmadas] = useState(() => new Set())
  const [adds, setAdds]       = useState({})
  const [pasiva, setPasiva]   = useState(null)
  const [moves, setMoves]     = useState([])       // ids de los movimientos que tendrá al evolucionar
  const [busy, setBusy]       = useState(false)
  const [posponerSeguro, setPosponerSeguro] = useState(false)
  const [fx, setFx]           = useState(null)     // efecto al evolucionar

  useEffect(() => {
    let vivo = true
    apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/evolucion`)
      .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'No se pudo cargar'); return j })
      .then(d => { if (vivo) setData(d) })
      .catch(e => { if (vivo) setError(e.message) })
    return () => { vivo = false }
  }, [personajeId, idpp])

  if (fx) return <PokemonSummonFx key={fx.key} sprite={fx.sprite} />
  if (!data && !error) return <LoadingOverlay label="Evolución" onClose={onClose} z="z-[100]" />

  const base = data?.stats || {}
  // 22 a nivel 20 (lo manda el servidor); 20 si no
  const tope = data?.tope_stat || TOPE_STAT
  const debe = sel ? Math.min(sel.puntos, capacidad(base, tope)) : 0
  const gastados = Object.values(adds).reduce((a, v) => a + (v || 0), 0)
  const manualesOk = sel ? sel.condiciones.every((c, i) => c.cumple !== null || confirmadas.has(i)) : false

  // Arranca con los que ya sabe: si no quiere cambiar nada, basta con seguir
  const elegir = (o) => {
    setSel(o); setConfirmadas(new Set()); setAdds({}); setPasiva(null); setError('')
    setMoves((data?.movimientos_actuales || []).slice(0, data?.max_moves || 4).map(m => m.move_id))
  }
  const maxMoves = data?.max_moves || 4
  const toggleMove = (id) => setMoves(prev => prev.includes(id)
    ? prev.filter(x => x !== id)
    : (prev.length < maxMoves ? [...prev, id] : prev))
  const toggleConf = (i) => setConfirmadas(prev => { const s = new Set(prev); if (s.has(i)) s.delete(i); else s.add(i); return s })
  const sumar = (k, d) => setAdds(prev => {
    const v = (prev[k] || 0) + d
    if (v < 0 || v > MAX_POR_STAT || (d > 0 && (base[k] || 0) + v > tope)) return prev
    if (d > 0 && gastados >= debe) return prev
    return { ...prev, [k]: v }
  })

  // Los pasos que tocan según la opción: sin puntos no hay reparto, y si
  // conserva su habilidad no hay que elegir otra.
  const pasos = sel ? ['elegir', ...(debe > 0 ? ['puntos'] : []), ...(sel.conserva_pasiva ? [] : ['pasiva']), 'movimientos', 'resumen'] : ['elegir']
  const siguiente = () => { setError(''); setPaso(pasos[Math.min(pasos.indexOf(paso) + 1, pasos.length - 1)]) }
  const atras = () => { setError(''); setPaso(pasos[Math.max(pasos.indexOf(paso) - 1, 0)]) }

  const evolucionar = async () => {
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/evolucion`, {
        method: 'POST',
        body: JSON.stringify({ evolution_id: sel.evolution_id, stat_adds: adds, id_abilitie: pasiva, confirmadas: [...confirmadas], move_ids: moves }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error || 'No se pudo evolucionar'); return }
      const sprite = (pokemon.pokemon_is_shiny && sel.destino.sprite_shiny) ? sel.destino.sprite_shiny : j.sprite
      setFx({ sprite, key: Date.now() })
      setTimeout(() => { onEvolved?.({ ...j, sprite }); onClose() }, 1300)
    } catch { setError('No se pudo evolucionar') } finally { setBusy(false) }
  }

  const posponer = async () => {
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/evolucion/posponer`, { method: 'POST' })
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || 'No se pudo posponer'); return }
      onClose()
    } catch { setError('No se pudo posponer') } finally { setBusy(false) }
  }

  const puedeSeguir =
    paso === 'elegir' ? !!sel && sel.disponible && manualesOk :
    paso === 'puntos' ? gastados === debe :
    paso === 'pasiva' ? pasiva != null :
    paso === 'movimientos' ? moves.length > 0 && moves.length <= maxMoves : true

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate flex items-center gap-2">
              <Sparkles size={16} className="text-red-600 shrink-0" /> Evolución de {pokemon.pokemon_apodo}
            </h3>
            {data && <p className="text-[11px] text-gray-500">{data.especie} · Nivel {data.nivel}</p>}
          </div>
          <button onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!data ? null : data.pospuesta && paso === 'elegir' ? (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">Pospusiste la evolución en este nivel. Podrás evolucionar cuando suba de nivel.</p>
            </div>
          ) : null}

          {/* 1. Elegir evolución */}
          {data && paso === 'elegir' && (data.opciones.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-6">Este Pokémon no tiene evoluciones.</p>
          ) : data.opciones.map(o => {
            const activa = sel?.evolution_id === o.evolution_id
            return (
              <div key={o.evolution_id}
                onClick={() => !data.pospuesta && o.soportada && elegir(o)}
                className={`rounded-xl border p-3 transition-colors ${activa ? 'border-red-500 bg-red-50' : 'border-gray-200'}
                  ${!data.pospuesta && o.soportada ? 'cursor-pointer hover:border-red-300' : 'opacity-70'}`}>
                <div className="flex items-center gap-3">
                  <img src={o.destino.sprite} alt={o.destino.nombre} className="w-14 h-14 object-contain shrink-0"
                    onError={e => { e.target.style.opacity = '0.2' }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">{o.destino.nombre}</p>
                    <p className="text-[11px] text-gray-500">
                      {[o.destino.tipo_1, o.destino.tipo_2].filter(Boolean).join(' / ')}
                      {o.soportada ? ` · ${o.puntos} puntos de stat` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${activa ? 'border-red-600 bg-red-600' : 'border-gray-300'}`}>
                    {activa && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
                  {!o.soportada && (
                    <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                      Efecto especial que resuelve el DM: {o.efecto_especial}
                    </p>
                  )}
                  {o.condiciones.map((c, i) => (
                    <Condicion key={i} c={c} confirmada={activa && confirmadas.has(i)}
                      onToggle={() => { if (!activa) elegir(o); toggleConf(i) }} />
                  ))}
                </div>
              </div>
            )
          }))}

          {/* 2. Repartir puntos */}
          {paso === 'puntos' && (
            <>
              <p className="text-xs text-gray-600">
                Reparte <b>{debe}</b> puntos. Máximo {MAX_POR_STAT} por stat y ningún stat por encima de {tope}.
                {debe < sel.puntos && ` (La evolución da ${sel.puntos}, pero los topes solo dejan usar ${debe}.)`}
              </p>
              <div className="space-y-1.5">
                {STATS.map(([k, label]) => {
                  const a = adds[k] || 0
                  const b = base[k] || 0
                  return (
                    <div key={k} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-black text-gray-700 w-10">{label}</span>
                      <span className="text-sm text-gray-500 tabular-nums">{b}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => sumar(k, -1)} disabled={a <= 0}
                          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 disabled:opacity-30"><Minus size={13} /></button>
                        <span className={`w-6 text-center text-sm font-bold tabular-nums ${a ? 'text-green-700' : 'text-gray-400'}`}>+{a}</span>
                        <button onClick={() => sumar(k, 1)} disabled={a >= MAX_POR_STAT || b + a >= tope || gastados >= debe}
                          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 disabled:opacity-30"><Plus size={13} /></button>
                      </div>
                      <span className="text-sm font-bold text-gray-900 tabular-nums w-8 text-right">{b + a}</span>
                    </div>
                  )
                })}
              </div>
              <p className={`text-xs font-bold text-right ${gastados === debe ? 'text-green-600' : 'text-gray-400'}`}>{gastados}/{debe} puntos</p>
            </>
          )}

          {/* 3. Habilidad */}
          {paso === 'pasiva' && (
            <>
              <p className="text-xs text-gray-600">
                {sel.destino.nombre} no tiene la habilidad {data.pasiva_actual?.nombre ? <b>{data.pasiva_actual.nombre}</b> : 'actual'}. Elige una de su forma nueva:
              </p>
              <div className="space-y-1.5">
                {sel.pasivas_elegibles.map(a => (
                  <button key={a.id} onClick={() => setPasiva(a.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${pasiva === a.id ? 'bg-green-100 border-green-300' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="text-sm font-bold text-gray-800">{a.nombre}{a.hidden && <span className="text-[10px] text-purple-700 ml-1.5">(oculta)</span>}</span>
                    {a.descripcion && <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{a.descripcion}</p>}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 4. Movimientos: los que ya sabe y los nuevos de la forma evolucionada */}
          {paso === 'movimientos' && (() => {
            const fila = (m, nuevo) => {
              const on = moves.includes(m.move_id)
              const lleno = !on && moves.length >= maxMoves
              return (
                <button key={m.move_id} onClick={() => toggleMove(m.move_id)} disabled={lleno}
                  className={`w-full text-left flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 transition-colors
                    ${on ? 'bg-green-100 border-green-300' : 'border-gray-200 hover:border-gray-300'} ${lleno ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <span className="min-w-0 flex items-center gap-1.5">
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${on ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                      {on && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 truncate">{m.move_name}</span>
                    {nuevo && <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 shrink-0">Nuevo</span>}
                  </span>
                  <span className="text-[11px] text-gray-500 shrink-0">{m.move_type}{Number(m.move_pp) > 0 ? ` · ${m.move_pp} PP` : ''}</span>
                </button>
              )
            }
            return (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Elige sus movimientos. Struggle se conserva siempre.</p>
                  <span className={`text-xs font-bold ${moves.length ? 'text-green-600' : 'text-gray-400'}`}>{moves.length}/{maxMoves}</span>
                </div>
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 pt-1">Los que ya sabe</p>
                <div className="space-y-1.5">
                  {(data.movimientos_actuales || []).length === 0
                    ? <p className="text-xs text-gray-400 italic">No sabe ningún movimiento.</p>
                    : data.movimientos_actuales.map(m => fila(m, false))}
                </div>
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 pt-2">Nuevos de {sel.destino.nombre}</p>
                <div className="space-y-1.5">
                  {sel.movimientos_nuevos.length === 0
                    ? <p className="text-xs text-gray-400 italic">No aprende movimientos nuevos a este nivel.</p>
                    : sel.movimientos_nuevos.map(m => fila(m, true))}
                </div>
              </>
            )
          })()}

          {/* 5. Resumen */}
          {paso === 'resumen' && (() => {
            const item = sel.condiciones.find(c => c.tipo === 'item' && c.cumple === true)
            const mejoras = STATS.filter(([k]) => adds[k]).map(([k, l]) => `${l} +${adds[k]}`)
            const fila = (l, v) => (
              <div className="flex justify-between gap-3 py-1 border-b border-gray-100 text-sm">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">{l}</span>
                <span className="text-gray-800 text-right">{v}</span>
              </div>
            )
            return (
              <div>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="text-sm font-bold text-gray-500">{data.especie}</span>
                  <span className="text-red-500">→</span>
                  <img src={sel.destino.sprite} alt="" className="w-16 h-16 object-contain" />
                  <span className="text-sm font-bold text-gray-900">{sel.destino.nombre}</span>
                </div>
                {fila('HP', `+${data.hp_ganado}`)}
                {fila('Dado de golpe', `${data.hit_dice_actual || '—'} → 1${sel.destino.hit_dice || ''}`)}
                {fila('AC', `${data.ac_actual ?? '—'} → ${sel.destino.ac ?? '—'}`)}
                {fila('Tipos', [sel.destino.tipo_1, sel.destino.tipo_2].filter(Boolean).join(' / '))}
                {mejoras.length > 0 && fila('Stats', mejoras.join(', '))}
                {sel.destino.saving_throws && fila('Saving throws', sel.destino.saving_throws)}
                {sel.destino.skills && fila('Skills', sel.destino.skills)}
                {!sel.conserva_pasiva && fila('Habilidad', sel.pasivas_elegibles.find(a => a.id === pasiva)?.nombre)}
                {item && fila('Se consume', item.valor)}
                {fila('Movimientos', [...(data.movimientos_actuales || []), ...sel.movimientos_nuevos]
                  .filter(m => moves.includes(m.move_id)).map(m => m.move_name).join(', '))}
              </div>
            )
          })()}

          {posponerSeguro && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">Si pospones, no podrás evolucionar hasta que suba otro nivel. Pulsa de nuevo para confirmar.</p>
            </div>
          )}
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between gap-2 shrink-0">
          <div>
            {paso !== 'elegir' ? (
              <button onClick={atras} disabled={busy} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5">
                <ChevronLeft size={15} /> Atrás
              </button>
            ) : data && !data.pospuesta && data.opciones.some(o => o.soportada) && (
              <button onClick={() => posponerSeguro ? posponer() : setPosponerSeguro(true)} disabled={busy}
                className="text-sm font-semibold text-amber-700 hover:text-amber-800 px-2 py-1.5">
                {posponerSeguro ? '¿Posponer?' : 'Posponer evolución'}
              </button>
            )}
          </div>
          {paso === 'resumen' ? (
            <button onClick={evolucionar} disabled={busy}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-blue-600 hover:brightness-110 disabled:opacity-40 px-5 py-2 rounded-lg">
              {busy && <PokeballSpinner size={14} />} Evolucionar
            </button>
          ) : (
            <button onClick={siguiente} disabled={!puedeSeguir || busy}
              className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-lg">
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

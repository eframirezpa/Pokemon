import { useEffect, useState } from 'react'
import { AlertTriangle, Heart } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'
import { leerEstados } from '../lib/estados'

// Items del entrenador dentro del panel de combate.
//
// Solo se listan los que se consumen en mesa: medicinas y bayas. Las pokébolas,
// el equipo de entrenador, los objetos equipados y las piedras de evolución
// tienen sus propios flujos y no se gastan desde aquí.
//
// Los que curan HP de forma inmediata (pociones, bayas, aguas, revives) se
// aplican solos: se elige a quién, se anota la tirada si lleva dados y el
// servidor cura y gasta la unidad. El resto NO se aplica: lo resuelve el DM en
// la mesa y "Usar" solo descuenta una unidad, por eso el aviso es parte del
// flujo y no una nota al pie.
const TIPOS = ['medicine', 'berry']

const hpPct = (cur, max) => Math.max(0, Math.min(100, Math.round(((cur ?? max ?? 0) / (max || 1)) * 100)))
const hpColor = pct => (pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444')

/* Una fila elegible: entrenador o Pokémon, con su barra de vida (sin números:
   los trainers no ven los HP de los demás). */
function FilaObjetivo({ nombre, sub, cur, max, deshabilitado, motivo, elegido, onClick, extra = null }) {
  const pct = hpPct(cur, max)
  return (
    <button onClick={onClick} disabled={deshabilitado} title={deshabilitado ? motivo : undefined}
      className={`w-full text-left flex items-center gap-2 px-3 py-1.5 border-t border-gray-100 transition-colors
        ${elegido ? 'bg-green-100' : deshabilitado ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800 truncate">{nombre}{sub && <span className="text-gray-400 font-normal"> {sub}</span>}</p>
        <div className="h-[5px] bg-gray-200 rounded-full overflow-hidden mt-1">
          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
        </div>
      </div>
      {extra}
      {Number(cur) <= 0 && cur != null && <span className="text-[9px] font-black uppercase text-red-600 shrink-0">Debilitado</span>}
    </button>
  )
}

export default function ItemsPanel({ personajeId, partidaId = null, onCurado = null, getPresentes = null }) {
  const [items, setItems]     = useState(null)
  const [abierto, setAbierto] = useState(null) // id con el detalle desplegado
  const [usando, setUsando]   = useState(null) // item en confirmación
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const [party, setParty]     = useState(null)   // objetivos posibles de un item curativo
  const [objetivo, setObjetivo] = useState(null) // { tipo, id_personaje, id_personaje_pokemon?, nombre }
  const [tirada, setTirada]   = useState('')
  const [aviso, setAviso]     = useState('')
  const [moves, setMoves]     = useState(null)   // movimientos del Pokémon elegido (items de PP a un movimiento)
  const [moveSel, setMoveSel] = useState(null)
  const [estadoSel, setEstadoSel] = useState(null) // Lum Berry: qué estado curar

  useEffect(() => {
    let vivo = true
    apiFetch(`/personaje/${personajeId}/equipo`)
      .then(r => r.json())
      .then(d => {
        if (!vivo) return
        const lista = (Array.isArray(d) ? d : [])
          .filter(i => TIPOS.includes(String(i.item_type || '').toLowerCase()))
          .filter(i => Number(i.cantidad) > 0)
        setItems(lista)
      })
      .catch(() => { if (vivo) { setItems([]); setError('No se pudieron cargar los items') } })
    return () => { vivo = false }
  }, [personajeId])

  const abrirUso = (i) => {
    setUsando(i); setError(''); setObjetivo(null); setTirada(''); setMoves(null); setMoveSel(null); setEstadoSel(null)
    // Sin partidaId no hay a quién aplicarlo: se muestra vacío en vez de quedarse cargando
    if ((i.curacion || i.pp || i.estado) && !partidaId) setParty([])
    if ((i.curacion || i.pp || i.estado) && partidaId) {
      setParty(null)
      apiFetch(`/personaje/party?id_partida=${partidaId}`).then(r => r.json())
        .then(d => {
          // Solo quien está conectado a la partida: es el mismo criterio del panel de Party
          const conectados = new Set((getPresentes?.() || []).filter(p => p.personaje_id != null).map(p => String(p.personaje_id)))
          setParty((Array.isArray(d) ? d : []).filter(c => conectados.has(String(c.id_personaje))))
        })
        .catch(() => { setParty([]); setError('No se pudo cargar la party') })
    }
  }

  // Item de PP a un solo movimiento: al elegir el Pokémon se cargan sus movimientos
  const elegirPokemonPP = (ch, pk) => {
    setObjetivo({ tipo: 'pokemon', id_personaje: ch.id_personaje, id_personaje_pokemon: pk.id_personaje_pokemon })
    setMoveSel(null)
    if (usando?.pp?.todos) return
    setMoves(null)
    apiFetch(`/personaje/${ch.id_personaje}/pokemon/${pk.id_personaje_pokemon}`).then(r => r.json())
      .then(d => setMoves(Array.isArray(d?.moves) ? d.moves : []))
      .catch(() => setMoves([]))
  }

  const curar = async () => {
    if (!usando || !objetivo || busy) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/equipo/${usando.id_personaje_equipo}/usar`, {
        method: 'POST',
        body: JSON.stringify({
          tipo: objetivo.tipo, id_personaje: objetivo.id_personaje,
          id_personaje_pokemon: objetivo.id_personaje_pokemon, id_move: moveSel ?? undefined, estado: estadoSel ?? undefined,
          tirada: usando.curacion?.dados ? Number(tirada) : undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error || 'No se pudo usar el item'); return }
      setItems(prev => (prev || [])
        .map(i => i.id_personaje_equipo === usando.id_personaje_equipo ? { ...i, cantidad: j.cantidad } : i)
        .filter(i => Number(i.cantidad) > 0))
      setAviso(j.tipoEfecto === 'estado'
        ? `${j.objetivo} se curó de: ${j.curados.join(', ')}`
        : j.tipoEfecto === 'pp'
        ? `${j.objetivo} recuperó ${j.restaurado} PP`
        : `${j.objetivo} recuperó ${j.curado} HP`)
      onCurado?.(j, objetivo)
      setUsando(null)
    } catch { setError('No se pudo usar el item') }
    finally { setBusy(false) }
  }

  const confirmarUso = async () => {
    if (!usando || busy) return
    setBusy(true); setError('')
    try {
      const restante = Math.max(0, Number(usando.cantidad) - 1)
      const res = await apiFetch(`/personaje/${personajeId}/equipo/${usando.id_personaje_equipo}`,
        { method: 'PATCH', body: JSON.stringify({ cantidad: restante }) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'No se pudo usar el item')
        return
      }
      // Gastado el último, el item deja de estar disponible
      setItems(prev => (prev || [])
        .map(i => i.id_personaje_equipo === usando.id_personaje_equipo ? { ...i, cantidad: restante } : i)
        .filter(i => Number(i.cantidad) > 0))
      setUsando(null)
    } catch { setError('No se pudo usar el item') }
    finally { setBusy(false) }
  }

  if (items === null) {
    return <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><PokeballSpinner size={12} /> Cargando…</p>
  }

  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <p className="text-[11px] text-gray-500 italic">Sin medicinas ni bayas.</p>
      ) : items.map(i => {
        const open = abierto === i.id_personaje_equipo
        return (
          <div key={i.id_personaje_equipo} className="bg-gray-700/50 rounded-lg px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setAbierto(open ? null : i.id_personaje_equipo)}
                className="min-w-0 flex-1 text-left text-white text-xs font-medium truncate hover:text-amber-300 transition-colors">
                {i.item_name}
              </button>
              {/* El tipo va fuera del botón: no debe desplegar la descripción */}
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-gray-400
                               bg-gray-800/60 border border-gray-600 rounded px-1.5 py-0.5">
                {i.item_type}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-black tabular-nums text-gray-300">x{i.cantidad}</span>
                <button onClick={() => abrirUso(i)}
                  className="text-[10px] font-bold uppercase tracking-wide text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-md transition-colors">
                  Usar
                </button>
              </div>
            </div>
            {open && (
              <p className="mt-1 text-[11px] text-gray-400 whitespace-pre-line">
                {i.item_description || 'Sin descripción.'}
              </p>
            )}
          </div>
        )
      })}

      {error && !usando && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
      {aviso && <p className="text-[11px] text-green-400 font-medium flex items-center gap-1"><Heart size={11} /> {aviso}</p>}

      {/* Item curativo: se elige a quién y, si lleva dados, se anota la tirada */}
      {usando && usando.curacion && (() => {
        const c = usando.curacion
        const listo = objetivo && (!c.dados || (tirada !== '' && Number(tirada) >= c.min && Number(tirada) <= c.max))
        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={e => { if (e.target === e.currentTarget && !busy) setUsando(null) }}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 truncate flex items-center gap-2"><Heart size={15} className="text-red-500" /> {usando.item_name}</h3>
                <p className="text-[11px] text-gray-500">
                  Quedan {usando.cantidad} · {c.dados ? `cura ${c.dados.n}d${c.dados.caras}${c.dados.mod ? ` + ${c.dados.mod}` : ''} HP` : `cura ${c.fijo} HP`}
                  {c.revive && ' · solo a un Pokémon debilitado'}
                </p>
              </div>
              <div className="overflow-y-auto">
                <p className="px-5 pt-3 pb-1 text-[11px] font-black uppercase tracking-wider text-gray-500">¿A quién se lo aplicas?</p>
                {party === null ? (
                  <p className="px-5 py-3 text-xs text-gray-400 flex items-center gap-1.5"><PokeballSpinner size={12} /> Cargando…</p>
                ) : party.length === 0 ? (
                  <p className="px-5 py-3 text-xs text-gray-400 italic">No hay nadie conectado a quien aplicárselo.</p>
                ) : party.map(ch => (
                  <div key={ch.id_personaje} className="border-b border-gray-100">
                    {!c.revive && (
                      <FilaObjetivo nombre={ch.nombre_personaje || 'Jugador'} sub="(entrenador)"
                        cur={ch.personaje_current_hp} max={ch.personaje_hp}
                        elegido={objetivo?.tipo === 'personaje' && objetivo.id_personaje === ch.id_personaje}
                        onClick={() => setObjetivo({ tipo: 'personaje', id_personaje: ch.id_personaje })} />
                    )}
                    {(ch.pokemons || []).map(pk => {
                      const cae = pk.pokemon_current_hp != null && Number(pk.pokemon_current_hp) <= 0
                      const bloq = c.revive ? !cae : cae
                      if (c.revive && !cae) return null
                      return (
                        <FilaObjetivo key={pk.id_personaje_pokemon} nombre={pk.pokemon_apodo}
                          sub={`(${ch.nombre_personaje || 'Jugador'})`}
                          cur={pk.pokemon_current_hp} max={pk.pokemon_hp}
                          deshabilitado={bloq} motivo="Un Pokémon debilitado solo se levanta con un Revive"
                          elegido={objetivo?.id_personaje_pokemon === pk.id_personaje_pokemon}
                          onClick={() => setObjetivo({ tipo: 'pokemon', id_personaje: ch.id_personaje, id_personaje_pokemon: pk.id_personaje_pokemon })} />
                      )
                    })}
                  </div>
                ))}
                {party && c.revive && !party.some(ch => (ch.pokemons || []).some(pk => pk.pokemon_current_hp != null && Number(pk.pokemon_current_hp) <= 0)) && (
                  <p className="px-5 py-3 text-xs text-gray-400 italic">No hay Pokémon debilitados en la party.</p>
                )}
                {c.dados && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1">
                      Resultado de la tirada ({c.dados.n}d{c.dados.caras}{c.dados.mod ? ` + ${c.dados.mod}` : ''})
                    </label>
                    <input type="number" value={tirada} onChange={e => setTirada(e.target.value)} min={c.min} max={c.max}
                      placeholder={`${c.min} a ${c.max}`}
                      className="w-28 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                    <p className="text-[10px] text-gray-400 mt-1">Ya con el modificador incluido: entre {c.min} y {c.max}.</p>
                  </div>
                )}
                {/\bloss of bond\b/i.test(usando.item_description || '') && (
                  <div className="mx-5 mb-3 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-snug">A la mayoría de los Pokémon no les gusta este item: hay 1/4 de bajar un nivel de Bond. Díselo al DM.</p>
                  </div>
                )}
                {error && <p className="px-5 pb-3 text-xs text-red-600 font-medium">{error}</p>}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
                <button onClick={() => setUsando(null)} disabled={busy}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
                <button onClick={curar} disabled={busy || !listo}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
                  {busy && <PokeballSpinner size={14} />} Curar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Item de estados: solo se puede aplicar a quien tenga uno que cure */}
      {usando && usando.estado && (() => {
        const e = usando.estado
        const curables = (texto) => leerEstados(texto).filter(x => e.modo !== 'lista' || e.estados.includes(x.clave))
        const chips = (texto) => (
          <span className="flex items-center gap-0.5 shrink-0" title={leerEstados(texto).map(x => x.label).join(', ')}>
            {leerEstados(texto).map(x => <span key={x.clave} className="text-[11px]" aria-hidden>{x.icono}</span>)}
          </span>
        )
        const sel = objetivo && (objetivo.tipo === 'pokemon'
          ? party?.flatMap(c => c.pokemons || []).find(p => p.id_personaje_pokemon === objetivo.id_personaje_pokemon)?.personaje_pokemon_estados
          : party?.find(c => c.id_personaje === objetivo.id_personaje)?.personaje_estados)
        const listo = objetivo && (e.modo !== 'uno' || estadoSel)
        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={ev => { if (ev.target === ev.currentTarget && !busy) setUsando(null) }}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 truncate">{usando.item_name}</h3>
                <p className="text-[11px] text-gray-500">
                  Quedan {usando.cantidad} · cura {e.modo === 'todos' ? 'todos los estados' : e.modo === 'uno' ? 'un estado a elegir'
                    : e.estados.map(k => leerEstados(k)[0]?.label).join(', ')}
                </p>
              </div>
              <div className="overflow-y-auto">
                <p className="px-5 pt-3 pb-1 text-[11px] font-black uppercase tracking-wider text-gray-500">¿A quién se lo aplicas?</p>
                {party === null ? (
                  <p className="px-5 py-3 text-xs text-gray-400 flex items-center gap-1.5"><PokeballSpinner size={12} /> Cargando…</p>
                ) : party.length === 0 ? (
                  <p className="px-5 py-3 text-xs text-gray-400 italic">No hay nadie conectado a quien aplicárselo.</p>
                ) : party.map(ch => (
                  <div key={ch.id_personaje} className="border-b border-gray-100">
                    <FilaObjetivo nombre={ch.nombre_personaje || 'Jugador'} sub="(entrenador)"
                      cur={ch.personaje_current_hp} max={ch.personaje_hp} extra={chips(ch.personaje_estados)}
                      deshabilitado={!curables(ch.personaje_estados).length} motivo="No tiene un estado que este item cure"
                      elegido={objetivo?.tipo === 'personaje' && objetivo.id_personaje === ch.id_personaje}
                      onClick={() => { setObjetivo({ tipo: 'personaje', id_personaje: ch.id_personaje }); setEstadoSel(null) }} />
                    {(ch.pokemons || []).map(pk => (
                      <FilaObjetivo key={pk.id_personaje_pokemon} nombre={pk.pokemon_apodo}
                        sub={`(${ch.nombre_personaje || 'Jugador'})`}
                        cur={pk.pokemon_current_hp} max={pk.pokemon_hp} extra={chips(pk.personaje_pokemon_estados)}
                        deshabilitado={!curables(pk.personaje_pokemon_estados).length} motivo="No tiene un estado que este item cure"
                        elegido={objetivo?.id_personaje_pokemon === pk.id_personaje_pokemon}
                        onClick={() => { setObjetivo({ tipo: 'pokemon', id_personaje: ch.id_personaje, id_personaje_pokemon: pk.id_personaje_pokemon }); setEstadoSel(null) }} />
                    ))}
                  </div>
                ))}
                {party && !party.some(ch => curables(ch.personaje_estados).length || (ch.pokemons || []).some(pk => curables(pk.personaje_pokemon_estados).length)) && (
                  <p className="px-5 py-3 text-xs text-gray-400 italic">Nadie conectado tiene un estado que este item cure.</p>
                )}
                {e.modo === 'uno' && objetivo && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">¿Qué estado curas?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {leerEstados(sel).map(x => (
                        <button key={x.clave} onClick={() => setEstadoSel(x.clave)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border ${estadoSel === x.clave ? 'bg-green-100 border-green-500 text-green-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                          {x.icono} {x.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/(immunity|loss of bond)/i.test(usando.item_description || '') && (
                  <div className="mx-5 my-3 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-snug">
                      Este item tiene un efecto extra que no se aplica solo (inmunidad a estados por una ronda, o 1/4 de bajar un nivel de Bond). Díselo al DM.
                    </p>
                  </div>
                )}
                {error && <p className="px-5 pb-3 text-xs text-red-600 font-medium">{error}</p>}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
                <button onClick={() => setUsando(null)} disabled={busy}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
                <button onClick={curar} disabled={busy || !listo}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
                  {busy && <PokeballSpinner size={14} />} Curar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Item de PP: elige Pokémon y, si es a un solo movimiento, cuál */}
      {usando && usando.pp && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget && !busy) setUsando(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 truncate">{usando.item_name}</h3>
              <p className="text-[11px] text-gray-500">
                Quedan {usando.cantidad} · restaura {usando.pp.cantidad} PP {usando.pp.todos ? 'a todos los movimientos' : 'a un movimiento'}
              </p>
            </div>
            <div className="overflow-y-auto">
              <p className="px-5 pt-3 pb-1 text-[11px] font-black uppercase tracking-wider text-gray-500">¿A qué Pokémon?</p>
              {party === null ? (
                <p className="px-5 py-3 text-xs text-gray-400 flex items-center gap-1.5"><PokeballSpinner size={12} /> Cargando…</p>
              ) : !party.some(ch => (ch.pokemons || []).length) ? (
                <p className="px-5 py-3 text-xs text-gray-400 italic">No hay Pokémon conectados a quien aplicárselo.</p>
              ) : party.map(ch => (
                <div key={ch.id_personaje}>
                  {(ch.pokemons || []).map(pk => (
                    <FilaObjetivo key={pk.id_personaje_pokemon} nombre={pk.pokemon_apodo}
                      sub={`(${ch.nombre_personaje || 'Jugador'})`}
                      cur={pk.pokemon_current_hp} max={pk.pokemon_hp}
                      elegido={objetivo?.id_personaje_pokemon === pk.id_personaje_pokemon}
                      onClick={() => elegirPokemonPP(ch, pk)} />
                  ))}
                </div>
              ))}
              {objetivo && !usando.pp.todos && (
                <div className="border-t border-gray-100">
                  <p className="px-5 pt-3 pb-1 text-[11px] font-black uppercase tracking-wider text-gray-500">¿A qué movimiento?</p>
                  {moves === null ? (
                    <p className="px-5 py-3 text-xs text-gray-400 flex items-center gap-1.5"><PokeballSpinner size={12} /> Cargando…</p>
                  ) : moves.map(m => {
                    const max = Number(m.personaje_pokemon_moves_max_pp) || 0
                    const cur = Number(m.personaje_pokemon_moves_current_pp) || 0
                    const bloq = max === 0 || cur >= max
                    return (
                      <button key={m.personaje_pokemon_moves_id} disabled={bloq}
                        title={max === 0 ? 'PP ilimitados' : cur >= max ? 'Ya tiene todos los PP' : undefined}
                        onClick={() => setMoveSel(m.personaje_pokemon_moves_id)}
                        className={`w-full flex items-center justify-between gap-2 px-5 py-1.5 border-t border-gray-100 text-left transition-colors
                          ${moveSel === m.personaje_pokemon_moves_id ? 'bg-green-100' : bloq ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                        <span className="text-xs font-semibold text-gray-800 truncate">{m.move_name}</span>
                        <span className="text-[11px] font-black tabular-nums text-gray-500 shrink-0">{max === 0 ? '∞' : `${cur}/${max} PP`}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {error && <p className="px-5 py-3 text-xs text-red-600 font-medium">{error}</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setUsando(null)} disabled={busy}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
              <button onClick={curar} disabled={busy || !objetivo || (!usando.pp.todos && moveSel == null)}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
                {busy && <PokeballSpinner size={14} />} Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación: el efecto lo aplica el DM, aquí solo se descuenta */}
      {usando && !usando.curacion && !usando.pp && !usando.estado && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget && !busy) setUsando(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 truncate">{usando.item_name}</h3>
              <p className="text-[11px] text-gray-500">Quedan {usando.cantidad}</p>
            </div>
            <div className="px-5 py-4 overflow-y-auto space-y-3">
              <p className="text-xs text-gray-700 whitespace-pre-line">
                {usando.item_description || 'Sin descripción.'}
              </p>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-snug">
                  Los efectos deben aplicarse manualmente. Si esto no es posible plásmalo en tus Pokenotas
                  para que puedas recordarle al DM los efectos. Hazle saber al DM que usarás el item.
                </p>
              </div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => setUsando(null)} disabled={busy}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
              <button onClick={confirmarUso} disabled={busy}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
                {busy && <PokeballSpinner size={14} />} Usar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

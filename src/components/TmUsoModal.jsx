import { useEffect, useState } from 'react'
import { X, Disc3, AlertTriangle, Check } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

// Usar un TM desde la pestaña Items del panel de combate.
//
//  1. Aviso: lo aprueba el DM y solo en un long rest. Aceptar se habilita al
//     marcar la casilla.
//  2. Entrenar TM: los Pokémon del entrenador (cinturón y femputadora) que
//     pueden aprender el movimiento y aún no lo saben.
//  3. Si el elegido ya tiene 4 movimientos (sin Struggle), cuál olvida.
// Confirmado, el servidor enseña el movimiento y gasta el TM; quien abre esto
// recibe el resultado en onAprendido para dejarlo en la actividad.

export default function TmUsoModal({ personajeId, item, onAprendido, onClose }) {
  const [paso, setPaso]           = useState('aviso') // aviso | elegir | olvidar
  const [aprobado, setAprobado]   = useState(false)
  const [datos, setDatos]         = useState(null)    // { numero, move, pokemones }
  const [elegido, setElegido]     = useState(null)    // id_personaje_pokemon
  const [olvidar, setOlvidar]     = useState(null)    // personaje_pokemon_moves_id
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState('')

  // Los candidatos se piden de una vez; el aviso se lee mientras llegan
  useEffect(() => {
    let vivo = true
    apiFetch(`/personaje/${personajeId}/equipo/${item.id_personaje_equipo}/tm`)
      .then(async r => {
        const j = await r.json().catch(() => ({}))
        if (!vivo) return
        if (!r.ok) setError(j.error || 'No se pudo leer el TM')
        else setDatos(j)
      })
      .catch(() => { if (vivo) setError('No se pudo leer el TM') })
    return () => { vivo = false }
  }, [personajeId, item.id_personaje_equipo])

  const poke = datos?.pokemones.find(p => p.id_personaje_pokemon === elegido) || null
  const moveNombre = datos?.move?.move_name || 'el movimiento'

  const aprender = async () => {
    if (!poke || busy) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/equipo/${item.id_personaje_equipo}/tm`, {
        method: 'POST', body: JSON.stringify({ id_personaje_pokemon: poke.id_personaje_pokemon, olvidar }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error || 'No se pudo enseñar el movimiento'); return }
      onAprendido?.(j)
    } catch { setError('No se pudo enseñar el movimiento') } finally { setBusy(false) }
  }

  // Confirmar el Pokémon: si tiene hueco aprende directo; si no, a elegir qué olvidar
  const confirmarPokemon = () => {
    if (!poke) return
    if (poke.debe_olvidar) { setOlvidar(null); setPaso('olvidar') } else aprender()
  }

  const titulo = paso === 'aviso' ? item.item_name : 'Entrenar TM'

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-sm shadow-hoja overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-4 py-3 border-b border-separador flex items-center justify-between gap-2 shrink-0">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
            <Disc3 size={16} className="text-cyan-400 shrink-0" /> <span className="truncate">{titulo}</span>
          </h3>
          <button onClick={onClose} disabled={busy} className="text-texto-2 hover:text-white shrink-0"><X size={16} /></button>
        </div>

        <div className="px-4 py-4 overflow-y-auto">
          {paso === 'aviso' && (
            <>
              <div className="flex gap-2.5 rounded-xl bg-tinte/10 border border-tinte/40 px-3 py-2.5">
                <AlertTriangle size={18} className="text-tinte shrink-0 mt-0.5" />
                <p className="text-xs text-tinte leading-relaxed">
                  Esta acción debe estar <b>aprobada por el DM</b> y solo puede hacerse <b>durante un long rest</b>.
                </p>
              </div>
              <label className="mt-3 flex items-start gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={aprobado} onChange={e => setAprobado(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-cyan-500 shrink-0" />
                <span className="text-xs text-texto">El DM lo aprobó y estamos en un long rest.</span>
              </label>
            </>
          )}

          {paso === 'elegir' && (
            !datos ? (
              <p className="text-xs text-texto-2 flex items-center gap-1.5"><PokeballSpinner size={13} /> Cargando…</p>
            ) : (
              <>
                <p className="text-xs text-texto mb-3">
                  ¿Qué Pokémon va a aprender <b className="text-cyan-300">{moveNombre}</b>?
                </p>
                {datos.pokemones.length === 0 ? (
                  <p className="text-xs text-texto-2 italic">
                    Ninguno de tus Pokémon puede aprender este movimiento o ya lo saben.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {datos.pokemones.map(p => {
                      const activo = p.id_personaje_pokemon === elegido
                      return (
                        <button key={p.id_personaje_pokemon} onClick={() => setElegido(p.id_personaje_pokemon)}
                          className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                            activo ? 'bg-cyan-500/15 ring-1 ring-cyan-400' : 'bg-superficie hover:bg-relleno-2'}`}>
                          {p.sprite
                            ? <img src={p.sprite} alt="" className="w-9 h-9 object-contain shrink-0" />
                            : <span className="w-9 h-9 shrink-0" />}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-white truncate">{p.apodo}</span>
                            <span className="block text-[11px] text-texto-2 truncate">
                              {p.especie} · Nv {p.nivel} · {p.en_equipo ? 'Cinturón' : 'Femputadora'}
                            </span>
                          </span>
                          {p.debe_olvidar && (
                            <span title="Ya tiene 4 movimientos: tendrá que olvidar uno"
                              className="shrink-0 text-[9px] font-black uppercase text-tinte bg-tinte/10 border border-tinte/40 rounded px-1.5 py-0.5">
                              4/4
                            </span>
                          )}
                          {activo && <Check size={15} className="text-cyan-300 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )
          )}

          {paso === 'olvidar' && poke && (
            <>
              <p className="text-xs text-texto mb-3">
                <b className="text-white">{poke.apodo}</b> ya conoce 4 movimientos. Elige cuál olvidará para
                aprender <b className="text-cyan-300">{moveNombre}</b>.
              </p>
              <div className="space-y-1.5">
                {poke.moves.map(m => {
                  const activo = m.id === olvidar
                  return (
                    <button key={m.id} onClick={() => setOlvidar(m.id)}
                      className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                        activo ? 'bg-red-500/15 ring-1 ring-tinte/50' : 'bg-superficie hover:bg-relleno-2'}`}>
                      <span className="text-sm font-bold text-white truncate">{m.move_name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {m.move_type && <span className="text-[10px] text-texto-2">{m.move_type}</span>}
                        {activo && <span className="text-[10px] font-black uppercase text-tinte">Olvidar</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {error && <p className="mt-3 text-xs text-tinte font-medium">{error}</p>}
        </div>

        <div className="px-4 py-3 border-t border-separador flex items-center justify-end gap-2 shrink-0">
          {paso === 'olvidar' && (
            <button onClick={() => setPaso('elegir')} disabled={busy}
              className="text-xs font-bold text-texto hover:text-white px-3 py-2">Atrás</button>
          )}
          {paso === 'aviso' && (
            <button onClick={() => setPaso('elegir')} disabled={!aprobado}
              className="text-xs font-black uppercase tracking-wide text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors">
              Aceptar
            </button>
          )}
          {paso === 'elegir' && (
            <button onClick={confirmarPokemon} disabled={!poke || busy}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors">
              {busy && <PokeballSpinner size={13} />} Confirmar
            </button>
          )}
          {paso === 'olvidar' && (
            <button onClick={aprender} disabled={olvidar == null || busy}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors">
              {busy && <PokeballSpinner size={13} />} Confirmar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

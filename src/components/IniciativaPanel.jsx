import { useState } from 'react'
import { X, Dices, Play, ChevronRight, ChevronLeft, Square, Crown } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

/**
 * Control del orden de turno, solo para el máster.
 *
 * Los NPC y los Pokémon del máster no tiran: él entra una sola vez y juega por
 * todos los suyos, que es como se lleva en la mesa.
 */
export default function IniciativaPanel({ partidaId, iniciativa, presentes, nombresPersonaje = {}, onCambio, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const estado = iniciativa?.estado || null
  const participantes = iniciativa?.participantes || []

  // Quién entra a la ronda: los jugadores conectados con personaje, más el
  // máster. Los espectadores miran, no tiran.
  const candidatos = (() => {
    const vistos = new Set()
    const lista = []
    for (const p of (presentes || [])) {
      if (vistos.has(p.user_id)) continue
      vistos.add(p.user_id)
      if (p.role === 'master') {
        lista.push({ clave: `u${p.user_id}`, user_id: p.user_id, nombre: p.user_name || 'Máster', es_master: true, mod: 0 })
      } else if (p.personaje_id != null) {
        lista.push({
          clave: `u${p.user_id}`, user_id: p.user_id, personaje_id: p.personaje_id,
          nombre: nombresPersonaje[String(p.personaje_id)] || p.user_name || 'Sin nombre',
          es_master: false, mod: 0,
        })
      }
    }
    return lista
  })()

  const llamar = async (metodo, ruta, cuerpo) => {
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/partida/${partidaId}/iniciativa${ruta}`, {
        method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'No se pudo actualizar la iniciativa')
      onCambio?.(d.iniciativa ?? null)
      return true
    } catch (e) {
      setError(e.message || 'No se pudo actualizar la iniciativa')
      return false
    } finally { setBusy(false) }
  }

  const pedir    = () => llamar('POST', '', { participantes: candidatos })
  const comenzar = () => llamar('PUT', '', { iniciativa: { ...iniciativa, estado: 'activa', ronda: 1, turno: 0 } })
  const terminar = () => llamar('PUT', '', { iniciativa: null })
  const mover    = (direccion) => llamar('PATCH', '/turno', { direccion })

  const faltan = participantes.filter(p => !p.listo)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Dices size={18} className="text-amber-400 shrink-0" />
            <h3 className="font-bold text-white text-sm">Iniciativa</h3>
            {estado === 'activa' && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded px-1.5 py-0.5 shrink-0">
                Ronda {iniciativa?.ronda ?? 1}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white shrink-0"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {!estado && (
            <>
              <p className="text-xs text-gray-400">
                Se le pedirá el dado a los {candidatos.length} conectados con personaje, y a ti.
                Tus Pokémon y NPC no tiran: juegas en tu turno.
              </p>
              {candidatos.length === 0 && (
                <p className="text-xs text-amber-300">No hay nadie conectado a quien pedirle iniciativa.</p>
              )}
            </>
          )}

          {participantes.length > 0 && (
            <div className="space-y-1.5">
              {participantes.map((p, i) => {
                const esTurno = estado === 'activa' && i === iniciativa.turno
                return (
                  <div key={p.clave}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      esTurno ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700 bg-gray-800/60'}`}>
                    <span className={`w-5 text-center text-[11px] font-black shrink-0 ${esTurno ? 'text-amber-300' : 'text-gray-500'}`}>
                      {estado === 'activa' ? i + 1 : ''}
                    </span>
                    <span className="flex items-center gap-1 min-w-0 flex-1">
                      {p.es_master && <Crown size={12} className="text-amber-400 shrink-0" />}
                      <span className={`text-sm truncate ${esTurno ? 'text-white font-bold' : 'text-gray-200'}`}>{p.nombre}</span>
                    </span>
                    {p.listo ? (
                      <span className="shrink-0 text-xs font-black tabular-nums text-amber-300">
                        {p.total}
                        <span className="text-[10px] font-normal text-gray-500 ml-1">
                          ({p.d20}{p.mod >= 0 ? '+' : ''}{p.mod})
                        </span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold text-gray-500">esperando…</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {estado === 'pidiendo' && faltan.length > 0 && (
            <p className="text-[11px] text-gray-500">
              Puedes comenzar sin esperar a {faltan.length === 1 ? 'quien falta' : 'los que faltan'}: quedarán de últimos.
            </p>
          )}

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex items-center gap-2 shrink-0">
          {!estado && (
            <button onClick={pedir} disabled={busy || candidatos.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700
                         disabled:opacity-40 px-4 py-2 rounded-xl transition-colors">
              {busy ? <PokeballSpinner size={15} /> : <Dices size={15} />} Pedir iniciativa
            </button>
          )}

          {estado === 'pidiendo' && (
            <>
              <button onClick={terminar} disabled={busy}
                className="text-sm font-semibold text-gray-400 hover:text-white px-3 py-2 rounded-xl disabled:opacity-40">Cancelar</button>
              <button onClick={comenzar} disabled={busy || !participantes.some(p => p.listo)}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700
                           disabled:opacity-40 px-4 py-2 rounded-xl transition-colors">
                <Play size={15} /> Comenzar
              </button>
            </>
          )}

          {estado === 'activa' && (
            <>
              <button onClick={() => mover('anterior')} disabled={busy} title="Turno anterior"
                className="shrink-0 p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => mover('siguiente')} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700
                           disabled:opacity-40 px-3 py-2 rounded-xl transition-colors">
                Siguiente <ChevronRight size={15} />
              </button>
              <button onClick={terminar} disabled={busy} title="Terminar el combate"
                className="shrink-0 p-2 rounded-xl bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white border border-gray-700 disabled:opacity-40">
                <Square size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

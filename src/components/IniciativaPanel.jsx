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
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-sm flex flex-col shadow-hoja overflow-hidden max-h-[85vh]">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Dices size={18} className="text-tinte shrink-0" />
            <h3 className="font-bold text-white text-sm">Iniciativa</h3>
            {estado === 'activa' && (
              <span className="text-[10px] font-bold text-tinte bg-tinte/10 border border-tinte/40 rounded px-1.5 py-0.5 shrink-0">
                Ronda {iniciativa?.ronda ?? 1}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-texto-2 hover:text-white shrink-0"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {!estado && (
            <>
              <p className="text-xs text-texto-2">
                Se le pedirá el dado a los {candidatos.length} conectados con personaje, y a ti.
                Tus Pokémon y NPC no tiran: juegas en tu turno.
              </p>
              {candidatos.length === 0 && (
                <p className="text-xs text-tinte">No hay nadie conectado a quien pedirle iniciativa.</p>
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
                      esTurno ? 'border-tinte bg-tinte/10' : 'border-separador bg-superficie'}`}>
                    <span className={`w-5 text-center text-[11px] font-black shrink-0 ${esTurno ? 'text-tinte' : 'text-texto-2'}`}>
                      {estado === 'activa' ? i + 1 : ''}
                    </span>
                    <span className="flex items-center gap-1 min-w-0 flex-1">
                      {p.es_master && <Crown size={12} className="text-tinte shrink-0" />}
                      <span className={`text-sm truncate ${esTurno ? 'text-white font-bold' : 'text-texto'}`}>{p.nombre}</span>
                    </span>
                    {p.listo ? (
                      <span className="shrink-0 text-xs font-black tabular-nums text-tinte">
                        {p.total}
                        <span className="text-[10px] font-normal text-texto-2 ml-1">
                          ({p.d20}{p.mod >= 0 ? '+' : ''}{p.mod})
                        </span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold text-texto-2">esperando…</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {estado === 'pidiendo' && faltan.length > 0 && (
            <p className="text-[11px] text-texto-2">
              Puedes comenzar sin esperar a {faltan.length === 1 ? 'quien falta' : 'los que faltan'}: quedarán de últimos.
            </p>
          )}

          {error && <p className="text-xs text-tinte font-medium">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-separador flex items-center gap-2 shrink-0">
          {!estado && (
            <button onClick={pedir} disabled={busy || candidatos.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-acento hover:bg-acento-hover
                         disabled:opacity-40 px-4 py-2 rounded-xl transition-colors">
              {busy ? <PokeballSpinner size={15} /> : <Dices size={15} />} Pedir iniciativa
            </button>
          )}

          {estado === 'pidiendo' && (
            <>
              <button onClick={terminar} disabled={busy}
                className="text-sm font-semibold text-texto-2 hover:text-white px-3 py-2 rounded-xl disabled:opacity-40">Cancelar</button>
              <button onClick={comenzar} disabled={busy || !participantes.some(p => p.listo)}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-ok hover:brightness-110
                           disabled:opacity-40 px-4 py-2 rounded-xl transition-colors">
                <Play size={15} /> Comenzar
              </button>
            </>
          )}

          {estado === 'activa' && (
            <>
              <button onClick={() => mover('anterior')} disabled={busy} title="Turno anterior"
                className="shrink-0 p-2 rounded-xl bg-superficie hover:bg-relleno-2 text-texto border border-separador disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => mover('siguiente')} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-acento hover:bg-acento-hover
                           disabled:opacity-40 px-3 py-2 rounded-xl transition-colors">
                Siguiente <ChevronRight size={15} />
              </button>
              <button onClick={terminar} disabled={busy} title="Terminar el combate"
                className="shrink-0 p-2 rounded-xl bg-superficie hover:bg-acento-hover text-texto hover:text-white border border-separador disabled:opacity-40">
                <Square size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

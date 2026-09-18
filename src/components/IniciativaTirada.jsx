import { useState, useEffect } from 'react'
import { Dices, Check } from 'lucide-react'
import { apiFetch } from '../api'
import { construirSkillsTrainer } from '../lib/trainerStats'
import PokeballSpinner from './PokeballSpinner'

/**
 * Pide la tirada de iniciativa a quien todavía no la ha metido.
 *
 * Aparece sola en cuanto el máster abre la ronda y no se puede cerrar: el
 * combate no arranca hasta que estén todos, así que dejarla esconder solo
 * conseguiría que el resto de la mesa espere sin saber a quién.
 *
 * El modificador del jugador es su DEX ya bonificado -el mismo "Init" de su
 * ficha-, así que solo teclea el dado. El máster no tiene personaje: él escribe
 * el suyo, que puede ser el del enemigo de turno.
 */
export default function IniciativaTirada({ partidaId, personajeId, esMaster, onListo }) {
  const [d20, setD20] = useState('')
  const [mod, setMod] = useState('0')
  // El máster escribe su modificador, así que para él no hay nada que buscar
  const [cargando, setCargando] = useState(!esMaster && personajeId != null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // El modificador del jugador sale de su ficha, con feats, especialidades y ruta
  useEffect(() => {
    if (esMaster || personajeId == null) return
    apiFetch(`/personaje/${personajeId}/full`).then(r => r.json())
      .then(d => setMod(String(construirSkillsTrainer(d).dexMod ?? 0)))
      .catch(() => setMod('0'))
      .finally(() => setCargando(false))
  }, [esMaster, personajeId])

  const dado = Number(d20)
  const valido = Number.isInteger(dado) && dado >= 1 && dado <= 20
  const bono = Number(mod) || 0

  const enviar = async () => {
    if (!valido || busy) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/partida/${partidaId}/iniciativa/tirada`, {
        method: 'PATCH',
        // El personaje viaja para que el servidor ponga el nombre bien: él
        // comprueba que sea de verdad de quien tira antes de usarlo.
        body: JSON.stringify({ d20: dado, mod: bono, personaje_id: esMaster ? null : personajeId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar la tirada')
      onListo?.(data.iniciativa)
    } catch (e) {
      setError(e.message || 'No se pudo enviar la tirada')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="bg-gray-900 border border-amber-500/40 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2">
          <Dices size={18} className="text-amber-400 shrink-0" />
          <h3 className="font-bold text-white text-sm">Tira iniciativa</h3>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
            <PokeballSpinner size={16} className="mr-2" /> Buscando tu modificador...
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Resultado del d20</label>
              <input type="number" min="1" max="20" value={d20} autoFocus
                onChange={e => setD20(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={e => { if (e.key === 'Enter' && valido) enviar() }}
                placeholder="1 - 20"
                className="w-full px-3 py-2 text-lg font-black text-center text-white bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            {esMaster ? (
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tu modificador</label>
                <input type="number" value={mod}
                  onChange={e => setMod(e.target.value.replace(/[^0-9-]/g, ''))}
                  className="w-full px-3 py-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">
                Tu modificador de iniciativa es{' '}
                <span className="font-bold text-amber-300">{bono >= 0 ? `+${bono}` : bono}</span>, se suma solo.
              </p>
            )}

            {/* El total en grande: es lo que se va a comparar con el resto */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-[11px] text-gray-500">Total</span>
              <span className={`text-2xl font-black tabular-nums ${valido ? 'text-amber-300' : 'text-gray-600'}`}>
                {valido ? dado + bono : '—'}
              </span>
            </div>

            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-700">
          <button onClick={enviar} disabled={!valido || busy || cargando}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700
                       disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors">
            {busy ? <PokeballSpinner size={15} /> : <Check size={15} />} Enviar
          </button>
        </div>
      </div>
    </div>
  )
}

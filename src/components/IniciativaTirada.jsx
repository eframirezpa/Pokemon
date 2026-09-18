import { useState, useEffect } from 'react'
import { Dices, Check, User } from 'lucide-react'
import { apiFetch } from '../api'
import { construirSkillsTrainer, statModPokemon, tieneFeat } from '../lib/trainerStats'
import PokeballSpinner from './PokeballSpinner'

/**
 * Pide la tirada de iniciativa a quien todavía no la ha metido.
 *
 * Aparece sola en cuanto el máster abre la ronda y no se puede cerrar: el
 * combate no arranca hasta que estén todos, así que dejarla esconder solo
 * conseguiría que el resto de la mesa espere sin saber a quién.
 *
 * El modificador del jugador es el "Init" de su ficha -DEX ya bonificado-, o
 * el del Pokémon invocado si elige tirar con él (mismo cálculo, otro dueño).
 * El máster no tiene personaje ni Pokémon: él escribe el suyo, que puede ser
 * el del enemigo de turno.
 *
 * Alert / Alert Pokemon: quien tenga el feat suma su bono de proficiencia a
 * la iniciativa. Se detecta solo y se sujeta al ser vivo que corresponda -el
 * del entrenador si tira él, el del Pokémon si tira con él-, no a ambos.
 */
export default function IniciativaTirada({ partidaId, personajeId, esMaster, pokemonInvocado = null, onListo }) {
  const [d20, setD20] = useState('')
  const [modMaster, setModMaster] = useState('0')     // el máster escribe el suyo a mano
  const [cargando, setCargando] = useState(!esMaster && personajeId != null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Con qué ser vivo se tira. Sin Pokémon invocado no hay nada que elegir:
  // arranca ya resuelto en 'trainer' y la pantalla de selección ni se pinta.
  const [serVivo, setSerVivo] = useState(pokemonInvocado == null ? 'trainer' : null)
  const [trainerInfo, setTrainerInfo] = useState(null)  // { mod, conAlert }
  const [pokeInfo, setPokeInfo] = useState(null)        // { mod, conAlert, nombre, sprite }

  // El modificador del jugador sale de su ficha, con feats, especialidades y ruta.
  // Se busca de una vez tanto el del entrenador como el del Pokémon invocado
  // -si hay uno-, para que elegir no tenga que esperar una segunda petición.
  useEffect(() => {
    if (esMaster || personajeId == null) return
    let cancelado = false
    setCargando(true)
    const pedirTrainer = apiFetch(`/personaje/${personajeId}/full`).then(r => r.json())
      .then(d => {
        if (cancelado) return
        const { dexMod } = construirSkillsTrainer(d)
        const conAlert = tieneFeat(d.extra_feats, 'alert')
        const prof = Number(d.personaje_prof) || 0
        setTrainerInfo({ mod: dexMod + (conAlert ? prof : 0), conAlert, prof })
      })
      .catch(() => { if (!cancelado) setTrainerInfo({ mod: 0, conAlert: false, prof: 0 }) })

    const pedirPoke = pokemonInvocado == null ? Promise.resolve() : apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}`).then(r => r.json())
      .then(d => {
        if (cancelado) return
        const conAlert = tieneFeat(d.feats, 'alert_p')
        const prof = Number(d.pokemon_proficient) || 0
        setPokeInfo({
          mod: statModPokemon(d, 'dex') + (conAlert ? prof : 0), conAlert, prof,
          nombre: d.pokemon_apodo || 'Pokémon',
          sprite: (d.personaje_pokemon_is_shiny && d.pokemon_media_main_shiny) ? d.pokemon_media_main_shiny : d.pokemon_media_main,
        })
      })
      .catch(() => { if (!cancelado) setPokeInfo({ mod: 0, conAlert: false, prof: 0, nombre: 'Pokémon', sprite: null }) })

    Promise.all([pedirTrainer, pedirPoke]).finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [esMaster, personajeId, pokemonInvocado])

  const dado = Number(d20)
  const valido = Number.isInteger(dado) && dado >= 1 && dado <= 20
  const bono = esMaster ? (Number(modMaster) || 0) : (serVivo === 'pokemon' ? pokeInfo?.mod : trainerInfo?.mod) ?? 0

  const enviar = async () => {
    if (!valido || busy) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/partida/${partidaId}/iniciativa/tirada`, {
        method: 'PATCH',
        // El personaje (y el Pokémon, si se eligió tirar con él) viajan para
        // que el servidor ponga el nombre bien: comprueba que sea de verdad
        // de quien tira antes de usarlo.
        body: JSON.stringify({
          d20: dado, mod: bono,
          personaje_id: esMaster ? null : personajeId,
          personaje_pokemon_id: (!esMaster && serVivo === 'pokemon') ? pokemonInvocado : null,
          con_alert: !esMaster && !!(serVivo === 'pokemon' ? pokeInfo?.conAlert : trainerInfo?.conAlert),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar la tirada')
      onListo?.(data.iniciativa)
    } catch (e) {
      setError(e.message || 'No se pudo enviar la tirada')
      setBusy(false)
    }
  }

  // ── Pantalla de selección: con qué ser vivo se juega esta iniciativa ──
  if (!esMaster && serVivo == null) {
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
        <div className="bg-gray-900 border border-amber-500/40 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2">
            <Dices size={18} className="text-amber-400 shrink-0" />
            <h3 className="font-bold text-white text-sm">¿Con quién tiras iniciativa?</h3>
          </div>
          <div className="px-5 py-4 space-y-2">
            <button onClick={() => setSerVivo('trainer')} disabled={cargando}
              className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-40
                         border border-gray-700 rounded-xl px-3 py-2.5 transition-colors text-left">
              <span className="shrink-0 w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">
                <User size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">Entrenador</span>
                {trainerInfo && (
                  <span className="block text-[11px] text-gray-400">
                    Modificador <span className="font-bold text-amber-300">{trainerInfo.mod >= 0 ? `+${trainerInfo.mod}` : trainerInfo.mod}</span>
                    {trainerInfo.conAlert && ' (incluye Alert)'}
                  </span>
                )}
              </span>
              {cargando && !trainerInfo && <PokeballSpinner size={14} />}
            </button>

            {pokemonInvocado != null && (
              <button onClick={() => setSerVivo('pokemon')} disabled={cargando}
                className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-40
                           border border-gray-700 rounded-xl px-3 py-2.5 transition-colors text-left">
                <span className="shrink-0 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center overflow-hidden">
                  {pokeInfo?.sprite
                    ? <img src={pokeInfo.sprite} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.opacity = '0.2' }} />
                    : <Dices size={16} className="text-gray-500" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white truncate">{pokeInfo?.nombre || 'Pokémon'}</span>
                  {pokeInfo && (
                    <span className="block text-[11px] text-gray-400">
                      Modificador <span className="font-bold text-amber-300">{pokeInfo.mod >= 0 ? `+${pokeInfo.mod}` : pokeInfo.mod}</span>
                      {pokeInfo.conAlert && ' (incluye Alert Pokemon)'}
                    </span>
                  )}
                </span>
                {cargando && !pokeInfo && <PokeballSpinner size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>
    )
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
                <input type="number" value={modMaster}
                  onChange={e => setModMaster(e.target.value.replace(/[^0-9-]/g, ''))}
                  className="w-full px-3 py-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">
                {serVivo === 'pokemon' ? `El modificador de ${pokeInfo?.nombre || 'tu Pokémon'} es` : 'Tu modificador de iniciativa es'}{' '}
                <span className="font-bold text-amber-300">{bono >= 0 ? `+${bono}` : bono}</span>, se suma solo.
                {(serVivo === 'pokemon' ? pokeInfo?.conAlert : trainerInfo?.conAlert) && (
                  <> Incluye el bono de proficiencia de {serVivo === 'pokemon' ? 'Alert Pokemon' : 'Alert'}.</>
                )}
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

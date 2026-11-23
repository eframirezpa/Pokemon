import { useState, useEffect } from 'react'
import { Dices, Check, User } from 'lucide-react'
import { apiFetch } from '../api'
import { construirSkillsTrainer, statModPokemon, tieneFeat } from '../lib/trainerStats'
import PokeballSpinner from './PokeballSpinner'
import BotonDado from './dados/BotonDado'
import { notacion } from '../lib/dados'

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
export default function IniciativaTirada({ partidaId, personajeId, esMaster, pokemonInvocado = null, onListo, onRegistrar = null }) {
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
        // Alert puede venir de un feat agregado o de la cuna (origen/background, p. ej.
        // Pilot): esos no están en extra_feats, los otorga el origen y se leen aparte.
        const conAlert = tieneFeat([...(d.extra_feats || []), d.origin_feat, d.background_feat].filter(Boolean), 'alert')
        const prof = Number(d.personaje_prof) || 0
        setTrainerInfo({ mod: dexMod + (conAlert ? prof : 0), conAlert, prof, nombre: d.nombre_personaje || null })
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
      // La iniciativa queda en el chat al enviarla, con dado o escrita a mano:
      // el botón del dado anota la tirada, esto anota el resultado que cuenta.
      const quien = esMaster ? 'El DM'
        : serVivo === 'pokemon' ? (pokeInfo?.nombre || 'El Pokémon') : (trainerInfo?.nombre || 'El entrenador')
      const signo = bono >= 0 ? `+ ${bono}` : `− ${Math.abs(bono)}`
      onRegistrar?.(`Iniciativa de ${quien}: ${dado + bono} (d20 ${dado} ${signo})`)
      onListo?.(data.iniciativa)
    } catch (e) {
      setError(e.message || 'No se pudo enviar la tirada')
      setBusy(false)
    }
  }

  // ── Pantalla de selección: con qué ser vivo se juega esta iniciativa ──
  if (!esMaster && serVivo == null) {
    return (
      <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo">
        <div className="bg-fondo text-texto border border-tinte/40 animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-xs shadow-hoja overflow-hidden">
          <div className="px-5 py-4 border-b border-separador flex items-center gap-2">
            <Dices size={18} className="text-tinte shrink-0" />
            <h3 className="font-bold text-white text-sm">¿Con quién tiras iniciativa?</h3>
          </div>
          <div className="px-5 py-4 space-y-2">
            <button onClick={() => setSerVivo('trainer')} disabled={cargando}
              className="w-full flex items-center gap-3 bg-superficie hover:bg-relleno-2 disabled:opacity-40
                         border border-separador rounded-xl px-3 py-2.5 transition-colors text-left">
              <span className="shrink-0 w-9 h-9 rounded-full bg-elevada flex items-center justify-center text-texto">
                <User size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">Entrenador</span>
                {trainerInfo && (
                  <span className="block text-[11px] text-texto-2">
                    Modificador <span className="font-bold text-tinte">{trainerInfo.mod >= 0 ? `+${trainerInfo.mod}` : trainerInfo.mod}</span>
                    {trainerInfo.conAlert && ' (incluye Alert)'}
                  </span>
                )}
              </span>
              {cargando && !trainerInfo && <PokeballSpinner size={14} />}
            </button>

            {pokemonInvocado != null && (
              <button onClick={() => setSerVivo('pokemon')} disabled={cargando}
                className="w-full flex items-center gap-3 bg-superficie hover:bg-relleno-2 disabled:opacity-40
                           border border-separador rounded-xl px-3 py-2.5 transition-colors text-left">
                <span className="shrink-0 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center overflow-hidden">
                  {pokeInfo?.sprite
                    ? <img src={pokeInfo.sprite} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.opacity = '0.2' }} />
                    : <Dices size={16} className="text-texto-2" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white truncate">{pokeInfo?.nombre || 'Pokémon'}</span>
                  {pokeInfo && (
                    <span className="block text-[11px] text-texto-2">
                      Modificador <span className="font-bold text-tinte">{pokeInfo.mod >= 0 ? `+${pokeInfo.mod}` : pokeInfo.mod}</span>
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
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo">
      <div className="bg-fondo text-texto border border-tinte/40 animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-xs shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center gap-2">
          <Dices size={18} className="text-tinte shrink-0" />
          <h3 className="font-bold text-white text-sm">Tira iniciativa</h3>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-10 text-texto-2 text-sm">
            <PokeballSpinner size={16} className="mr-2" /> Buscando tu modificador...
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-texto-2 uppercase tracking-wide mb-1">Resultado del d20</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="20" value={d20} autoFocus
                  onChange={e => setD20(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter' && valido) enviar() }}
                  placeholder="1 - 20"
                  className="w-full px-3 py-2 text-lg font-black text-center text-white bg-superficie border border-separador rounded-xl focus:outline-none focus:ring-2 focus:ring-tinte/60" />
                {/* Solo el d20: el modificador lo suma la iniciativa aparte */}
                <BotonDado notacion={notacion({ cantidad: 1, caras: 20, mod: Number(bono) || 0 })} etiqueta="iniciativa" usar="dado" onResultado={v => setD20(String(v))} className="w-11 h-11" />
              </div>
            </div>

            {esMaster ? (
              <div>
                <label className="block text-[11px] font-bold text-texto-2 uppercase tracking-wide mb-1">Tu modificador</label>
                <input type="number" value={modMaster}
                  onChange={e => setModMaster(e.target.value.replace(/[^0-9-]/g, ''))}
                  className="w-full px-3 py-2 text-sm text-white bg-superficie border border-separador rounded-xl focus:outline-none focus:ring-2 focus:ring-tinte/60" />
              </div>
            ) : (
              <p className="text-[11px] text-texto-2">
                {serVivo === 'pokemon' ? `El modificador de ${pokeInfo?.nombre || 'tu Pokémon'} es` : 'Tu modificador de iniciativa es'}{' '}
                <span className="font-bold text-tinte">{bono >= 0 ? `+${bono}` : bono}</span>, se suma solo.
                {(serVivo === 'pokemon' ? pokeInfo?.conAlert : trainerInfo?.conAlert) && (
                  <> Incluye el bono de proficiencia de {serVivo === 'pokemon' ? 'Alert Pokemon' : 'Alert'}.</>
                )}
              </p>
            )}

            {/* El total en grande: es lo que se va a comparar con el resto */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-[11px] text-texto-2">Total</span>
              <span className={`text-2xl font-black tabular-nums ${valido ? 'text-tinte' : 'text-texto-2'}`}>
                {valido ? dado + bono : '—'}
              </span>
            </div>

            {error && <p className="text-xs text-tinte font-medium">{error}</p>}
          </div>
        )}

        <div className="px-5 py-3 border-t border-separador">
          <button onClick={enviar} disabled={!valido || busy || cargando}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-acento hover:bg-acento-hover
                       disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors">
            {busy ? <PokeballSpinner size={15} /> : <Check size={15} />} Enviar
          </button>
        </div>
      </div>
    </div>
  )
}

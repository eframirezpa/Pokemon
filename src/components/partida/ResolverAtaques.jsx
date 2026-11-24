import { useEffect, useRef, useState } from 'react'
import { ShieldAlert, Swords, Check, X as Equis } from 'lucide-react'
import { apiFetch } from '../../api'
import Hoja from '../ui/Hoja'
import Boton from '../ui/Boton'
import BotonDado from '../dados/BotonDado'
import { relacionContra, danoTrasRelacion, etiquetaRelacion } from '../../lib/objetivos'
import { getEffectivenessRows, effectivenessByNames } from '../../lib/typeEffect'
import { statModPokemon } from '../../lib/trainerStats'

const signo = (n) => (n >= 0 ? `+${n}` : `${n}`)

/**
 * Ataques de los jugadores contra lo del DM (plan-xp-y-mesa, etapa 7). Vive en
 * la pantalla del DM, que siempre está abierta en partida: ahí están la AC y
 * la vida de sus Pokémon, que el jugador no ve.
 *
 * - Pokémon con tirada de ataque: se resuelve solo contra su AC.
 * - Pokémon y movimiento con salvación: el DM tira la salvación de su Pokémon.
 * - NPC (sin AC): el DM confirma si acertó.
 * Si acierta, el daño (con la efectividad de tipo en los movimientos) se resta
 * con el mismo camino que los botones −/+ del DM —salvo con "Daño automático"
 * apagado—, queda la línea en el registro y el jugador recibe un aviso breve.
 *
 *   cola: [{ id, user_id, quien, move, tipoAtaque: 'move'|'arma', moveType, saveAttr,
 *            objetivo: { tipo: 'pokemon'|'npc', uid }, ataque, dificultad, critico, pifia, dano, curacion }]
 */
export default function ResolverAtaques({ cola, consumir, pokemons, npcs, danoAuto, onHpPokemon, onHpNpc, anunciar, responder }) {
  const [efect, setEfect] = useState(null)
  const [detalles, setDetalles] = useState({})   // id_master_pokemon → detalle (AC, stats)
  const procesando = useRef(null)
  useEffect(() => { getEffectivenessRows().then(setEfect) }, [])

  const actual = cola[0] || null
  const pk = actual?.objetivo?.tipo === 'pokemon' ? pokemons.find(p => String(p.uid) === String(actual.objetivo.uid)) : null
  const npc = actual?.objetivo?.tipo === 'npc' ? npcs.find(n => String(n.uid) === String(actual.objetivo.uid)) : null
  const det = pk ? detalles[pk.master_pokemon_id] : null
  const nombreObj = pk ? (pk.hidden ? 'el Pokémon' : pk.name) : npc ? (npc.hidden ? 'alguien' : npc.name) : 'el objetivo'

  // Termina un ataque: resta la vida si acertó, registro, aviso al jugador
  const terminar = (a, acierto, dano, extra = '') => {
    const final = Math.max(0, Math.floor(Number(dano) || 0))
    if (acierto && final > 0 && danoAuto) {
      if (pk) onHpPokemon(pk.uid, -final)
      else if (npc) onHpNpc(npc.uid, -final)
    }
    const conDano = acierto && final > 0 ? ` · ${final} de daño` : ''
    anunciar(`Resultado: ${a.quien} ${acierto ? 'acertó a' : 'falló contra'} ${nombreObj}${extra}${conDano}`)
    responder({ id: a.id, user_id: a.user_id, acierto,
      texto: acierto ? `¡Acertaste a ${nombreObj}!${final > 0 ? ` ${final} de daño` : ''}${extra}` : `Fallaste contra ${nombreObj}${extra}` })
    // procesando se queda con este id (son únicos): aunque la cola tarde un
    // render en soltarlo, no se resuelve dos veces
    procesando.current = a.id
    consumir(a.id)
  }

  // Daño de un movimiento tras la efectividad de tipo; las armas no tienen tipo
  const danoContra = (a) => {
    if (a.dano == null || a.curacion) return { dano: 0, extra: '' }
    if (a.tipoAtaque !== 'move' || !pk || !efect) return { dano: a.dano, extra: '' }
    const rel = relacionContra(effectivenessByNames(efect, pk.type1, pk.type2), a.moveType)
    const et = etiquetaRelacion(rel)
    return { dano: danoTrasRelacion(a.dano, rel), extra: et ? ` (${et})` : '' }
  }

  // Detalle del Pokémon del DM (AC y stats), una vez por Pokémon
  useEffect(() => {
    if (!pk || detalles[pk.master_pokemon_id]) return
    let vigente = true
    apiFetch(`/master/pokemon/${pk.master_pokemon_id}`).then(r => r.json())
      .then(d => { if (vigente) setDetalles(x => ({ ...x, [pk.master_pokemon_id]: d })) }).catch(() => {})
    return () => { vigente = false }
  }, [pk, detalles])

  // Lo que se resuelve solo: objetivo que ya no está, y ataque contra un Pokémon
  useEffect(() => {
    if (!actual || procesando.current === actual.id) return
    if (!pk && !npc) {
      procesando.current = actual.id
      responder({ id: actual.id, user_id: actual.user_id, acierto: false, texto: 'El objetivo ya no está en el campo' })
      consumir(actual.id)
      return
    }
    if (!pk || !det || !efect) return
    if (actual.ataque == null && actual.dificultad != null) return   // salvación: la tira el DM
    procesando.current = actual.id
    if (actual.ataque == null) { terminar(actual, true, danoContra(actual).dano); return }
    const ac = Number(det.personaje_pokemon_ac) || null
    const acierto = !!actual.critico || (!actual.pifia && ac != null && actual.ataque >= ac)
    const { dano, extra } = danoContra(actual)
    terminar(actual, acierto, dano, acierto ? `${actual.critico ? ' ¡crítico!' : ''}${extra}` : (actual.pifia ? ' (¡pifia!)' : ''))
  })

  if (!actual) return null

  // NPC: no tiene AC, decide el DM
  if (npc) {
    const { dano } = danoContra(actual)
    return (
      <Hoja z="z-[124]" ancho="sm:max-w-sm"
        titulo={<span className="flex items-center gap-2"><Swords size={18} className="text-tinte" /> ¿Acertó?</span>}>
        <p className="text-[15px]">
          <b>{actual.quien}</b> atacó a <b>{npc.name}</b> con {actual.move}
          {actual.ataque != null && <> · ataque <b className="tabular-nums">{actual.ataque}</b></>}
          {actual.dificultad != null && <> · DC <b className="tabular-nums">{actual.dificultad}</b> ({actual.saveAttr})</>}
          {actual.critico && ' · ¡crítico!'}
        </p>
        <p className="text-[13px] text-texto-2 mt-1">
          Los NPC no tienen AC en la app: decide tú.{dano > 0 && ` Si acertó, ${danoAuto ? 'se le restan' : 'se anuncian'} ${dano} de daño.`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Boton variante="tintado" onClick={() => terminar(actual, false, 0)}><Equis size={16} /> Falló</Boton>
          <Boton onClick={() => terminar(actual, true, dano)}><Check size={16} /> Acertó</Boton>
        </div>
      </Hoja>
    )
  }

  // Pokémon con salvación: la tira el DM
  if (pk && det && actual.ataque == null && actual.dificultad != null) {
    return <SalvacionDm key={actual.id} a={actual} pk={pk} det={det} nombreObj={nombreObj}
      dano={danoContra(actual)} danoAuto={danoAuto} terminar={terminar} />
  }
  return null
}

function SalvacionDm({ a, pk, det, nombreObj, dano, danoAuto, terminar }) {
  const attr = String(a.saveAttr || '').trim().toUpperCase()
  const k = attr.toLowerCase()
  const bono = statModPokemon(det, k) + (det.stats?.[`pokemon_stats_${k}_prof`] ? (Number(det.pokemon_proficient) || 2) : 0)
  const [d20, setD20] = useState('')
  const n = Number(d20)
  const valido = Number.isInteger(n) && n >= 1 && n <= 20
  const total = valido ? n + bono : null
  const supera = total != null ? total >= Number(a.dificultad) : null
  const tirada = valido ? ` (salvación ${total})` : ''
  return (
    <Hoja z="z-[124]" ancho="sm:max-w-sm"
      titulo={<span className="flex items-center gap-2"><ShieldAlert size={18} className="text-aviso" /> Salvación de {pk.name}</span>}>
      <p className="text-[15px]">
        <b>{a.quien}</b> usó <b>{a.move}</b>: {pk.name} tira salvación de <b>{attr}</b> contra <b>DC {a.dificultad}</b>.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <input type="number" min={1} max={20} inputMode="numeric" value={d20} placeholder="1d20"
          onChange={e => setD20(e.target.value)} aria-label="Resultado del d20"
          className="w-20 h-12 rounded-xl bg-relleno text-center text-[22px] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />
        <BotonDado notacion="1d20" etiqueta={`Salvación de ${attr}`} usar="dado" onResultado={v => setD20(String(v))} className="!w-12 !h-12 !rounded-xl" />
        <span className="text-[22px] font-bold tabular-nums text-texto-2">{signo(bono)}</span>
      </div>
      {supera != null && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-[15px] font-semibold text-center ${supera ? 'bg-ok/15 text-ok' : 'bg-peligro/15 text-peligro'}`}>
          {total}: {supera ? 'la superó' : 'la falló'}
        </p>
      )}
      {supera === false && (
        <div className="mt-3">
          <Boton tamano="lg" onClick={() => terminar(a, true, dano.dano, `${tirada}${dano.extra}`)}>
            {dano.dano > 0 ? `${danoAuto ? 'Aplicar' : 'Anunciar'} ${dano.dano} de daño` : 'Aplicar el efecto'}
          </Boton>
        </div>
      )}
      {supera === true && (
        <div className="mt-3">
          <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-texto-2 mb-1.5">La superó: ¿qué le hace?</p>
          <div className="grid grid-cols-3 gap-2">
            <Boton variante="tintado" onClick={() => terminar(a, true, dano.dano, `${tirada}${dano.extra}`)}>Completo</Boton>
            <Boton variante="tintado" onClick={() => terminar(a, true, Math.floor(dano.dano / 2), `${tirada} · mitad`)}>Mitad</Boton>
            <Boton variante="tintado" onClick={() => terminar(a, false, 0, tirada)}>Nada</Boton>
          </div>
        </div>
      )}
      <p className="sr-only">{nombreObj}</p>
    </Hoja>
  )
}

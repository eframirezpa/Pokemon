import { useEffect, useRef, useState } from 'react'
import { ShieldAlert, Swords, Check, X as Equis } from 'lucide-react'
import { apiFetch } from '../../api'
import Hoja from '../ui/Hoja'
import Boton from '../ui/Boton'
import BotonDado, { AvisoDesventaja } from '../dados/BotonDado'
import { relacionContra, danoTrasRelacion, etiquetaRelacion } from '../../lib/objetivos'
import { getEffectivenessRows, effectivenessByNames } from '../../lib/typeEffect'
import { statModPokemon } from '../../lib/trainerStats'
import { leerEstados, estadosInmunes, clavesEstados, esVolatil, enGracia, etiquetaEstado, desventajaSalvacion } from '../../lib/estados'

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
 *            objetivo: { tipo: 'pokemon'|'npc', uid }, ataque, dificultad, critico, pifia, dano, curacion,
 *            proyectil: { nombre, elemento, efecto, descripcion } | null }]
 *
 * Proyectiles (lib/proyectiles.js): el elemental cambia el tipo del daño del
 * arma (moveType), así que cuenta la efectividad contra el Pokémon. Si el
 * proyectil tiene efecto, al acertar sale un paso más: el DM tira la salvación
 * del objetivo y se aplica lo que toque (daño extra, estado…).
 */
export default function ResolverAtaques({ cola, consumir, pokemons, npcs, danoAuto, onHpPokemon, onHpNpc, anunciar, responder, onEstado = null }) {
  const [efect, setEfect] = useState(null)
  const [detalles, setDetalles] = useState({})   // id_master_pokemon → detalle (AC, stats)
  const procesando = useRef(null)
  // Ataque acertado que espera el efecto de su proyectil: { a, dano, extra }
  const [efectoPend, setEfectoPend] = useState(null)
  useEffect(() => { getEffectivenessRows().then(setEfect) }, [])

  const actual = cola[0] || null
  const pk = actual?.objetivo?.tipo === 'pokemon' ? pokemons.find(p => String(p.uid) === String(actual.objetivo.uid)) : null
  const npc = actual?.objetivo?.tipo === 'npc' ? npcs.find(n => String(n.uid) === String(actual.objetivo.uid)) : null
  const det = pk ? detalles[pk.master_pokemon_id] : null
  const nombreObj = pk ? (pk.hidden ? 'el Pokémon' : pk.name) : npc ? (npc.hidden ? 'alguien' : npc.name) : 'el objetivo'

  // Acertó con un proyectil con efecto: antes de cerrar, el paso del efecto.
  // Los efectos solo narrativos (humo, marcas…) van al registro.
  const terminar = (a, acierto, dano, extra = '') => {
    if (acierto && conEfecto(a)) {
      procesando.current = a.id
      setEfectoPend({ a, dano, extra })
      return
    }
    finalizar(a, acierto, dano, `${extra}${notaProyectil(a, acierto)}`)
  }
  const conEfecto = (a) => { const ef = a?.proyectil?.efecto; return !!ef && !ef.nota && !!(pk || npc) }
  const notaProyectil = (a, acierto) => (acierto && a.proyectil?.efecto?.nota && a.proyectil?.descripcion
    ? ` · ${a.proyectil.nombre}: ${a.proyectil.descripcion}` : '')

  // Ataque contra un Pokémon que se resuelve solo (sin salvación): null si no aplica
  const resolucionAuto = (a) => {
    if (!a || !pk || !det || !efect) return null
    if (a.ataque == null && a.dificultad != null) return null   // salvación: la tira el DM
    if (a.ataque == null) return { acierto: true, dano: danoContra(a).dano, extra: '' }
    const ac = Number(det.personaje_pokemon_ac) || null
    const acierto = !!a.critico || (!a.pifia && ac != null && a.ataque >= ac)
    const { dano, extra } = danoContra(a)
    return { acierto, dano, extra: acierto ? `${a.critico ? ' ¡crítico!' : ''}${extra}` : (a.pifia ? ' (¡pifia!)' : '') }
  }

  // Termina un ataque: resta la vida si acertó, registro, aviso al jugador
  const finalizar = (a, acierto, dano, extra = '', { fuego = a.moveType === 'Fire' } = {}) => {
    const final = Math.max(0, Math.floor(Number(dano) || 0))
    // Congelado termina si recibe daño de Fuego
    const ent = pk || npc
    if (acierto && final > 0 && fuego && ent && clavesEstados(ent.estados).includes('congelado')) {
      onEstado?.(pk ? 'pokemon' : 'npc', ent.uid, clavesEstados(ent.estados).filter(c => c !== 'congelado'))
      extra = `${extra} · el fuego lo descongela`
    }
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
    // Movimientos, y armas con proyectil elemental (moveType = su tipo)
    if ((a.tipoAtaque !== 'move' && !a.moveType) || !pk || !efect) return { dano: a.dano, extra: '' }
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
    const r = resolucionAuto(actual)
    if (!r) return
    // Acertó con un proyectil con efecto: lo resuelve el DM (se pinta abajo)
    if (r.acierto && conEfecto(actual)) return
    procesando.current = actual.id
    finalizar(actual, r.acierto, r.dano, `${r.extra}${notaProyectil(actual, r.acierto)}`)
  })

  if (!actual) return null

  // Efecto del proyectil (salvación del objetivo y su consecuencia)
  // (del clic del DM, o el acierto automático contra un Pokémon)
  const auto = resolucionAuto(actual)
  const pend = efectoPend && efectoPend.a.id === actual.id ? efectoPend
    : (auto?.acierto && conEfecto(actual) ? { a: actual, dano: auto.dano, extra: auto.extra } : null)
  if (pend) {
    return <EfectoProyectil key={actual.id} pend={pend} pk={pk} npc={npc} det={det} efect={efect}
      nombreObj={nombreObj} danoAuto={danoAuto} onEstado={onEstado} finalizar={finalizar} />
  }

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
  const desv = desventajaSalvacion(pk.estados, attr)
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
      <AvisoDesventaja motivo={desv} className="mt-3" />
      <div className="mt-4 flex items-center justify-center gap-2">
        <input type="number" min={1} max={20} inputMode="numeric" value={d20} placeholder="1d20"
          onChange={e => setD20(e.target.value)} aria-label="Resultado del d20"
          className="w-20 h-12 rounded-xl bg-relleno text-center text-[22px] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />
        <BotonDado notacion="1d20" etiqueta={`Salvación de ${attr}`} usar="dado" onResultado={v => setD20(String(v))} className="!w-12 !h-12 !rounded-xl"
          modo={desv ? 'desventaja' : null} motivo={desv} />
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

/**
 * Paso del efecto de un proyectil que acertó. El objetivo (Pokémon o NPC del
 * DM) tira su salvación; según el resultado:
 *   - daño extra (Explosive: 2d8 de Fuego, mitad si salva, con su efectividad)
 *   - estado (Poison Darts: Envenenado si falla), salvo inmunidad por tipo o
 *     si ya tiene otro estado (solo uno a la vez)
 *   - curar estado (Antidote Darts: quita Envenenado si salva)
 *   - texto para el registro (somnoliento, velocidad −10…)
 * Lo de área (las criaturas cerca) lo resuelve el DM a mano: se recuerda.
 */
function EfectoProyectil({ pend, pk, npc, det, efect, nombreObj, danoAuto, onEstado, finalizar }) {
  const { a, dano: danoBase, extra: extraBase } = pend
  const ef = a.proyectil.efecto
  const attr = ef.salvacion
  const k = attr.toLowerCase()
  // El Pokémon tiene stats; el NPC no: el DM escribe su bono si lo tiene
  const bonoPk = pk && det ? statModPokemon(det, k) + (det.stats?.[`pokemon_stats_${k}_prof`] ? (Number(det.pokemon_proficient) || 2) : 0) : null
  const [bonoNpc, setBonoNpc] = useState('0')
  const bono = bonoPk ?? (Number(bonoNpc) || 0)
  const [d20, setD20] = useState('')
  const [extraDados, setExtraDados] = useState('')
  const n = Number(d20)
  const valido = Number.isInteger(n) && n >= 1 && n <= 20
  const total = valido ? n + bono : null
  const supera = total != null ? total >= ef.dc : null

  // Daño extra (Explosive): 2d8 entre 2 y 16, mitad si salva, efectividad de su tipo
  const xd = Number(extraDados)
  const extraValido = !ef.dano || (Number.isInteger(xd) && xd >= 2 && xd <= 16)
  let danoExtra = 0, relTexto = ''
  if (ef.dano && extraValido && supera != null) {
    danoExtra = supera && ef.mitad ? Math.floor(xd / 2) : xd
    if (pk && efect) {
      const rel = relacionContra(effectivenessByNames(efect, pk.type1, pk.type2), ef.tipoDano)
      danoExtra = danoTrasRelacion(danoExtra, rel)
      const et = etiquetaRelacion(rel)
      if (et) relTexto = ` (${et})`
    }
  }

  // Estado: inmunidad por tipo y un estado a la vez
  const tipo = pk ? 'pokemon' : 'npc'
  const ent = pk || npc
  // Solo uno no volátil a la vez; el volátil (confuso…) no estorba
  const clavesEnt = clavesEstados(ent?.estados)
  const actualEstado = leerEstados(ent?.estados).find(e => !esVolatil(e.clave)) || null
  const etiquetaDe = etiquetaEstado
  const inmune = ef.estado && pk ? estadosInmunes([pk.type1, pk.type2]).includes(ef.estado) : false
  const gracia = ef.estado ? enGracia(ent?.estadosMeta, ef.estado) : false
  // Desventaja en la salvación por sus estados
  const desv = desventajaSalvacion(clavesEnt, attr)

  const aplicar = () => {
    const partes = [` · ${a.proyectil.nombre}: salvación de ${attr} ${total} contra DC ${ef.dc} (${supera ? 'la superó' : 'la falló'})`]
    if (ef.dano) partes.push(`${danoExtra} de daño de ${ef.tipoDano}${supera && ef.mitad ? ' (mitad)' : ''}${relTexto}`)
    if (ef.estado && !supera) {
      if (inmune) partes.push(`es inmune a ${etiquetaDe(ef.estado).toLowerCase()} por su tipo`)
      else if (gracia) partes.push(`se acaba de recuperar: no puede volver a quedar ${etiquetaDe(ef.estado).toLowerCase()} todavía`)
      else if (actualEstado && actualEstado.clave !== ef.estado) partes.push(`ya está ${actualEstado.label.toLowerCase()}: no puede quedar ${etiquetaDe(ef.estado).toLowerCase()}`)
      else if (!actualEstado) { onEstado?.(tipo, ent.uid, [...clavesEnt, ef.estado]); partes.push(`queda ${etiquetaDe(ef.estado).toLowerCase()}`) }
    }
    if (ef.curaEstado && supera && actualEstado?.clave === ef.curaEstado) {
      onEstado?.(tipo, ent.uid, clavesEnt.filter(c => c !== ef.curaEstado))
      partes.push(ef.supera)
    }
    if (ef.falla && !ef.estado && !supera) partes.push(ef.falla)
    if (ef.area) partes.push(`también afecta a ${ef.area} (lo resuelve el DM)`)
    finalizar(a, true, (Number(danoBase) || 0) + danoExtra, `${extraBase}${partes.join(' · ')}`,
      { fuego: a.moveType === 'Fire' || (ef.tipoDano === 'Fire' && danoExtra > 0) })
  }

  return (
    <Hoja z="z-[124]" ancho="sm:max-w-sm"
      titulo={<span className="flex items-center gap-2"><ShieldAlert size={18} className="text-aviso" /> {a.proyectil.nombre}</span>}>
      <p className="text-[15px]">
        <b>{a.quien}</b> acertó a <b>{nombreObj}</b>{Number(danoBase) > 0 && <> ({danoBase} de daño)</>}. El proyectil pide
        salvación de <b>{attr}</b> contra <b>DC {ef.dc}</b>.
      </p>
      {ef.area && <p className="text-[12px] text-texto-2 mt-1">También afecta a {ef.area}: eso lo resuelves a mano.</p>}
      <AvisoDesventaja motivo={desv} className="mt-3" />
      <div className="mt-4 flex items-center justify-center gap-2">
        <input type="number" min={1} max={20} inputMode="numeric" value={d20} placeholder="1d20"
          onChange={e => setD20(e.target.value)} aria-label="Resultado del d20"
          className="w-20 h-12 rounded-xl bg-relleno text-center text-[22px] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />
        <BotonDado notacion="1d20" etiqueta={`Salvación de ${attr}`} usar="dado" onResultado={v => setD20(String(v))} className="!w-12 !h-12 !rounded-xl"
          modo={desv ? 'desventaja' : null} motivo={desv} />
        {bonoPk != null
          ? <span className="text-[22px] font-bold tabular-nums text-texto-2">{signo(bono)}</span>
          : <input type="number" value={bonoNpc} onChange={e => setBonoNpc(e.target.value)} aria-label="Bono de salvación del NPC"
              title="Bono de salvación del NPC"
              className="w-16 h-12 rounded-xl bg-relleno text-center text-[18px] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />}
      </div>
      {supera != null && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-[15px] font-semibold text-center ${supera ? 'bg-ok/15 text-ok' : 'bg-peligro/15 text-peligro'}`}>
          {total}: {supera ? 'la superó' : 'la falló'}
        </p>
      )}
      {ef.dano && supera != null && (
        <div className="mt-3">
          <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-texto-2 mb-1.5 text-center">
            Daño de {ef.tipoDano} · {ef.dano}{supera && ef.mitad ? ' · mitad' : ''}
          </p>
          <div className="flex items-center justify-center gap-2">
            <input type="number" min={2} max={16} inputMode="numeric" value={extraDados} placeholder={ef.dano}
              onChange={e => setExtraDados(e.target.value)} aria-label={`Daño de ${ef.tipoDano}`}
              className="w-20 h-12 rounded-xl bg-relleno text-center text-[22px] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />
            <BotonDado notacion={ef.dano} etiqueta={`Daño de ${ef.tipoDano}`} usar="dado" onResultado={v => setExtraDados(String(v))} className="!w-12 !h-12 !rounded-xl" />
            <span className="text-[22px] font-bold tabular-nums text-peligro">= {extraValido && extraDados !== '' ? danoExtra : '—'}</span>
          </div>
          {relTexto && <p className="text-center text-[12px] text-texto-2 mt-1">{relTexto.replace(/[()]/g, '')}</p>}
        </div>
      )}
      {supera === false && ef.estado && (
        <p className="mt-3 text-[13px] text-texto-2 text-center">
          {inmune ? `Es inmune a ${etiquetaDe(ef.estado).toLowerCase()} por su tipo.`
            : gracia ? 'Se acaba de recuperar: todavía no puede volver a sufrirlo.'
            : actualEstado && actualEstado.clave !== ef.estado ? `Ya está ${actualEstado.label.toLowerCase()}: solo puede tener un estado.`
            : `Queda ${etiquetaDe(ef.estado).toLowerCase()}.`}
        </p>
      )}
      {supera === false && ef.falla && !ef.estado && <p className="mt-3 text-[13px] text-texto-2 text-center">Si falla: {ef.falla}.</p>}
      {supera === true && ef.curaEstado && (
        <p className="mt-3 text-[13px] text-texto-2 text-center">
          {actualEstado?.clave === ef.curaEstado ? `Se le quita: ${actualEstado.label.toLowerCase()}.` : 'No tenía ese estado: no pasa nada.'}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Boton variante="tintado" onClick={() => finalizar(a, true, danoBase, `${extraBase} · ${a.proyectil.nombre}: efecto sin resolver`)}>
          Omitir efecto
        </Boton>
        <Boton disabled={supera == null || !extraValido || (ef.dano && extraDados === '')} onClick={aplicar}>
          {danoAuto ? 'Aplicar' : 'Anunciar'}
        </Boton>
      </div>
    </Hoja>
  )
}

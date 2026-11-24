import { useEffect, useState } from 'react'
import { Crosshair, Megaphone, Shield, Heart, Check, X as Equis } from 'lucide-react'
import { apiFetch } from '../../api'
import Hoja from '../ui/Hoja'
import Boton from '../ui/Boton'
import FormulaAtaqueModal from '../FormulaAtaqueModal'
import DanoMoveModal from '../DanoMoveModal'
import { tieneDano, esCuracion } from '../../lib/danoMove'
import { relacionContra, danoTrasRelacion, etiquetaRelacion, cuentaRelacion, aplicaStab } from '../../lib/objetivos'
import { getEffectivenessRows, effectivenessByNames, typeNamesByIds } from '../../lib/typeEffect'
import { construirSkillsTrainer, statModPokemon } from '../../lib/trainerStats'
import { acDelTrainer } from '../../lib/trainerCombatShared'
import { hpValues } from '../../lib/hp'
import { clavesEstados, cambiarEstados, desventajaAtaque, desventajaSalvacion, danoMenorDeDos, alternarEstado, esVolatil, enGracia, estadosInmunes, etiquetaEstado, leerEstados, ESTADOS } from '../../lib/estados'
import { estadoDeMovimiento } from '../../lib/estadoMovimiento'

const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha']
// Id de cada salvación pedida: su respuesta trae el mismo
const nuevoIdSalvacion = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/**
 * Ataque de un Pokémon del DM contra un jugador (plan-xp-y-mesa, etapa 5).
 *
 * El DM tira con los dados de la app, igual que los jugadores (las mismas
 * ventanas de fórmula y de daño). La app compara con la AC del objetivo, resta
 * la vida si acierta (salvo con "Daño automático" apagado: entonces solo se
 * anuncia) y lo deja en el chat. Con tirada de salvación, el DM
 * marca el resultado y, si la superó, elige daño completo, mitad o nada.
 *
 *   atacante: entrada del campo (PartidaRoom): { master_pokemon_id, name, hidden, sprite, talla, type1, type2, level }
 *   move:     el movimiento completo (de /master/pokemon/:id)
 */
export default function AtaqueDm({ partidaId, atacante, move, presentes = [], invocados = {}, onAnunciar, onAplicado, onCerrar,
                                   sendSalvacionPedida = null, salvacionResultado = null, restarVida = true }) {
  const [paso, setPaso] = useState('objetivo')   // objetivo · formula · salvacion · dano · listo
  const [datosAtacante, setDatosAtacante] = useState(null)
  const [efectividades, setEfectividades] = useState(null)
  const [party, setParty] = useState(null)
  const [objetivo, setObjetivo] = useState(null) // { tipo, nombre, ac, hp, hpMax, tipos, saves, ruta, ... }
  const [cargando, setCargando] = useState(false)
  const [tirada, setTirada] = useState(null)     // { ataque, dificultad, critico, power, pifia }
  const [salvacion, setSalvacion] = useState(null) // 'fallo' | 'completo' | 'mitad' | 'nada'
  const [idSalvacion, setIdSalvacion] = useState(null) // la pedida al jugador; su respuesta trae el mismo id

  useEffect(() => {
    let vigente = true
    apiFetch(`/master/pokemon/${atacante.master_pokemon_id}`).then(r => r.json()).then(d => { if (vigente) setDatosAtacante(d) }).catch(() => {})
    apiFetch(`/personaje/party?id_partida=${partidaId}`).then(r => r.json()).then(d => { if (vigente) setParty(Array.isArray(d) ? d : []) }).catch(() => {})
    getEffectivenessRows().then(e => { if (vigente) setEfectividades(e) })
    return () => { vigente = false }
  }, [partidaId, atacante.master_pokemon_id])

  const nombreAtacante = atacante.hidden ? 'El Pokémon' : atacante.name
  const stats = datosAtacante ? STATS.map(k => ({
    key: k.toUpperCase(), mod: statModPokemon(datosAtacante, k), prof: !!datosAtacante.stats?.[`pokemon_stats_${k}_prof`],
  })) : []
  const prof = Number(datosAtacante?.pokemon_proficient) || 2
  const stab = aplicaStab(move.move_type, [atacante.type1, atacante.type2].filter(Boolean)) ? (Number(datosAtacante?.personaje_pokemon_stab) || 0) : 0

  // Objetivos: los entrenadores conectados y su Pokémon invocado
  const objetivos = []
  const vistos = new Set()
  for (const p of presentes) {
    if (p.role === 'master' || p.personaje_id == null) continue
    const k = String(p.personaje_id)
    if (vistos.has(k)) continue
    vistos.add(k)
    const c = (party || []).find(x => String(x.id_personaje) === k)
    if (!c) continue
    objetivos.push({ clave: `t-${k}`, tipo: 'trainer', id_personaje: c.id_personaje, nombre: c.nombre_personaje,
      sprite: p.avatar_face_url || null, hp: c.personaje_current_hp ?? c.personaje_hp, hpMax: c.personaje_hp,
      estados: c.personaje_estados || null, estadosMeta: c.personaje_estados_meta || null })
    const inv = k in invocados ? invocados[k] : p.pokemon_invocado
    const pk = inv != null ? (c.pokemons || []).find(x => String(x.id_personaje_pokemon) === String(inv)) : null
    if (pk) objetivos.push({ clave: `p-${pk.id_personaje_pokemon}`, tipo: 'pokemon', id_personaje: c.id_personaje,
      id_personaje_pokemon: pk.id_personaje_pokemon, nombre: pk.pokemon_apodo, dueno: c.nombre_personaje,
      sprite: (pk.pokemon_is_shiny && pk.pokemon_media_sprite_shiny) || pk.pokemon_media_sprite || pk.pokemon_media_main,
      hp: pk.pokemon_current_hp ?? pk.pokemon_hp, hpMax: pk.pokemon_hp,
      estados: pk.personaje_pokemon_estados || null, estadosMeta: pk.personaje_pokemon_estados_meta || null })
  }

  // AC, tipos y salvaciones del objetivo elegido: de su ficha, con las mismas
  // reglas que usa la pantalla del jugador
  const elegir = async (o) => {
    setCargando(true)
    try {
      if (o.tipo === 'trainer') {
        const d = await apiFetch(`/personaje/${o.id_personaje}/full`).then(r => r.json())
        const { dexMod, stats: st } = construirSkillsTrainer(d)
        const { max } = hpValues(d)
        setObjetivo({ ...o, ac: acDelTrainer(d, dexMod), tipos: [], hpMax: max ?? o.hpMax, saves: st, prof: Number(d.personaje_prof) || 2 })
      } else {
        const d = await apiFetch(`/personaje/${o.id_personaje}/pokemon/${o.id_personaje_pokemon}`).then(r => r.json())
        const tipos = typeNamesByIds(efectividades, d.personaje_pokemon_type_1, d.personaje_pokemon_type_2)
        setObjetivo({ ...o, ac: Number(d.personaje_pokemon_ac) || null,
          tipos: tipos.length ? tipos : [d.pokemon_type_1, d.pokemon_type_2].filter(Boolean),
          saves: STATS.map(k => ({ key: k.toUpperCase(), mod: statModPokemon(d, k), prof: !!d.stats?.[`pokemon_stats_${k}_prof`] })),
          prof: Number(d.pokemon_proficient) || 2 })
      }
      setPaso('formula')
    } catch { /* sin ficha no se puede seguir: queda en el selector */ } finally { setCargando(false) }
  }

  const relacion = objetivo?.tipo === 'pokemon' && efectividades
    ? relacionContra(effectivenessByNames(efectividades, objetivo.tipos[0], objetivo.tipos[1]), move.move_type)
    : 'neutral'
  const contra = objetivo ? (objetivo.tipo === 'pokemon' ? `${objetivo.nombre} (de ${objetivo.dueno})` : objetivo.nombre) : null

  // ¿La tirada fue de ataque (contra AC) o solo de salvación?
  const tieneAtaque = tirada?.ataque != null

  const anunciar = (texto, extra = {}) => onAnunciar?.(texto, {
    pokemonName: atacante.name, moveName: move.move_name, type: move.move_type, hidden: !!atacante.hidden,
    sprite: atacante.sprite, talla: atacante.talla, objetivo: contra, ...extra,
  })

  // ── Estado que causa el movimiento (lib/estadoMovimiento.js) ──
  // Directo: al acertar (solo ataque) o al fallar la salvación (solo salvación).
  // Con ataque y salvación: al acertar se pide la salvación para el efecto.
  const estadoMov = estadoDeMovimiento(move)
  const modoEstado = (acerto, salv) => {
    if (!estadoMov) return null
    if (tieneAtaque) {
      if (!acerto) return null
      return move.move_save_attribute && tirada?.dificultad != null ? 'salvacion' : 'directo'
    }
    return salv === 'fallo' || salv === 'completo' ? 'directo' : null
  }
  // Le pone el estado al objetivo (o explica por qué no) y devuelve el texto para el registro
  const ponerEstado = async () => {
    if (!estadoMov) return ''
    const e = ESTADOS.find(x => x.clave === estadoMov.estado)
    const nombreE = etiquetaEstado(estadoMov.estado).toLowerCase()
    if (!estadoMov.auto) return ` · ${nombreE}: revísalo a mano (${estadoMov.motivo})`
    const cs = clavesEstados(objetivo.estados)
    if (estadosInmunes(objetivo.tipos || []).includes(estadoMov.estado)) return ` · es inmune a ${nombreE} por su tipo`
    if (cs.includes(estadoMov.estado)) return ` · ya estaba ${nombreE}`
    if (enGracia(objetivo.estadosMeta, estadoMov.estado)) return ` · se acaba de recuperar: todavía no puede quedar ${nombreE}`
    const nvActual = leerEstados(objetivo.estados).find(x => !esVolatil(x.clave))
    if (!esVolatil(estadoMov.estado) && nvActual) return ` · ya está ${nvActual.label.toLowerCase()}: no puede quedar ${nombreE}`
    // Congelado: DC 10 + la proficiencia de quien lo congela
    const r = cambiarEstados({ claves: cs, meta: objetivo.estadosMeta }, alternarEstado(cs, estadoMov.estado), { dc: 10 + prof })
    const url = objetivo.tipo === 'trainer'
      ? `/personaje/${objetivo.id_personaje}/estados`
      : `/personaje/${objetivo.id_personaje}/pokemon/${objetivo.id_personaje_pokemon}/estados`
    const ok = await apiFetch(url, { method: 'PATCH', body: JSON.stringify({ estados: r.claves, meta: r.meta }) }).then(x => x.ok).catch(() => false)
    if (!ok) return ` · no se pudo poner ${nombreE}: ponlo a mano`
    return ` · queda ${nombreE} ${e?.icono || ''}${estadoMov.estado === 'congelado' ? ` (DC ${10 + prof} para liberarse)` : ''}`
  }
  const [salvEstado, setSalvEstado] = useState(false) // pidiendo la salvación del efecto

  // Resta la vida del objetivo y avisa a la mesa. modo: lo que pasa con el estado
  const aplicar = async (dano, detalle, modo = null) => {
    const cur = Number(objetivo.hp) || 0
    const nuevo = Math.max(0, cur - dano)
    const url = objetivo.tipo === 'trainer'
      ? `/personaje/${objetivo.id_personaje}/combate`
      : `/personaje/${objetivo.id_personaje}/pokemon/${objetivo.id_personaje_pokemon}/combate`
    // Con "Daño automático" apagado se anuncia igual, pero la vida no se toca
    if (restarVida && dano > 0) await apiFetch(url, { method: 'PATCH', body: JSON.stringify({ current_hp: nuevo }) }).catch(() => {})
    // Congelado termina si recibe daño de Fuego
    let deshielo = ''
    if (dano > 0 && move.move_type === 'Fire' && clavesEstados(objetivo.estados).includes('congelado')) {
      const r = cambiarEstados({ claves: objetivo.estados, meta: objetivo.estadosMeta }, clavesEstados(objetivo.estados).filter(c => c !== 'congelado'))
      const urlEst = objetivo.tipo === 'trainer'
        ? `/personaje/${objetivo.id_personaje}/estados`
        : `/personaje/${objetivo.id_personaje}/pokemon/${objetivo.id_personaje_pokemon}/estados`
      await apiFetch(urlEst, { method: 'PATCH', body: JSON.stringify({ estados: r.claves, meta: r.meta }) }).catch(() => {})
      deshielo = ' · el fuego lo descongela'
    }
    const estadoTxt = modo === 'directo' ? await ponerEstado() : ''
    const textoDano = (dano <= 0 ? 'sin daño' : restarVida ? `${dano} de daño (vida ${cur} → ${nuevo})` : `${dano} de daño`) + deshielo + estadoTxt
    anunciar(`${nombreAtacante} usó ${move.move_name} contra ${contra}: ${detalle} · ${textoDano}`,
      { dano, critico: !!tirada?.critico })
    onAplicado?.()
    if (modo === 'salvacion') { pedirSalvacion(tirada.dificultad); setSalvEstado(true); setPaso('salvEstado'); return }
    onCerrar()
  }

  // Sin daño: solo el estado (o la salvación para él) y la línea del registro
  // dc: el de la tirada recién hecha (el estado `tirada` todavía no se actualizó)
  const soloEfecto = async (texto, modo, extra = {}, dc = tirada?.dificultad) => {
    if (modo === 'salvacion') {
      anunciar(texto, extra)
      pedirSalvacion(dc); setSalvEstado(true); setPaso('salvEstado'); return
    }
    const estadoTxt = modo === 'directo' ? await ponerEstado() : ''
    anunciar(`${texto}${estadoTxt}`, extra)
    if (estadoTxt) onAplicado?.()
    onCerrar()
  }

  // Tras la fórmula: con ataque se compara con la AC; con salvación, el DM marca el resultado
  const trasFormula = (ataque, dificultad, critico, power, pifia) => {
    const t = { ataque, dificultad, critico, power, pifia }
    setTirada(t)
    if (ataque != null) {
      // Sin AC en su ficha (personaje sin armadura ni AC guardada): decide el DM
      if (objetivo.ac == null && !critico && !pifia) { setPaso('acierto'); return }
      seguirConAcierto(t, critico || (!pifia && ataque >= objetivo.ac))
      return
    }
    if (dificultad != null) { pedirSalvacion(dificultad); setPaso('salvacion'); return }
    anunciar(`${nombreAtacante} usó ${move.move_name} contra ${contra}`)
    onCerrar()
  }

  // La salvación se le pide al jugador dueño del objetivo, con el bono ya
  // calculado de su ficha (modificador + proficiencia si es competente)
  const atributoSalv = String(move.move_save_attribute || '').trim().toUpperCase()
  const bonoSalv = (() => {
    const sv = (objetivo?.saves || []).find(x => x.key === atributoSalv)
    return sv ? (Number(sv.mod) || 0) + (sv.prof ? (objetivo.prof || 2) : 0) : 0
  })()
  const pedirSalvacion = (dc) => {
    const id = nuevoIdSalvacion()
    setIdSalvacion(id)
    sendSalvacionPedida?.({ id, personaje_id: objetivo.id_personaje, objetivo: contra, atacante: nombreAtacante,
      move: move.move_name, atributo: atributoSalv, dc, bono: bonoSalv,
      // Sus estados le dan desventaja (Dormido, Retroceso; Paralizado en STR/DEX)
      desventaja: desventajaSalvacion(objetivo.estados, atributoSalv) })
  }
  const respuesta = salvacionResultado && salvacionResultado.id === idSalvacion ? salvacionResultado : null
  const textoTiradaSalv = respuesta ? ` (sacó ${respuesta.total}: d20 ${respuesta.d20} ${respuesta.bono >= 0 ? '+' : '−'} ${Math.abs(respuesta.bono)})` : ''

  // Acertó o falló contra la AC (o según el DM, si no hay AC)
  const seguirConAcierto = (t, ok) => {
    const { ataque, dificultad, critico, pifia } = t
    const ac = objetivo.ac ?? '—'
    if (!ok) {
      anunciar(`${nombreAtacante} usó ${move.move_name} contra ${contra}: falló${pifia ? ' (¡pifia!)' : ''} (ataque ${ataque} vs AC ${ac})`, { ataque, pifia })
      onCerrar(); return
    }
    if (!tieneDano(move) || esCuracion(move)) {
      const modo = estadoMov ? (move.move_save_attribute && dificultad != null ? 'salvacion' : 'directo') : null
      soloEfecto(`${nombreAtacante} usó ${move.move_name} contra ${contra}: acertó (ataque ${ataque} vs AC ${ac})${dificultad != null && !modo ? ` · salvación de ${move.move_save_attribute} DC ${dificultad} para su efecto` : ''}`, modo, { ataque, critico }, dificultad)
      return
    }
    setPaso('dano')
  }

  if (paso === 'acierto') {
    return (
      <Hoja titulo="¿Acertó?" z="z-[126]" ancho="sm:max-w-sm" onClose={onCerrar}>
        <p className="text-[15px]">
          Ataque <b className="tabular-nums">{tirada.ataque}</b> contra <b>{contra}</b>.
        </p>
        <p className="text-[13px] text-texto-2 mt-1">Su ficha no tiene AC (sin armadura ni AC guardada): decide tú.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Boton variante="tintado" onClick={() => seguirConAcierto(tirada, false)}><Equis size={16} /> Falló</Boton>
          <Boton onClick={() => seguirConAcierto(tirada, true)}><Check size={16} /> Acertó</Boton>
        </div>
      </Hoja>
    )
  }

  if (paso === 'formula' && datosAtacante) {
    return (
      <FormulaAtaqueModal move={move} prof={prof} stats={stats} bonoRuta={{ total: 0, detalle: [] }}
        desventaja={desventajaAtaque(atacante.estados)}
        onClose={onCerrar} onAtacar={trasFormula} />
    )
  }

  if (paso === 'dano') {
    return (
      <DanoMoveModal move={move} nivel={atacante.level} stats={stats} critico={!!tirada?.critico} power={tirada?.power}
        menorDeDos={danoMenorDeDos(atacante.estados)}
        stab={stab} objetivo={contra} relacion={relacion}
        onOmitir={onCerrar}
        onConfirmar={(r) => {
          const base = danoTrasRelacion(r.total, relacion)
          const final = salvacion === 'mitad' ? Math.floor(base / 2) : salvacion === 'nada' ? 0 : base
          const partes = [
            tieneAtaque ? `acertó${tirada.critico ? ' ¡crítico!' : ''} (ataque ${tirada.ataque} vs AC ${objetivo.ac ?? '—'})` : null,
            salvacion ? (salvacion === 'fallo' ? `falló la salvación de ${atributoSalv}${textoTiradaSalv}` : `superó la salvación${textoTiradaSalv} (${salvacion === 'completo' ? 'daño completo' : salvacion})`) : null,
            etiquetaRelacion(relacion) ? `${etiquetaRelacion(relacion)} ${cuentaRelacion(relacion)}` : null,
          ].filter(Boolean).join(' · ')
          aplicar(final, partes, modoEstado(true, salvacion))
        }} />
    )
  }

  // Acertó un movimiento con ataque y salvación: la salvación decide el estado
  if (paso === 'salvEstado' && salvEstado) {
    const supera = respuesta ? respuesta.total >= Number(tirada.dificultad) : null
    const nombreE = etiquetaEstado(estadoMov.estado).toLowerCase()
    const cerrarCon = async (fallo) => {
      const estadoTxt = fallo ? await ponerEstado() : ' · no le afecta'
      anunciar(`${contra} ${fallo ? 'falló' : 'superó'} la salvación de ${atributoSalv} contra ${move.move_name} (DC ${tirada.dificultad})${textoTiradaSalv}${estadoTxt}`)
      if (fallo) onAplicado?.()
      onCerrar()
    }
    return (
      <Hoja titulo="Salvación por el efecto" z="z-[126]" ancho="sm:max-w-sm" onClose={onCerrar}>
        <p className="text-[15px]">
          <b>{move.move_name}</b> acertó. Para no quedar <b>{nombreE}</b>, <b>{contra}</b> tira salvación de <b>{atributoSalv}</b> contra <b>DC {tirada.dificultad}</b>
          <span className="text-texto-2"> ({bonoSalv >= 0 ? '+' : ''}{bonoSalv})</span>.
        </p>
        {respuesta ? (
          <p className={`mt-3 rounded-xl px-3 py-2 text-[15px] font-semibold ${supera ? 'bg-ok/15 text-ok' : 'bg-peligro/15 text-peligro'}`}>
            Sacó {respuesta.total} (d20 {respuesta.d20} {respuesta.bono >= 0 ? '+' : '−'} {Math.abs(respuesta.bono)}): {supera ? 'la superó' : 'la falló'}
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-texto-2">Esperando la tirada del jugador… Si no está conectado, márcalo a mano.</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Boton variante={respuesta && !supera ? 'relleno' : 'tintado'} onClick={() => cerrarCon(true)}><Equis size={16} /> La falló</Boton>
          <Boton variante={respuesta && supera ? 'relleno' : 'tintado'} onClick={() => cerrarCon(false)}><Check size={16} /> La superó</Boton>
        </div>
      </Hoja>
    )
  }

  if (paso === 'salvacion') {
    const resolver = (s) => {
      setSalvacion(s)
      if (s === 'nada' || !tieneDano(move) || esCuracion(move)) {
        soloEfecto(`${nombreAtacante} usó ${move.move_name} contra ${contra}: ${s === 'fallo' ? 'falló' : 'superó'} la salvación de ${atributoSalv} (DC ${tirada.dificultad})${textoTiradaSalv}${s === 'nada' && tieneDano(move) ? ' · sin daño' : ''}`,
          modoEstado(false, s))
        return
      }
      setPaso('dano')
    }
    const supera = respuesta ? respuesta.total >= Number(tirada.dificultad) : null
    return (
      <Hoja titulo="Tirada de salvación" z="z-[126]" ancho="sm:max-w-sm" onClose={onCerrar}>
        <p className="text-[15px]">
          <b>{contra}</b> tira salvación de <b>{atributoSalv}</b> contra <b>DC {tirada.dificultad}</b>
          <span className="text-texto-2"> ({bonoSalv >= 0 ? '+' : ''}{bonoSalv})</span>.
        </p>
        {respuesta ? (
          <p className={`mt-3 rounded-xl px-3 py-2 text-[15px] font-semibold ${supera ? 'bg-ok/15 text-ok' : 'bg-peligro/15 text-peligro'}`}>
            Sacó {respuesta.total} (d20 {respuesta.d20} {respuesta.bono >= 0 ? '+' : '−'} {Math.abs(respuesta.bono)}): {supera ? 'la superó' : 'la falló'}
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-texto-2">Esperando la tirada del jugador… Si no está conectado, márcalo a mano.</p>
        )}
        <div className="mt-4 space-y-2">
          {(!respuesta || !supera) && (
            <Boton tamano="lg" variante={respuesta ? 'relleno' : 'tintado'} onClick={() => resolver('fallo')}>
              <Equis size={18} /> {respuesta ? 'Aplicar efecto completo' : 'La falló: efecto completo'}
            </Boton>
          )}
          {(!respuesta || supera) && (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-texto-2 pt-2">La superó: ¿qué le hace?</p>
              <div className="grid grid-cols-3 gap-2">
                <Boton variante="tintado" onClick={() => resolver('completo')}>Completo</Boton>
                <Boton variante="tintado" onClick={() => resolver('mitad')}>Mitad</Boton>
                <Boton variante="tintado" onClick={() => resolver('nada')}>Nada</Boton>
              </div>
            </>
          )}
        </div>
      </Hoja>
    )
  }

  // Paso 1: a quién ataca
  return (
    <Hoja z="z-[126]" ancho="sm:max-w-md" onClose={onCerrar}
      titulo={<span className="flex items-center gap-2"><Crosshair size={18} className="text-tinte" /> {move.move_name}</span>}>
      <p className="text-[13px] text-texto-2 -mt-1 mb-3">{atacante.name}{atacante.hidden ? ' (oculto)' : ''} · ¿a quién ataca?</p>
      {!party || !efectividades ? (
        <p className="text-[13px] text-texto-2">Cargando la party…</p>
      ) : (
        <ul className="rounded-xl bg-superficie divide-y divide-separador overflow-hidden">
          {objetivos.length === 0 && <li className="px-3 py-3 text-[13px] text-texto-2">No hay entrenadores conectados.</li>}
          {objetivos.map(o => (
            <li key={o.clave}>
              <button type="button" disabled={cargando || !datosAtacante} onClick={() => elegir(o)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-relleno disabled:opacity-50 ${o.tipo === 'pokemon' ? 'pl-8' : ''}`}>
                {o.sprite
                  ? <img src={o.sprite} alt="" className={`w-9 h-9 shrink-0 ${o.tipo === 'trainer' ? 'rounded-full object-cover bg-relleno' : 'object-contain'}`} onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
                  : <span className="w-9 h-9 rounded-full bg-relleno shrink-0" />}
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold truncate">{o.nombre}</span>
                  <span className="block text-[12px] text-texto-2">{o.tipo === 'pokemon' ? `Pokémon de ${o.dueno}` : 'Entrenador'}</span>
                </span>
                <span className="flex items-center gap-1 text-[12px] text-texto-2 tabular-nums shrink-0">
                  <Heart size={12} className="text-peligro" /> {o.hp}/{o.hpMax}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[12px] text-texto-2"><Shield size={12} /> La AC se lee de su ficha al elegirlo</span>
        <Boton variante="tintado" tamano="sm" onClick={() => { anunciar(`${nombreAtacante} ha usado el movimiento ${move.move_name}`, { objetivo: null }); onCerrar() }}>
          <Megaphone size={14} /> Solo anunciar
        </Boton>
      </div>
      {cargando && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-texto-2"><Check size={12} /> Leyendo su ficha…</p>}
    </Hoja>
  )
}

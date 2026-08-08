// Ventana de subida de nivel del entrenador. No se puede cerrar: solo se sale
// confirmando, porque las mejoras se pierden si no se aplican.
//
// Se resuelve UN NIVEL A LA VEZ, del más bajo al más alto. Cada nivel trae una
// o varias features separadas por coma en trainer_levels.trainer_level_features,
// y cada una se pinta distinta. El backend valida lo mismo que se valida aquí.
import { useState, useEffect, useMemo } from 'react'
import { Loader2, Plus, Minus, Sparkles, ArrowRight, Award } from 'lucide-react'
import { apiFetch } from '../api'
import { SkillPickMany } from './SkilledModal'
import { clasificarPathBonus, describirPathBonus, TIPO_BONO, TARGET_BONO, legible, skillLegible } from '../lib/pathBonus'

const STAT_KEYS  = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const STAT_LABEL = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
const ASI_PUNTOS = 2
const STAT_CAP   = 20
const fmtMod = m => (m >= 0 ? `+${m}` : `${m}`)
const norm = s => (s ?? '').toLowerCase().trim()

// Nombres tal como vienen en trainer_level_features
const F = {
  CONTROL:  'control upgrade',
  ASI:      'ability score improvement',
  SPEC:     'specialization',
  POKESLOT: 'pokeslot',
  RESOLVE:  "trainer's resolve",
  BOON:     'epic boon',
  MASTER:   'master trainer',
  PATH:     'trainer path',
  PATH_FEAT:'trainer path feature',
  TRACKER:  'pokemon tracker',
}

/* Tarjeta con el título de la feature y su contenido */
function Bloque({ titulo, children, icon: Icon = Sparkles }) {
  return (
    <div className="border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="text-red-600 shrink-0" />
        <h4 className="text-sm font-black text-gray-800">{titulo}</h4>
      </div>
      {children}
    </div>
  )
}

/* "de X a Y", para Control Upgrade y Pokeslot */
function DeA({ antes, despues, unidad }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <span className="text-2xl font-black text-gray-400">{antes ?? '—'}</span>
      <ArrowRight size={18} className="text-red-500" />
      <span className="text-2xl font-black text-green-600">{despues ?? '—'}</span>
      {unidad && <span className="text-xs text-gray-500 self-end mb-1">{unidad}</span>}
    </div>
  )
}

/* Bonos de un path agrupados por nivel, como en la vista de Rutas del home */


function DetallePath({ path }) {
  if (!path) return null
  const bonos = path.bonos || []
  return (
    <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
      {path.path_full_description && (
        <p className="text-xs text-gray-600 leading-relaxed">{path.path_full_description}</p>
      )}
      {[2, 5, 9, 15].map(n => {
        const nombre = path[`path_level_${n}_feature_name`]
        const descr  = path[`path_level_${n}_description`]
        const bs     = bonos.filter(b => Number(b.level) === n)
        if (!nombre && !descr) return null
        return (
          <div key={n} className="border-l-2 border-red-200 pl-3 py-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-white bg-red-600 rounded px-1.5 py-0.5 shrink-0">Nivel {n}</span>
              <span className="text-xs font-bold text-gray-800">{nombre}</span>
            </div>
            {descr && <p className="text-xs text-gray-600 leading-relaxed mt-1">{descr}</p>}
            {bs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {bs.map(b => (
                  <span key={b.id} title={b.notes || undefined}
                    className="text-[10px] font-semibold text-gray-700 bg-white border border-gray-300 rounded-md px-1.5 py-0.5">
                    <span className="text-red-700">{TIPO_BONO[b.type] || legible(b.type)}</span>
                    {b.key && <span className="text-gray-500"> · {legible(b.key)}</span>}
                    {b.value && <span className="text-green-700"> {b.value}</span>}
                    {b.resource_die && <span className="text-blue-700"> {b.resource_die}</span>}
                    {b.target && b.target !== 'trainer' && (
                      <span className="text-gray-400"> ({TARGET_BONO[b.target] || legible(b.target)})</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* Bonos de ruta del nivel: los que exigen elegir muestran el selector, los
   fijos anuncian la skill, y el resto son narrativa (solo se listan). */
function BonosDeRuta({ bonos, skillsList, elegidas, setElegidas, preview, bondPreview, specs2, specSel2, setSpecSel2 }) {
  const toggle = (bonusId, cuantas, nombre) => setElegidas(prev => {
    const act = prev[bonusId] || []
    if (act.includes(nombre)) return { ...prev, [bonusId]: act.filter(x => x !== nombre) }
    if (act.length >= cuantas) return prev
    return { ...prev, [bonusId]: [...act, nombre] }
  })
  return (
    <div className="space-y-2.5">
      {(bonos || []).map(b => {
        const r = b.regla
        if (!r) {
          // Narrativa: se muestra para que el jugador sepa qué ganó, sin acción
          return (
            <div key={b.path_bonus_id} className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <span className="font-semibold text-gray-700">{describirPathBonus(b).texto}</span>
              <span className="text-gray-400"> — lo lleva el DM</span>
            </div>
          )
        }
        if (r.modo === 'spec_extra') {
          return (
            <div key={b.path_bonus_id} className="border border-gray-200 rounded-lg px-2.5 py-2">
              <p className="text-xs font-bold text-gray-700 mb-1.5">Ganas una especialización más</p>
              <select value={specSel2} onChange={e => setSpecSel2(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="" className="text-gray-900">Elige una especialización...</option>
                {(specs2 || []).map(x => (
                  <option key={x.specialization_id} value={x.specialization_id} className="text-gray-900">
                    {x.specialization_name}{x.specialization_pokemon_type_name ? ` — ${x.specialization_pokemon_type_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )
        }
        if (r.modo === 'bond') {
          const lista = bondPreview || []
          return (
            <div key={b.path_bonus_id} className="border border-gray-200 rounded-lg px-2.5 py-2">
              <p className="text-xs font-bold text-gray-700 mb-1.5">
                Tus Pokémon con vínculo positivo lo suben (+2 tu inicial)
              </p>
              {lista.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">
                  Ninguno de tus Pokémon tiene todavía un vínculo positivo. El bono se
                  aplicará solo en cuanto alguno lo tenga.
                </p>
              ) : (
                <div className="space-y-1">
                  {lista.map(x => (
                    <div key={x.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-gray-700">
                        <span className="font-semibold">{x.apodo}</span>
                        {x.es_starter && <span className="text-[10px] text-amber-700"> · inicial</span>}
                        <span className="text-gray-400"> · {x.nombre}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-black text-blue-700 bg-blue-100 border border-blue-300 rounded px-1.5 py-0.5">
                        +{x.extra}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }
        if (r.modo === 'stab') {
          const lista = preview || []
          return (
            <div key={b.path_bonus_id} className="border border-gray-200 rounded-lg px-2.5 py-2">
              <p className="text-xs font-bold text-gray-700 mb-1.5">
                Tus Pokémon del tipo de tus especializaciones ganan STAB
              </p>
              {lista.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">
                  Ninguno de tus Pokémon coincide todavía con el tipo de tus especializaciones.
                  El bono se aplicará solo cuando alguno lo haga.
                </p>
              ) : (
                <div className="space-y-1">
                  {lista.map(x => (
                    <div key={x.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-gray-700">
                        <span className="font-semibold">{x.apodo}</span>
                        <span className="text-gray-400"> · {[x.tipo_1, x.tipo_2].filter(Boolean).join(' / ')}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-black text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                        STAB +{x.extra}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }
        if (r.modo === 'fija') {
          return (
            <div key={b.path_bonus_id} className="text-xs bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
              <span className="font-bold text-green-800">
                {r.valor === 'expert' ? 'Experiencia' : 'Proficiencia'} en {skillLegible(r.llave)}
              </span>
              {r.target !== 'trainer' && (
                <span className="text-gray-500"> ({TARGET_BONO[r.target] || legible(r.target)})</span>
              )}
            </div>
          )
        }
        const sel = elegidas[b.path_bonus_id] || []
        return (
          <div key={b.path_bonus_id} className="border border-gray-200 rounded-lg px-2.5 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-700">
                Elige {r.cuantas} habilidad{r.cuantas > 1 ? 'es' : ''}
                {r.target !== 'trainer' && (
                  <span className="text-gray-500 font-normal"> para {TARGET_BONO[r.target] || legible(r.target)}</span>
                )}
              </span>
              <span className="text-[11px] font-bold text-gray-500">{sel.length}/{r.cuantas}</span>
            </div>
            <SkillPickMany skills={skillsList} proficientNames={new Set()} kind="prof"
              count={r.cuantas} chosen={sel}
              onToggle={n => toggle(b.path_bonus_id, r.cuantas, n)} disabled={false} />
          </div>
        )
      })}
    </div>
  )
}

// Se monta con key={pending.id}: al pasar al siguiente nivel el componente se
// remonta y las elecciones del anterior se van solas, sin efecto de limpieza.
export default function TrainerLevelUpModal({ personajeId, pending, onConfirmed }) {
  const p = pending
  const features = (p.features_lista || []).map(norm)
  const has = (f) => features.includes(f)

  const [stats, setStats]   = useState(null)
  const [specs, setSpecs]   = useState([])
  const [paths, setPaths]   = useState([])
  const [adds, setAdds]     = useState({})
  const [specSel, setSpecSel] = useState('')
  const [savSel, setSavSel]   = useState('')
  const [pathSel, setPathSel] = useState('')
  const [hpRoll, setHpRoll] = useState('')   // tirada del dado de golpe
  const [skillsList, setSkillsList] = useState([])
  const [pathSkills, setPathSkills] = useState({}) // { path_bonus_id: [nombres] }
  const [pathSpec, setPathSpec] = useState('')     // especialización que pide un bono de ruta
  const [alerta, setAlerta] = useState(false)      // confirmación irreversible del path
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    apiFetch(`/personaje/${personajeId}/full`).then(r => r.json())
      .then(d => setStats(d?.stats || null)).catch(() => setStats(null))
  }, [personajeId])

  // Se carga si lo pide la feature del nivel O un bono de la ruta
  useEffect(() => {
    apiFetch(`/personaje/${personajeId}/improvements/specializations`).then(r => r.json())
      .then(d => setSpecs(Array.isArray(d) ? d : [])).catch(() => setSpecs([]))
  }, [personajeId, p.id])

  useEffect(() => {
    if (!has(F.PATH)) return
    apiFetch('/paths').then(r => r.json())
      .then(d => setPaths(Array.isArray(d) ? d : [])).catch(() => setPaths([]))
  }, [p.id])

  useEffect(() => {
    apiFetch('/skills').then(r => r.json())
      .then(d => setSkillsList(Array.isArray(d) ? d : [])).catch(() => setSkillsList([]))
  }, [])

  const usados = STAT_KEYS.reduce((s, k) => s + (adds[k] || 0), 0)
  const restantes = ASI_PUNTOS - usados
  const base = (k) => Number(stats?.[`personaje_${k}`]) || 0
  const bonus = (k) => Number(stats?.[`personaje_${k}_bonus`]) || 0
  const valor = (k) => base(k) + (adds[k] || 0)
  const modOf = (k) => Math.floor((valor(k) + bonus(k) - 10) / 2)
  const inc = (k) => { if (restantes > 0 && valor(k) < STAT_CAP) setAdds(a => ({ ...a, [k]: (a[k] || 0) + 1 })) }
  const dec = (k) => { if ((adds[k] || 0) > 0) setAdds(a => ({ ...a, [k]: a[k] - 1 })) }

  const pathElegido = useMemo(
    () => paths.find(x => String(x.path_id) === String(pathSel)) || null, [paths, pathSel])

  // En el nivel donde se ELIGE la ruta, sus bonos vienen del path seleccionado
  // en el select; en los demás, del pendiente, que ya trae la ruta guardada.
  const bonosDelNivel = useMemo(() => {
    if (has(F.PATH)) {
      return (pathElegido?.bonos || [])
        .filter(b => Number(b.level) === Number(p.lvl))
        .map(b => ({
          path_bonus_id: b.id, path_bonus_type: b.type, path_bonus_key: b.key,
          path_bonus_value: b.value, path_bonus_target: b.target,
          path_bonus_resource_die: b.resource_die,
          regla: clasificarPathBonus(b.type, b.key, b.value, b.target),
        }))
    }
    return p.path_bonos || []
  }, [pathElegido, p.lvl, p.path_bonos])

  // Qué falta para poder confirmar
  const dadoMax = Number(p.hit_dice_max) || 0
  const rollNum = Math.floor(Number(hpRoll))
  const rollOk  = Number.isFinite(rollNum) && rollNum >= 1 && (dadoMax === 0 || rollNum <= dadoMax)

  const faltante = (() => {
    if (!rollOk) return 'Falta la tirada del dado de golpe'
    if (has(F.ASI) && restantes !== 0) return `Faltan ${restantes} punto(s) por repartir`
    if (has(F.SPEC) && !specSel) return 'Elige una especialización'
    if (has(F.RESOLVE) && !savSel && (p.saving_disponibles || []).length > 0) return 'Elige una tirada de salvación'
    if (has(F.PATH) && !pathSel) return 'Elige tu clase'
    // Los bonos de ruta que exigen elegir: solo aplican si ya hay ruta. En el
    // nivel 2 la ruta se está eligiendo ahora, así que los suyos salen del
    // catálogo cargado en el select, no del pendiente.
    for (const b of bonosDelNivel) {
      const r = b.regla
      if (r?.modo !== 'elegir') continue
      const n = (pathSkills[b.path_bonus_id] || []).length
      if (n !== r.cuantas) return `Elige ${r.cuantas} habilidad(es) del rasgo de ruta`
    }
    if (bonosDelNivel.some(b => b.regla?.modo === 'spec_extra') && !pathSpec) {
      return 'Elige la especialización del rasgo de ruta'
    }
    return null
  })()

  const confirmar = async () => {
    if (faltante || busy) return
    setBusy(true); setError('')
    try {
      const body = { hp_roll: rollNum }
      if (has(F.ASI))     body.asi = adds
      if (has(F.SPEC))    body.specialization_id = Number(specSel)
      if (has(F.RESOLVE) && savSel) body.saving = savSel
      if (has(F.PATH))    body.path_id = Number(pathSel)
      if (Object.keys(pathSkills).length) body.path_skills = pathSkills
      if (pathSpec) body.path_specialization_id = Number(pathSpec)
      const res = await apiFetch(`/personaje/${personajeId}/improvements/${p.id}/confirm`,
        { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'No se pudo confirmar'); setBusy(false); return
      }
      onConfirmed()
    } catch { setError('No se pudo confirmar'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 shrink-0 bg-red-600 text-white">
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">Subiste de nivel</p>
          <h3 className="text-xl font-black">Nivel {p.lvl}</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {p.descripcion && (
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {p.descripcion}
            </p>
          )}

          {/* Dado de golpe: se tira en todos los niveles, como en los Pokémon.
              Lo tirado sube el HP máximo y el actual a la vez. */}
          <Bloque titulo={`Dado de golpe${p.hit_dice ? ` (${p.hit_dice})` : ''}`}>
            <p className="text-xs text-gray-500 mb-2">
              Arroja un dado de d{dadoMax || '?'} y escribe el resultado. Se suma a tu vida
              máxima y actual, junto con tu modificador de CON.
            </p>
            <input type="number" min={1} max={dadoMax || undefined} value={hpRoll}
              onChange={e => setHpRoll(e.target.value)} placeholder={`1 a ${dadoMax || '?'}`}
              className="w-28 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
            {hpRoll !== '' && !rollOk && (
              <p className="text-[11px] text-red-600 font-medium mt-1">Debe ser un número entre 1 y {dadoMax}.</p>
            )}
          </Bloque>

          {/* 1. Control Upgrade — informa el cambio de SR */}
          {has(F.CONTROL) && (
            <Bloque titulo="Control Upgrade">
              <p className="text-xs text-gray-500">Species Rating máximo que puedes controlar</p>
              <DeA antes={p.max_sr_previo} despues={p.max_sr} unidad="SR" />
            </Bloque>
          )}

          {/* 4. Pokeslot — informa el cambio de ranuras */}
          {has(F.POKESLOT) && (
            <Bloque titulo="Pokéslot">
              <p className="text-xs text-gray-500">Ranuras de Pokémon en el cinturón</p>
              <DeA antes={p.pokeslots_previo} despues={p.pokeslots} unidad="slots" />
            </Bloque>
          )}

          {/* 2. ASI — 2 puntos, mismo manejo que los Pokémon */}
          {has(F.ASI) && (
            <Bloque titulo="Ability Score Improvement">
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-2">
                <span className="text-sm font-bold text-red-800">Puntos disponibles</span>
                <span className="text-2xl font-black text-red-700">{restantes}</span>
              </div>
              {!stats ? (
                <p className="text-xs text-gray-400 italic">Cargando atributos...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {STAT_KEYS.map(k => (
                    <div key={k} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <span className="text-xs font-black text-gray-700">{STAT_LABEL[k]}</span>
                        <span className="text-sm font-bold text-gray-900 ml-2">{valor(k)}</span>
                        {(adds[k] || 0) > 0 && <span className="text-[10px] font-bold text-green-600 ml-1">+{adds[k]}</span>}
                        <span className="text-[11px] text-gray-400 ml-1">({fmtMod(modOf(k))})</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => dec(k)} disabled={(adds[k] || 0) <= 0} title="Quitar punto"
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30"><Minus size={13} /></button>
                        <button onClick={() => inc(k)} disabled={restantes <= 0 || valor(k) >= STAT_CAP} title="Agregar punto"
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-30"><Plus size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Bloque>
          )}

          {/* 3. Specialization — una que no tenga */}
          {has(F.SPEC) && (
            <Bloque titulo="Especialización">
              <select value={specSel} onChange={e => setSpecSel(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="" className="text-gray-900">Elige una especialización...</option>
                {specs.map(s => (
                  <option key={s.specialization_id} value={s.specialization_id} className="text-gray-900">
                    {s.specialization_name}{s.specialization_pokemon_type_name ? ` — ${s.specialization_pokemon_type_name}` : ''}
                  </option>
                ))}
              </select>
              {(() => {
                const s = specs.find(x => String(x.specialization_id) === String(specSel))
                if (!s) return null
                return (
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    {s.specialization_description && <p className="leading-relaxed">{s.specialization_description}</p>}
                    {s.specialization_ability_score_increase && (
                      <p><span className="font-semibold text-gray-800">Atributo: </span>
                        {s.specialization_ability_score_increase.toUpperCase()} +{s.specialization_ability_score_increase_value ?? 1}</p>
                    )}
                    {s.specialization_skill_proficiency && (
                      <p><span className="font-semibold text-gray-800">Proficiencia: </span>{s.specialization_skill_proficiency}</p>
                    )}
                  </div>
                )
              })()}
            </Bloque>
          )}

          {/* 5. Trainer's Resolve — proficiencia en una salvación que no tenga */}
          {has(F.RESOLVE) && (
            <Bloque titulo="Trainer's Resolve">
              {(p.saving_disponibles || []).length === 0 ? (
                <p className="text-xs text-gray-500 italic">Ya eres proficiente en todas las tiradas de salvación.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">Ganas proficiencia en una tirada de salvación.</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(p.saving_disponibles || []).map(k => (
                      <button key={k} onClick={() => setSavSel(k)}
                        className={`text-xs font-bold px-2 py-2 rounded-lg border transition-colors ${
                          savSel === k ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        {STAT_LABEL[k]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Bloque>
          )}

          {/* 8. Trainer Path — se elige y se muestra, pero todavía no se persiste */}
          {has(F.PATH) && (
            <Bloque titulo="Escoge tu clase" icon={Award}>
              <select value={pathSel} onChange={e => setPathSel(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="" className="text-gray-900">Elige una ruta...</option>
                {paths.map(x => <option key={x.path_id} value={x.path_id} className="text-gray-900">{x.path_name}</option>)}
              </select>
              <DetallePath path={pathElegido} />
              {pathElegido && bonosDelNivel.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Lo que ganas ahora</p>
                  <BonosDeRuta bonos={bonosDelNivel} skillsList={skillsList}
                    elegidas={pathSkills} setElegidas={setPathSkills} preview={p.stab_preview} bondPreview={p.bond_preview}
                    specs2={specs} specSel2={pathSpec} setSpecSel2={setPathSpec} />
                </div>
              )}
              {pathElegido && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-3">
                  La ruta no se puede cambiar después.
                </p>
              )}
            </Bloque>
          )}

          {/* 9. Trainer Path Feature — depende de la ruta, que aún no se persiste */}
          {has(F.PATH_FEAT) && (
            <Bloque titulo={`Rasgo de ruta${p.path_name ? ` — ${p.path_name}` : ''}`} icon={Award}>
              {!p.path_name ? (
                <p className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Primero debes elegir tu ruta en el nivel 2.
                </p>
              ) : (
                <>
                  {p.path_rasgo?.nombre && (
                    <p className="text-sm font-black text-gray-800">{p.path_rasgo.nombre}</p>
                  )}
                  {p.path_rasgo?.descripcion && (
                    <p className="text-xs text-gray-600 leading-relaxed mt-1">{p.path_rasgo.descripcion}</p>
                  )}
                  {bonosDelNivel.length > 0 && (
                    <div className="mt-2">
                      <BonosDeRuta bonos={bonosDelNivel} skillsList={skillsList}
                        elegidas={pathSkills} setElegidas={setPathSkills} preview={p.stab_preview} bondPreview={p.bond_preview}
                    specs2={specs} specSel2={pathSpec} setSpecSel2={setPathSpec} />
                    </div>
                  )}
                </>
              )}
            </Bloque>
          )}

          {/* 6, 7 y Pokemon Tracker — solo aviso */}
          {has(F.BOON) && (
            <Bloque titulo="Epic Boon" icon={Award}>
              <p className="text-sm font-bold text-green-700">¡Felicidades, ganaste Epic Boon! Habla con el DM.</p>
            </Bloque>
          )}
          {has(F.MASTER) && (
            <Bloque titulo="Master Trainer" icon={Award}>
              <p className="text-sm font-bold text-green-700">¡Felicidades, ganaste Master Trainer!</p>
            </Bloque>
          )}
          {has(F.TRACKER) && (
            <Bloque titulo="Pokémon Tracker" icon={Award}>
              <p className="text-sm font-bold text-green-700">¡Felicidades, ganaste Pokémon Tracker!</p>
            </Bloque>
          )}

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        {/* Sin botón de cerrar: la única salida es confirmar */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-gray-500">{faltante || 'Todo listo'}</span>
          <button onClick={() => (has(F.PATH) ? setAlerta(true) : confirmar())} disabled={!!faltante || busy}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-lg transition-colors">
            {busy && <Loader2 size={15} className="animate-spin" />} Confirmar
          </button>
        </div>
      </div>

      {/* Elegir ruta no se puede deshacer: se pide confirmación aparte */}
      {alerta && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Confirmar ruta</h3>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-sm text-gray-700">
                Vas a elegir <span className="font-bold text-red-700">{pathElegido?.path_name}</span> como tu Trainer Path.
              </p>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Esta acción <span className="font-bold">no se puede deshacer</span>.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setAlerta(false)} disabled={busy}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
              <button onClick={confirmar} disabled={busy}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
                {busy && <Loader2 size={15} className="animate-spin" />} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

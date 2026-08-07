import { useState, useEffect } from 'react'
import { X, ChevronLeft, Venus, Mars, Check, ArrowUp, Loader2, Sparkles, DoorOpen, ArrowRightLeft, AlertTriangle } from 'lucide-react'
import { apiFetch } from '../api'
import TypeEffectivenessView from './TypeEffectivenessView'
import { ResolvedBonusBadges } from './featBonoBadges'
import MoveInfoModal from './MoveInfoModal'
import FeatInfoModal from './FeatInfoModal'

const TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
}
const fmtSign = v => (Number(v) >= 0 ? `+${v}` : `${v}`)
const fmtMod  = m => (m >= 0 ? `+${m}` : `${m}`)

function TypeBadge({ type }) {
  if (!type) return null
  return (
    <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5"
      style={{ backgroundColor: TYPE_COLORS[type] || '#9CA3AF' }}>{type}</span>
  )
}

function ReadCheck({ pref, expert }) {
  // Vacío si no tiene nada; verde si es proficiente; azul si es experto
  const fill = expert ? 'bg-blue-700 border-blue-700'
    : pref ? 'bg-green-600 border-green-600'
    : 'border-gray-400 bg-white'
  return (
    <span className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 ${fill}`}>
      {(pref || expert) && <Check size={10} className="text-white" strokeWidth={3} />}
    </span>
  )
}

// pasiva: misma fila que un movimiento pero con la etiqueta "pasiva" y sin
// PP/tiempo/rango, que no aplican. El detalle se abre al hacer clic.
function MoveRow({ m, onClick, pasiva = false }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left ${
        pasiva ? 'bg-purple-100 border-purple-300' : 'bg-green-100 border-green-300'} ${
        onClick ? (pasiva ? 'hover:border-purple-500 transition-colors' : 'hover:border-green-500 transition-colors') : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-sm text-gray-800 truncate">
          {pasiva ? m.ability_name : m.move_name}
        </span>
        <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0"
          style={{ backgroundColor: pasiva ? '#7C3AED' : (TYPE_COLORS[m.move_type] || '#9CA3AF') }}>
          {pasiva ? 'pasiva' : m.move_type}
        </span>
      </div>
      {!pasiva && (
        <span className="text-[10px] text-gray-500 shrink-0 text-right">
          PP {m.move_pp} · {m.move_time} · {m.move_range}
        </span>
      )}
    </Tag>
  )
}

// ── Detalle de un Pokémon (tipo pokédex, datos persistidos) ──
// Exportado para reutilizarlo fuera del cinturón/computador (p. ej. party del master).
// `endpoint` permite apuntar a otra fuente (p. ej. /master/pokemon/:idmp).
export function PokemonDetailView({ personajeId, idpp, endpoint, master = false, onBack, actionLabel, onAction, onInvoke }) {
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [moveInfo, setMoveInfo] = useState(null) // movimiento cuyo detalle se muestra
  const [abilityInfo, setAbilityInfo] = useState(null) // pasiva cuyo detalle se muestra
  const [featInfo, setFeatInfo] = useState(null) // feat cuyo detalle se muestra
  const url = endpoint || `/personaje/${personajeId}/pokemon/${idpp}`

  useEffect(() => {
    setD(null)
    apiFetch(url)
      .then(r => r.json())
      .then(setD)
      .catch(() => {})
  }, [url])

  if (!d) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando…</div>

  const stats = d.stats || {}
  const level = Number(d.pokemon_level) || 1
  const capStat = v => Math.min(v, level >= 20 ? 22 : 20)
  // Aplica el overlay de feats cuando el Pokémon tiene feats (master o entrenador)
  const applyFeats = (d.feats || []).length > 0
  // Overlay de feats: suma stat/skill/healing como en el creador
  const featFx = (() => {
    const statAdd = { dex: 0, str: 0, con: 0, int: 0, wis: 0, cha: 0 }
    const skillProf = new Set(), skillExpert = new Set()
    let healing = 0
    if (applyFeats) for (const f of (d.feats || [])) for (const b of (f.bonos || [])) {
      const t = (b.type || '').toLowerCase(), llave = (b.llave || '').toLowerCase()
      if (t === 'stat' && statAdd[llave] !== undefined) statAdd[llave] += Number(b.value) || 0
      else if (t === 'skill') { const v = (b.value || '').toLowerCase(); if (v === 'expert') skillExpert.add(llave); else if (v === 'prof') skillProf.add(llave) }
      else if (t === 'healing') { const m = /(\d+)\s*per\s*l/i.exec(b.value || ''); healing += m ? Number(m[1]) * level : (Number(b.value) || 0) }
    }
    return { statAdd, skillProf, skillExpert, healing }
  })()
  const statVal = k => {
    const v = (Number(stats[`pokemon_${k}`]) || 0) + (Number(stats[`pokemon_${k}_bonus`]) || 0) + (featFx.statAdd[k] || 0)
    return applyFeats ? capStat(v) : v
  }
  const modOf = k => Math.floor((statVal(k) - 10) / 2)
  const prof = Number(d.pokemon_proficient) || 2
  // Proficiencia/expertise efectiva de una skill (base + feats en master)
  const skillFlags = s => {
    const name = (s.skill_name || '').toLowerCase()
    let pref = !!s.pokemon_skill_pref, expert = !!s.pokemon_skill_expert
    if (applyFeats) {
      if (featFx.skillProf.has(name)) pref = true
      if (featFx.skillExpert.has(name)) { if (pref) expert = true; else pref = true }
    }
    return { pref, expert }
  }
  // El STAB parte de la proficiencia y le suma el bono de la ruta del
  // entrenador, que el backend resuelve según sus especializaciones.
  const stab = prof + (Number(d.pokemon_stab_extra) || 0)
  const nature = d.nature_name ? {
    nature_name: d.nature_name,
    nature_effect_increase: d.nature_effect_increase, nature_effect_increase_value: d.nature_effect_increase_value,
    nature_effect_decrease: d.nature_effect_decrease, nature_effect_decrease_value: d.nature_effect_decrease_value,
  } : null
  const genero = d.personaje_pokemon_genero
  const mainImg = (d.pokemon_is_shiny && d.pokemon_media_main_shiny) ? d.pokemon_media_main_shiny
    : (d.pokemon_media_main || d.pokemon_media_sprite)
  const speeds = [1, 2, 3, 4]
    .map(i => d[`personaje_pokemon_speed${i}_name`] && `${d[`personaje_pokemon_speed${i}_value`]} ${d[`personaje_pokemon_speed${i}_name`]}`)
    .filter(Boolean).join(' · ')

  const skills = d.skills || []
  const half = Math.ceil(skills.length / 2)
  const skillCols = [skills.slice(0, half), skills.slice(half)]
  const skillValue = s => {
    const m = modOf((s.skill_related_ability || '').toLowerCase())
    const { pref, expert } = skillFlags(s)
    return m + (pref ? prof : 0) + (expert ? prof : 0)
  }

  const doAction = async () => {
    if (busy) return
    setBusy(true); setError('')
    const err = await onAction(idpp)
    if (err) { setError(err); setBusy(false) }   // en éxito el padre cierra la ventana
  }

  return (
    <div className="flex flex-col h-full text-gray-800">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-gray-900 truncate">{d.pokemon_apodo}</span>
          <span className="font-bold text-gray-900 shrink-0">({level})</span>
          {d.pokemon_type_1 && <TypeBadge type={d.pokemon_type_1} />}
          {d.pokemon_type_2 && <TypeBadge type={d.pokemon_type_2} />}
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-4">
          {/* Encabezado */}
          <div className="flex flex-col items-center gap-1">
            {mainImg && <img src={mainImg} alt={d.pokemon_apodo} className="w-[168px] h-[168px] object-contain"
              onError={e => { e.target.style.opacity = '0.2' }} />}
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-gray-900">{d.pokemon_apodo} ({level})</span>
              {genero === 'Female' && <Venus size={18} className="text-pink-500" strokeWidth={2.5} />}
              {genero === 'Male' && <Mars size={18} className="text-blue-500" strokeWidth={2.5} />}
              {d.pokemon_is_shiny && (
                <span title="Shiny" className="flex items-center gap-0.5 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-300 rounded-md px-1.5 py-0.5">
                  <Sparkles size={11} strokeWidth={2.5} /> Shiny
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">{d.pokemon_name}</span>
            <div className="flex gap-1 mt-1">
              <TypeBadge type={d.pokemon_type_1} />
              <TypeBadge type={d.pokemon_type_2} />
            </div>
            {nature && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-semibold text-gray-600">{nature.nature_name}</span>
              </div>
            )}
            {/* Acción */}
            {(onAction || onInvoke) && (
              <div className="flex items-center gap-2 mt-2">
                {onAction && (
                  <button onClick={doAction} disabled={busy}
                    className="text-xs px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold transition-colors">
                    {busy ? 'Guardando…' : actionLabel}
                  </button>
                )}
                {onInvoke && (
                  <button onClick={() => onInvoke(idpp, mainImg)}
                    className="text-xs px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-900 text-white font-semibold transition-colors">
                    Invocar
                  </button>
                )}
              </div>
            )}
            {error && <span className="text-xs text-red-600 font-medium mt-1">{error}</span>}
          </div>

          {/* Stat block */}
          <div className="rounded-lg overflow-hidden"
            style={{ borderTop: '5px solid #9C6E1B', borderBottom: '5px solid #9C6E1B', backgroundColor: '#FDF1DC' }}>
            <div className="px-4 py-1.5 space-y-0.5 text-xs text-gray-800">
              {master && <p><span className="font-bold text-[#7A200D]">Nivel</span> {level}</p>}
              <p><span className="font-bold text-[#7A200D]">Clase de Armadura</span> {d.personaje_pokemon_ac}</p>
              {/* pokemon_hp ya llega con el modCON y el healing de feats aplicados */}
              <p><span className="font-bold text-[#7A200D]">Puntos de Golpe</span> {d.pokemon_current_hp ?? 0}/{d.pokemon_hp ?? 0} ({d.pokemon_hit_dice})</p>
              <p><span className="font-bold text-[#7A200D]">Experiencia</span> {(d.pokemon_experiencia ?? 0).toLocaleString()}
                {d.exp_next != null ? `/${d.exp_next.toLocaleString()}` : ' · Máx'}</p>
              {speeds && <p><span className="font-bold text-[#7A200D]">Velocidad</span> {speeds}</p>}
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-2 flex justify-around">
              {[['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'], ['INT', 'int'], ['WIS', 'wis'], ['CHA', 'cha']].map(([lbl, k]) => (
                <div key={k} className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-[#7A200D]">{lbl}</span>
                  <span className="text-base font-bold text-gray-900 leading-tight">{statVal(k)}</span>
                  <span className="text-xs text-gray-600">{fmtSign(modOf(k))}</span>
                </div>
              ))}
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-2 flex justify-around items-stretch">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#7A200D]">EXH</span>
                <span className="text-base font-bold text-gray-900 leading-tight">{d.personaje_pokemon_exahust_lvl}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg px-2 bg-green-100">
                <span className="text-[10px] font-black text-green-700">DSTS</span>
                <span className="text-base font-bold text-green-700 leading-tight">{d.personaje_pokemon_dsts}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg px-2 bg-red-100">
                <span className="text-[10px] font-black text-red-700">DSTF</span>
                <span className="text-base font-bold text-red-700 leading-tight">{d.personaje_pokemon_dstf}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#7A200D]">STAB</span>
                <span className="text-base font-bold text-gray-900 leading-tight">{fmtSign(stab)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#7A200D]">PROF</span>
                <span className="text-base font-bold text-gray-900 leading-tight">{fmtSign(prof)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#7A200D]">AC</span>
                <span className="text-base font-bold text-gray-900 leading-tight">{d.personaje_pokemon_ac}</span>
              </div>
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-1.5 space-y-0.5 text-xs text-gray-800">
              {d.pokemon_saving_throw_prof && <p><span className="font-bold text-[#7A200D]">Tiradas de Salvación</span> {d.pokemon_saving_throw_prof}</p>}
              {(() => {
                const senses = [1, 2]
                  .map(i => d[`pokemon_sense_${i}_name`] && `${d[`pokemon_sense_${i}_value`]} ${d[`pokemon_sense_${i}_name`]}`)
                  .filter(Boolean).join(' · ')
                return senses && <p><span className="font-bold text-[#7A200D]">Sentidos</span> {senses}</p>
              })()}
              {d.bond_name && (
                <>
                  <p><span className="font-bold text-[#7A200D]">Vínculo</span> {d.bond_name}</p>
                  {d.bond_description && <p className="text-gray-500">{d.bond_description}</p>}
                </>
              )}
            </div>
          </div>

          {/* Efectividad de tipo */}
          <TypeEffectivenessView typeId1={d.personaje_pokemon_type_1} typeId2={d.personaje_pokemon_type_2} />

          {/* Habilidades */}
          {skills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <p className="text-xs font-black uppercase tracking-widest text-gray-600">Habilidades</p>
                <span className="text-[9px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">Proficient</span>
                <span className="text-[9px] font-bold text-white bg-blue-700 rounded px-1.5 py-0.5">Expert</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 sm:gap-x-5 gap-y-3">
                {skillCols.map((col, ci) => (
                  <div key={ci}>
                    <div className="space-y-1.5">
                      {col.map((s, i) => {
                        const v = skillValue(s)
                        const sf = skillFlags(s)
                        return (
                          <div key={i} className="flex items-center gap-1.5 min-w-0">
                            <ReadCheck pref={sf.pref} expert={sf.expert} />
                            <span className={`w-7 shrink-0 text-center text-[11px] font-bold border-b border-gray-400 leading-tight ${
                              v < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {fmtMod(v)}
                            </span>
                            <span className="text-[11px] leading-tight truncate min-w-0">
                              <span className="font-semibold text-gray-800">{s.skill_name}</span>
                              <span className="text-gray-400"> ({s.skill_related_ability})</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movimientos — las pasivas van al final de la misma lista */}
          {((d.moves || []).length > 0 || (d.pasivas || []).length > 0) && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Movimientos</p>
              <div className="space-y-1.5">
                {/* El detalle del movimiento se abre en todas las vistas:
                    cinturón, femputadora y Pokémon del master */}
                {(d.moves || []).map(m => (
                  <MoveRow key={m.move_id} m={m} onClick={() => setMoveInfo(m)} />
                ))}
                {(d.pasivas || []).map(p => (
                  <MoveRow key={`pasiva-${p.ability_id}`} m={p} pasiva onClick={() => setAbilityInfo(p)} />
                ))}
              </div>
            </div>
          )}

          {/* Feats (master o entrenador) */}
          {(d.feats || []).length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Feats</p>
              <div className="space-y-1.5">
                {d.feats.map((f, i) => {
                  const shownBonos = (f.bonos || []).map(b => {
                    if ((b.type || '').toLowerCase() === 'healing') { const n = /(\d+)\s*per\s*l/i.exec(b.value || ''); if (n) return { ...b, value: String(Number(n[1]) * level) } }
                    return b
                  })
                  return (
                  <button key={f.master_pokemon_feat_id ?? f.personaje_pokemon_feat_id ?? i} onClick={() => setFeatInfo({ ...f, bonos: shownBonos })}
                    className="w-full text-left flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:border-red-300 transition-colors">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      <span className="text-gray-400 font-normal mr-1.5">Rasgo {i + 1}:</span>{f.feat_name}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <ResolvedBonusBadges bonos={shownBonos} />
                    </div>
                  </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {moveInfo && <MoveInfoModal m={moveInfo} theme="light" onClose={() => setMoveInfo(null)} />}

      {/* Detalle de una pasiva */}
      {abilityInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setAbilityInfo(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm truncate">{abilityInfo.ability_name}</h4>
                <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0" style={{ backgroundColor: '#7C3AED' }}>pasiva</span>
              </div>
              <button onClick={() => setAbilityInfo(null)} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={16} /></button>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                {abilityInfo.ability_description || 'Sin descripción.'}
              </p>
            </div>
          </div>
        </div>
      )}
      {featInfo && <FeatInfoModal feat={featInfo} theme="light" onClose={() => setFeatInfo(null)} />}
    </div>
  )
}

/* Popup para subir experiencia a un Pokémon del entrenador */
function AddExpModal({ personajeId, pokemon, onClose, onDone }) {
  const [thresholds, setThresholds] = useState(null) // Map nivel → exp requerida
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/pokemon-experience-levels').then(r => r.json())
      .then(d => setThresholds(new Map((Array.isArray(d) ? d : []).map(r => [Number(r.pokemon_level), Number(r.pokemon_experience_needed)]))))
      .catch(() => setThresholds(new Map()))
  }, [])

  const level = Number(pokemon.pokemon_level) || 1
  const curExp = Number(pokemon.pokemon_experiencia) || 0
  // Tope: 1 menos del umbral de 2 niveles arriba, para no subir 2 niveles de una vez.
  // Desde nivel 19 ese umbral ya es el del 20 y no hay un 21 al que saltarse,
  // así que se permite alcanzarlo exacto (espejo de back/src/services/personaje.service.js).
  const capLevel = Math.min(level + 2, 20)
  const capT = thresholds ? thresholds.get(capLevel) : null
  const maxAdd = capT != null ? Math.max(0, capT - curExp - (level + 2 > 20 ? 0 : 1)) : null
  const nextT = thresholds ? thresholds.get(level + 1) : null

  const submit = async () => {
    const n = Math.floor(Number(amount))
    if (!Number.isFinite(n) || n < 1) { setError('Ingresa una cantidad válida (mínimo 1)'); return }
    if (maxAdd != null && n > maxAdd) { setError(`El máximo a agregar es ${maxAdd.toLocaleString()}`); return }
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokemon/${pokemon.id_personaje_pokemon}/experiencia`,
        { method: 'PATCH', body: JSON.stringify({ cantidad: n }) })
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || 'No se pudo agregar'); return }
      onDone()
    } catch { setError('No se pudo agregar') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-xs flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Agregar experiencia</h3>
          <button onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-700 disabled:opacity-40"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-xs text-gray-500">{pokemon.pokemon_apodo} · Nv {level} · EXP actual {curExp.toLocaleString()}
            {nextT != null && <> · falta {(Math.max(0, nextT - curExp)).toLocaleString()} para subir</>}</p>
          <input type="number" min={1} max={maxAdd ?? undefined} value={amount} autoFocus
            onChange={e => { setAmount(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !busy) submit() }}
            placeholder="Cantidad de experiencia"
            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
          <p className="text-[10px] text-gray-400">Máximo a agregar: {maxAdd != null ? maxAdd.toLocaleString() : '…'}</p>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
          <button onClick={submit} disabled={busy || !amount}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />} Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PokemonBox({ personajeId, partidaId = null, getConectados = null, mode, editable = false, onClose, onInvoke, onMoved, onExpAdded }) {
  const isBelt = mode === 'belt'
  const title    = isBelt ? 'Cinturón' : 'Femputadora'
  const subtitle = isBelt ? 'Pokémones en tu equipo' : 'Pokémones almacenados'
  const actionLabel = isBelt ? 'Enviar al computador' : 'Agregar al cinturón'
  const targetEnEquipo = !isBelt   // belt → false (al PC); pc → true (al cinturón)

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [expFor, setExpFor] = useState(null) // Pokémon al que se le agrega experiencia
  const [releaseFor, setReleaseFor] = useState(null)   // Pokémon a liberar
  const [releaseSure, setReleaseSure] = useState(false) // segunda confirmación
  const [transferFor, setTransferFor] = useState(null) // Pokémon a transferir
  const [transferDest, setTransferDest] = useState(null)
  const [trainers, setTrainers] = useState([])         // otros entrenadores de la partida
  const [busyAccion, setBusyAccion] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  // Al abrir la transferencia se listan solo los entrenadores CONECTADOS a la
  // partida, excluyendo el propio. La presencia solo trae el id del personaje,
  // así que se cruza con la party para obtener su nombre.
  const abrirTransferencia = (p) => {
    setTransferFor(p); setTransferDest(null); setErrorAccion('')
    const conectados = (getConectados?.() ?? [])
      .filter(u => u.role !== 'master' && u.personaje_id != null)
    const ids = new Set(conectados.map(u => String(u.personaje_id)))
    if (partidaId == null || ids.size === 0) { setTrainers([]); return }
    apiFetch(`/personaje/party?id_partida=${partidaId}`).then(r => r.json())
      .then(d => setTrainers((Array.isArray(d) ? d : [])
        .filter(c => ids.has(String(c.id_personaje)) && String(c.id_personaje) !== String(personajeId))))
      .catch(() => setTrainers([]))
  }

  const load = () => {
    setLoading(true)
    apiFetch(`/personaje/${personajeId}/pokemon?en_equipo=${isBelt ? 'true' : 'false'}`)
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [personajeId, isBelt])

  const handleAction = async (idpp) => {
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/en-equipo`, {
        method: 'PATCH',
        body: JSON.stringify({ en_equipo: targetEnEquipo }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        return j.error || 'No se pudo actualizar el Pokémon'
      }
      onMoved?.(idpp)   // notifica al padre qué Pokémon se movió
      onClose()   // cierra la ventana completamente
      return null
    } catch {
      return 'No se pudo actualizar el Pokémon'
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl">
        <button onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
          <X size={18} />
        </button>

        {expFor && (
          <AddExpModal personajeId={personajeId} pokemon={expFor}
            onClose={() => setExpFor(null)}
            onDone={() => { setExpFor(null); load(); onExpAdded?.() }} />
        )}

        {selected ? (
          <PokemonDetailView personajeId={personajeId} idpp={selected} onBack={() => setSelected(null)}
            actionLabel={actionLabel} onAction={handleAction} onInvoke={onInvoke} />
        ) : (
          <>
            <div className="px-5 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-black text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <p className="text-center text-gray-400 text-sm py-10">Cargando…</p>
              ) : list.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">
                  {isBelt ? 'No tienes Pokémon en el cinturón.' : 'No tienes Pokémon almacenados.'}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {list.map(p => (
                    <div key={p.id_personaje_pokemon} onClick={() => setSelected(p.id_personaje_pokemon)}
                      className="relative flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:border-red-400 hover:shadow transition-all bg-white cursor-pointer">
                      {p.pokemon_is_shiny && (
                        <span title="Shiny" className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-300 rounded-md px-1 py-0.5">
                          <Sparkles size={10} strokeWidth={2.5} /> Shiny
                        </span>
                      )}
                      {editable && Number(p.pokemon_level) < 20 && (
                        <button onClick={e => { e.stopPropagation(); setExpFor(p) }} title="Subir experiencia"
                          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[9px] font-black text-white bg-red-600 hover:bg-red-700 rounded-md px-1.5 py-0.5 shadow transition-colors">
                          EXP <ArrowUp size={11} strokeWidth={3} />
                        </button>
                      )}
                      {/* Solo en la femputadora: liberar (izquierda) y transferir (derecha) */}
                      {!isBelt && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setReleaseFor(p) }} title="Liberar Pokémon"
                            className="absolute bottom-1.5 left-1.5 text-gray-400 hover:text-red-600 transition-colors">
                            <DoorOpen size={16} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); abrirTransferencia(p) }} title="Transferir a otro entrenador"
                            className="absolute bottom-1.5 right-1.5 text-gray-400 hover:text-red-600 transition-colors">
                            <ArrowRightLeft size={16} />
                          </button>
                        </>
                      )}
                      <img src={(p.pokemon_is_shiny && p.pokemon_media_sprite_shiny) ? p.pokemon_media_sprite_shiny : (p.pokemon_media_sprite || p.pokemon_media_main)}
                        alt={p.pokemon_apodo}
                        className="w-16 h-16 object-contain" onError={e => { e.target.style.opacity = '0.2' }} />
                      {/* El nivel va junto al apodo; el apodo trunca pero el nivel siempre se ve */}
                      <span className="flex items-baseline gap-1 max-w-full text-sm font-semibold text-gray-800">
                        <span className="truncate">{p.pokemon_apodo}</span>
                        <span className="shrink-0">({p.pokemon_level})</span>
                      </span>
                      <span className="text-[11px] text-gray-400 truncate max-w-full">{p.pokemon_name}</span>
                      {/* Procedencia: va bajo el nombre de especie, no bajo el apodo */}
                      {p.pokemon_tag && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 truncate max-w-full">
                          {p.pokemon_tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Liberar Pokémon — primera advertencia */}
      {releaseFor && !releaseSure && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h4 className="font-black text-gray-900 text-base">Liberar pokemon</h4>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{releaseFor.pokemon_apodo}</p>
            </div>
            <div className="px-5 py-4 flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Estas apunto de liberar al pokemon, esta accion no se puede deshacer
              </p>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => { setReleaseFor(null); setErrorAccion('') }}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg">Cancelar</button>
              <button onClick={() => setReleaseSure(true)}
                className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg transition-colors">Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {/* Liberar Pokémon — confirmación final */}
      {releaseFor && releaseSure && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-white rounded-2xl w-full max-w-[16rem] shadow-2xl overflow-hidden">
            <div className="px-5 py-5 text-center">
              <AlertTriangle size={26} className="text-red-600 mx-auto mb-2" />
              <p className="text-base font-black text-gray-900">¿Totalmente seguro?</p>
              {errorAccion && <p className="text-xs text-red-600 font-medium mt-2">{errorAccion}</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
              <button onClick={() => { setReleaseSure(false); setReleaseFor(null); setErrorAccion('') }} disabled={busyAccion}
                className="text-sm font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-40 px-5 py-1.5 rounded-lg transition-colors">NO</button>
              <button disabled={busyAccion}
                onClick={async () => {
                  setBusyAccion(true); setErrorAccion('')
                  try {
                    const res = await apiFetch(`/personaje/${personajeId}/pokemon/${releaseFor.id_personaje_pokemon}`, { method: 'DELETE' })
                    if (!res.ok) { const j = await res.json().catch(() => ({})); setErrorAccion(j.error || 'No se pudo liberar'); return }
                    setReleaseSure(false); setReleaseFor(null); load(); onMoved?.()
                  } catch { setErrorAccion('No se pudo liberar') } finally { setBusyAccion(false) }
                }}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-1.5 rounded-lg transition-colors">
                {busyAccion ? <Loader2 size={14} className="animate-spin" /> : null} SI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transferir a otro entrenador */}
      {transferFor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h4 className="font-black text-gray-900 text-base leading-tight">Transferencia de pokémon</h4>
                <p className="text-xs text-gray-500 truncate">{transferFor.pokemon_apodo}</p>
              </div>
              <button onClick={() => { setTransferFor(null); setTransferDest(null); setErrorAccion('') }}
                className="text-gray-400 hover:text-gray-700 shrink-0"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2">Entrenadores conectados</p>
              {trainers.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-3">No hay otros entrenadores conectados.</p>
              ) : (
                <div className="space-y-1.5">
                  {trainers.map(t => {
                    const sel = transferDest?.id_personaje === t.id_personaje
                    return (
                      <button key={t.id_personaje} onClick={() => setTransferDest(t)}
                        className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${
                          sel ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                        <span className="flex-1 min-w-0 text-sm font-bold text-gray-900 truncate">
                          {t.nombre_personaje || 'Sin nombre'}
                        </span>
                        <span className={`shrink-0 w-4 h-4 rounded-full border-2 ${sel ? 'border-red-600 bg-red-600' : 'border-gray-300'}`} />
                      </button>
                    )
                  })}
                </div>
              )}
              {errorAccion && <p className="text-xs text-red-600 font-medium mt-3">{errorAccion}</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => { setTransferFor(null); setTransferDest(null); setErrorAccion('') }}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg">Cancelar</button>
              <button disabled={!transferDest || busyAccion}
                onClick={async () => {
                  setBusyAccion(true); setErrorAccion('')
                  try {
                    const res = await apiFetch(`/personaje/${personajeId}/pokemon/${transferFor.id_personaje_pokemon}/transfer`,
                      { method: 'POST', body: JSON.stringify({ id_personaje_destino: transferDest.id_personaje }) })
                    if (!res.ok) { const j = await res.json().catch(() => ({})); setErrorAccion(j.error || 'No se pudo transferir'); return }
                    setTransferFor(null); setTransferDest(null); load(); onMoved?.()
                  } catch { setErrorAccion('No se pudo transferir') } finally { setBusyAccion(false) }
                }}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-lg transition-colors">
                {busyAccion ? <Loader2 size={14} className="animate-spin" /> : null} Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

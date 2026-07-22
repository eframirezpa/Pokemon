import { useState, useEffect } from 'react'
import { X, Loader2, Check, ChevronDown, Clock } from 'lucide-react'
import { apiFetch } from '../api'
import FeatInfoModal from './FeatInfoModal'
import { featPrereqStatus, buildPrereqContext } from '../lib/featPrereq'
import { ResolvedBonusBadges } from './featBonoBadges'
import SpecializationInfoModal from './SpecializationInfoModal'
import { buildProfs } from '../lib/profs'

/* Checkbox de solo lectura (estilo de la imagen) */
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

const STATS = [
  ['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'],
  ['INT', 'int'], ['WIS', 'wis'], ['CHA', 'cha'],
]
const fmtMod = m => (m >= 0 ? `+${m}` : `${m}`)
const FEAT_MEDIUM_ARMOR_MASTER = 33 // sube a +3 el tope del modificador de DEX en la armadura

function InfoBox({ label, value, danger = false, green = false, red = false }) {
  const box = green ? 'border-green-600 bg-green-100' : red ? 'border-red-600 bg-red-100' : 'border-gray-800 bg-white'
  const lbl = green ? 'text-green-700' : red ? 'text-red-700' : 'text-gray-500'
  const val = danger ? 'text-red-600' : green ? 'text-green-700' : red ? 'text-red-700' : 'text-gray-900'
  return (
    <div className={`border-2 rounded-xl px-2 py-1 text-center ${box}`}>
      <p className={`text-[9px] font-black uppercase leading-tight ${lbl}`}>{label}</p>
      <p className={`text-lg font-black leading-tight ${val}`}>{(value ?? '') === '' ? '—' : value}</p>
    </div>
  )
}

function Row({ label, value, prof = false }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-gray-100">
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">{label}</span>
        {prof && <span className="text-[10px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">prof</span>}
      </span>
      <span className="text-sm text-gray-700 text-right">{(value ?? '') === '' ? '—' : value}</span>
    </div>
  )
}

/* Fila de rasgo (feat) clickeable → abre el detalle */
function FeatRow({ label, feat, onClick }) {
  if (!feat) return null
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-gray-100">
      <span className="text-xs font-semibold text-red-700 uppercase tracking-wide shrink-0">{label}</span>
      <button onClick={onClick} title="Ver detalle del rasgo"
        className="text-sm text-right text-gray-700 underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-red-700 transition-colors">
        {feat.feat_name}
      </button>
    </div>
  )
}

export default function CharacterSheet({ id, onClose, partyVersion = 0, onChanged }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetalles, setShowDetalles] = useState(false)
  const [showMochila, setShowMochila]   = useState(false)
  const [featInfo, setFeatInfo]         = useState(null) // rasgo cuyo detalle se muestra
  const [specInfo, setSpecInfo]         = useState(null) // especialidad cuyo detalle se muestra

  // Carga inicial + re-carga cuando cambia la party (para reflejar cambios en vivo del otro panel)
  useEffect(() => {
    apiFetch(`/personaje/${id}/full`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(prev => prev || null))
      .finally(() => setLoading(false))
  }, [id, partyVersion])

  // Alterna la disponibilidad de un rasgo extra (optimista + persiste + difunde a la party)
  const toggleFeat = async (feat) => {
    const next = !feat.personaje_feat_is_available
    const apply = (val) => setData(d => d && ({
      ...d,
      extra_feats: (d.extra_feats || []).map(f => f.personaje_feat_id === feat.personaje_feat_id ? { ...f, personaje_feat_is_available: val } : f),
    }))
    apply(next)
    try {
      const res = await apiFetch(`/personaje/${id}/feats/${feat.personaje_feat_id}/available`, { method: 'PATCH', body: JSON.stringify({ is_available: next }) })
      if (!res.ok) throw new Error()
      onChanged?.()
    } catch {
      apply(!next) // revierte si falla
    }
  }

  const stats = data?.stats

  // ¿El feat extra cumple sus prerequisitos? (para omitir sus bonos y marcarlo como deshabilitado)
  const prereqCtx = data ? buildPrereqContext(data) : null
  const featMet = (f) => !prereqCtx || featPrereqStatus(f.prereqs, prereqCtx).met

  // Efectos de los feats extra (personaje_feat_bonus), aplicados SOLO al visualizar (no se persisten).
  // Se omiten los feats cuyos prerequisitos no se cumplen (regla todo-o-nada, re-evaluada al mostrar).
  const featFx = (() => {
    const statAdd = {}, savingProf = new Set(), skillProf = new Set(), skillExpert = new Set(), armorList = []
    let hp = 0, maxDexCap = null
    for (const ef of (data?.extra_feats || [])) {
      if (!featMet(ef)) continue
      // Medium Armor Master: el tope del modificador de DEX de la armadura sube de +2 a +3
      if (Number(ef.feat_id) === FEAT_MEDIUM_ARMOR_MASTER) maxDexCap = 3
      for (const b of (ef.bonos || [])) {
        const type  = (b.type || '').toLowerCase()
        const llave = (b.llave || '').toLowerCase()
        if (type === 'stat') statAdd[llave] = (statAdd[llave] || 0) + (Number(b.value) || 0)
        else if (type === 'skill') { const v = (b.value || '').toLowerCase(); if (v === 'expert') skillExpert.add(llave); else if (v === 'prof') skillProf.add(llave) }
        else if (type === 'saving') savingProf.add(llave)
        else if (type === 'healing') hp += Number(b.value) || 0
      }
      for (const a of (ef.armor_profs || [])) armorList.push(a)
    }
    return { statAdd, savingProf, skillProf, skillExpert, hp, armorList, maxDexCap }
  })()

  // Proficiencias de arma (bonos 'text') y de tipo de armadura (feats + background)
  const profs = buildProfs(data)

  // Efectos de las especialidades (personaje_specializations_bonus), también solo al visualizar.
  // Se aplican DESPUÉS de los feats (importa para la regla prof → expert).
  const specFx = (() => {
    const statAdd = {}, skillProf = new Set(), skillExpert = new Set()
    let hp = 0
    for (const sp of (data?.specializations || [])) {
      for (const b of (sp.bonos || [])) {
        const type  = (b.type || '').toLowerCase()
        const llave = (b.llave || '').toLowerCase()
        if (type === 'stat') statAdd[llave] = (statAdd[llave] || 0) + (Number(b.value) || 0)
        else if (type === 'skill') { const v = (b.value || '').toLowerCase(); if (v === 'expert' || v === 'exp') skillExpert.add(llave); else if (v === 'prof') skillProf.add(llave) }
        else if (type === 'healing') hp += Number(b.value) || 0
      }
    }
    return { statAdd, skillProf, skillExpert, hp }
  })()

  // Modificador del ability: FLOOR((base + bonus + feat + especialidad - 10) / 2)
  const abilMod = (key) => {
    if (!stats) return 0
    const final = (stats[`personaje_${key}`] || 0) + (stats[`personaje_${key}_bonus`] || 0)
      + (featFx.statAdd[key] || 0) + (specFx.statAdd[key] || 0)
    return Math.floor((final - 10) / 2)
  }

  // Proficiencia/expertise de una skill: primero los feats extra, luego las especialidades
  const skillFlags = (s) => {
    const name = (s.skill_name || '').toLowerCase()
    let pref = !!s.personaje_skill_pref
    let expert = !!s.personaje_skill_expert
    if (featFx.skillProf.has(name)) pref = true
    if (featFx.skillExpert.has(name)) { if (pref) expert = true; else pref = true }
    if (specFx.skillProf.has(name)) pref = true
    if (specFx.skillExpert.has(name)) { if (pref) expert = true; else pref = true }
    return { pref, expert }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{data?.nombre_personaje || 'Personaje'}</h3>
            {data && <span className="text-sm font-semibold text-gray-500 shrink-0">Nivel {data.personaje_level ?? 1}</span>}
            {data && <span className="text-sm font-bold text-green-700 shrink-0">{(data.pokedollars_personaje || 0).toLocaleString()} ₽</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
          </div>
        ) : !data ? (
          <div className="py-20 text-center text-gray-400 text-sm">No se pudo cargar el personaje.</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* HP (barra de solo lectura) + AC + Prof */}
            {(() => {
              // HP = base guardada (6 + healing de origen/background) + modificador de CON
              // (ya trae los bonos de feats y especialidades) + healing de feats/especialidades
              const extraHp = abilMod('con') + featFx.hp + specFx.hp
              const max = (data.personaje_hp || 0) + extraHp
              const cur = (data.personaje_current_hp ?? (data.personaje_hp || 0)) + extraHp
              const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((cur / max) * 100))) : 0
              const color = pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444'
              // AC recalculado: armadura + modificador de DEX (con los bonos de feats). Sin armadura → AC guardado.
              const ac = (() => {
                const a = data.armor
                if (!a) return data.personaje_ac
                let v = a.armor_type_base_ac || 0
                if (a.armor_type_uses_dex_modifier === 1) {
                  const dexMod = abilMod('dex')
                  if (a.armor_type_max_dex_modifier != null) {
                    // Medium Armor Master eleva el tope de la armadura (de +2 a +3)
                    const cap = featFx.maxDexCap != null
                      ? Math.max(a.armor_type_max_dex_modifier, featFx.maxDexCap)
                      : a.armor_type_max_dex_modifier
                    v += Math.min(dexMod, cap)
                  } else {
                    v += dexMod
                  }
                }
                if (a.armor_type_ac_bonus != null) v += a.armor_type_ac_bonus
                return v
              })()
              return (
                <div className="space-y-3">
                  {/* Barra de vida + AC / Prof / Init */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-0.5">
                        <span className="uppercase tracking-wide">Hit Points</span>
                        <span className="text-gray-700">{cur} / {max}</span>
                      </div>
                      <div className="h-3.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                        <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    <InfoBox label="AC"   value={ac} />
                    <InfoBox label="Prof"
                      value={data.personaje_prof != null ? fmtMod(data.personaje_prof) : '—'}
                      danger={(data.personaje_prof ?? 0) < 0} />
                    <InfoBox label="Init" value={fmtMod(abilMod('dex'))} />
                  </div>

                  {/* EXH / DSTS / DSTF */}
                  <div className="grid grid-cols-3 gap-2">
                    <InfoBox label="EXH"  value={data.personaje_exahust_lvl} />
                    <InfoBox label="DSTS" value={data.personaje_dsts} green />
                    <InfoBox label="DSTF" value={data.personaje_dstf} red />
                  </div>

                  {/* Hit dice / Hit dice left / Speed / Poke lvs */}
                  <div className="grid grid-cols-4 gap-2">
                    <InfoBox label="Hit Dice"      value={data.personaje_hit_dice} />
                    <InfoBox label="Hit Dice Left" value={data.personaje_hit_dice_left ?? '0/0'} />
                    <InfoBox label="Speed"         value={data.personaje_speed != null ? `${data.personaje_speed} ft` : ''} />
                    <InfoBox label="Poke lvs"      value={data.personaje_pokelvls} />
                  </div>

                  {/* Armor Prof (personaje_armor_prof de feats con prereq cumplido, separadas por coma) */}
                  {featFx.armorList.length > 0 && (
                    <Row label="Armor Prof" value={featFx.armorList.join(', ')} />
                  )}
                </div>
              )
            })()}

            {/* Atributos — tres columnas de 2, con el mismo formato que habilidades */}
            {stats && (
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">Atributos</p>
                  <span className="text-[9px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">Proficient</span>
                </div>
                <div className="grid grid-cols-3 gap-x-2 sm:gap-x-4 gap-y-3">
                  {[STATS.slice(0, 2), STATS.slice(2, 4), STATS.slice(4)].map((col, ci) => (
                    <div key={ci} className="space-y-1.5">
                      {col.map(([label, key]) => {
                        const base  = stats[`personaje_${key}`] || 0
                        const bonus = (stats[`personaje_${key}_bonus`] || 0) + (featFx.statAdd[key] || 0) + (specFx.statAdd[key] || 0)
                        const final = base + bonus
                        const mod   = Math.floor((final - 10) / 2)
                        const prof  = stats[`personaje_stats_${key}_prof`] || featFx.savingProf.has(key)
                        return (
                          <div key={key} className="flex items-center gap-1.5 min-w-0">
                            <ReadCheck pref={prof} />
                            <span className={`w-7 shrink-0 text-center text-[11px] font-bold border-b border-gray-400 leading-tight ${
                              mod < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {fmtMod(mod)}
                            </span>
                            <span className="text-[11px] leading-tight truncate min-w-0">
                              <span className="font-semibold text-gray-800">{label}</span>
                              <span className="text-gray-400"> ({final})</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Habilidades */}
            {(data.skills || []).length > 0 && (() => {
              const prof = data.personaje_prof || 0
              const abilityValue = (s) => {
                const key = (s.skill_related_ability || '').toLowerCase()
                if (!stats || stats[`personaje_${key}`] === undefined) return null
                const { pref, expert } = skillFlags(s)
                let v = abilMod(key)                      // modificador del ability
                if (pref)   v += prof                     // proficiente
                if (expert) v += prof                     // experto (suma prof otra vez)
                return v
              }
              const half = Math.ceil(data.skills.length / 2)
              const cols = [data.skills.slice(0, half), data.skills.slice(half)]
              return (
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">Habilidades</p>
                    <span className="text-[9px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">Proficient</span>
                    <span className="text-[9px] font-bold text-white bg-blue-700 rounded px-1.5 py-0.5">Expert</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 sm:gap-x-5 gap-y-3">
                    {cols.map((col, ci) => (
                      <div key={ci}>
                        <div className="space-y-1.5">
                          {col.map((s, i) => {
                            const v = abilityValue(s)
                            const { pref, expert } = skillFlags(s)
                            return (
                              <div key={i} className="flex items-center gap-1.5 min-w-0">
                                <ReadCheck pref={pref} expert={expert} />
                                <span className={`w-7 shrink-0 text-center text-[11px] font-bold border-b border-gray-400 leading-tight ${
                                  v != null && v < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                  {v == null ? '' : fmtMod(v)}
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
              )
            })()}

            {/* Info general al final: saving, equipo, origen/background, rasgos y herramientas */}
            <div className="pt-1 border-t border-gray-100">
              <Row label="Saving Throw" value={data.saving_throw_prof} />
              {data.armor && (
                <Row label="Armadura" value={data.armor.armor_type_name}
                  prof={profs.isArmorProf(data.armor.armor_type_category)} />
              )}
              {(data.weapons || []).length > 0 && (
                <Row label="Arma" value={data.weapons.map(w => w.weapon_type_name).join(', ')}
                  prof={data.weapons.every(w => profs.isWeaponProf(w.weapon_type_name))} />
              )}
              <Row label="Origen"     value={data.origin_name} />
              <Row label="Background" value={data.background_name} />
              <FeatRow label="Rasgo origen"     feat={data.origin_feat}     onClick={() => setFeatInfo(data.origin_feat)} />
              <FeatRow label="Rasgo background" feat={data.background_feat} onClick={() => setFeatInfo(data.background_feat)} />
              {(data.extra_feats || []).map((f, i) => {
                const met = featMet(f)
                return (
                <div key={f.personaje_feat_id} className={`flex items-center justify-between gap-3 py-1 border-b border-gray-100 ${met ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className={`text-xs font-semibold uppercase tracking-wide shrink-0 ${met ? 'text-red-700' : 'text-gray-400'}`}>Rasgo {i + 1}</span>
                    {!met && <span className="text-[10px] font-bold text-amber-800 bg-yellow-100 border border-yellow-300 rounded px-1.5 py-0.5">No cumple prerequisitos</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button onClick={() => setFeatInfo(f)} title="Ver detalle del rasgo"
                      className={`text-sm text-right underline decoration-dotted decoration-gray-400 underline-offset-2 transition-colors ${met ? 'text-gray-700 hover:text-red-700' : 'text-gray-400 hover:text-gray-600'}`}>
                      {f.feat_name}
                    </button>
                    <button onClick={() => toggleFeat(f)}
                      className={`w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                        f.personaje_feat_is_available ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white hover:border-green-400'}`}
                      title={f.personaje_feat_is_available ? 'Marcar como no disponible' : 'Marcar como disponible'}>
                      {f.personaje_feat_is_available && <Check size={11} className="text-white" strokeWidth={3} />}
                    </button>
                    {f.personaje_feat_is_available ? (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-300 rounded px-1.5 py-0.5">Activado</span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-600 bg-yellow-100 border border-yellow-300 rounded px-1.5 py-0.5 inline-flex items-center gap-1">No disponible <Clock size={11} /></span>
                    )}
                  </div>
                </div>
                )
              })}
              {(data.specializations || []).map((s, i) => (
                <div key={s.specialization_id} className="flex items-center justify-between gap-3 py-1 border-b border-gray-100">
                  <span className="text-xs font-semibold uppercase tracking-wide text-red-700 shrink-0">Especialidad {i + 1}</span>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <ResolvedBonusBadges bonos={s.bonos} />
                    <button onClick={() => setSpecInfo(s)} title="Ver detalle de la especialidad"
                      className="text-sm text-right text-gray-700 underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-red-700 transition-colors">
                      {s.specialization_name}
                    </button>
                  </div>
                </div>
              ))}
              {data.background_tool_proficiencies_values && (
                <Row label="Herramientas" value={data.background_tool_proficiencies_values} />
              )}
            </div>

            {/* Equipo */}
            <div>
              <button
                onClick={() => setShowMochila(o => !o)}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-red-700 hover:text-red-800 transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform ${showMochila ? 'rotate-180' : ''}`} />
                Mochila
              </button>
              {showMochila && (
                <div className="mt-1.5">
                  {(data.equipo || []).map((e, i) => (
                    <Row key={i} label={e.item_name} value={`x${e.cantidad}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Detalles narrativos (desplegable) */}
            <div>
              <button
                onClick={() => setShowDetalles(o => !o)}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-red-700 hover:text-red-800 transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform ${showDetalles ? 'rotate-180' : ''}`} />
                Detalles Narrativos
              </button>
              {showDetalles && (
                <div className="mt-1.5">
                  {data.personaje_ideales    && <Row label="Ideales"    value={data.personaje_ideales} />}
                  {data.personaje_falencias  && <Row label="Falencias"  value={data.personaje_falencias} />}
                  {data.personaje_conexiones && <Row label="Conexiones" value={data.personaje_conexiones} />}
                  {(data.details || []).map((d, i) => (
                    <Row key={i} label={d.nombre_personaje_detail} value={d.descripcion_personaje_detail} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detalle del rasgo (feat) */}
      {featInfo && <FeatInfoModal feat={featInfo} theme="light" onClose={() => setFeatInfo(null)} />}

      {/* Detalle de la especialidad */}
      {specInfo && (
        <SpecializationInfoModal spec={specInfo} bonos={specInfo.bonos} theme="light" onClose={() => setSpecInfo(null)} />
      )}
    </div>
  )
}

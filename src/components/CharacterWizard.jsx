import { useState, useEffect } from 'react'
import { X, Check, ChevronLeft, ChevronDown, Plus, Minus, Loader2 } from 'lucide-react'
import { apiFetch } from '../api'

const STEPS = ['Nombre', 'Origen', 'Background', 'Stats', 'Iniciales', 'Equipo', 'Detalles']

const STAT_FIELDS = [
  { key: 'personaje_dex', label: 'DEX', name: 'Dexterity',    desc: 'Agilidad, reflejos, equilibrio, sigilo, precisión, coordinación y reacción ante peligro.' },
  { key: 'personaje_str', label: 'STR', name: 'Strength',     desc: 'Fuerza física, cargar peso, empujar, trepar con fuerza, sujetar, romper objetos y usar fuerza bruta.' },
  { key: 'personaje_con', label: 'CON', name: 'Constitution', desc: 'Salud, resistencia física, aguante, veneno, cansancio, clima extremo y Hit Points.' },
  { key: 'personaje_int', label: 'INT', name: 'Intelligence', desc: 'Memoria, lógica, estudio, análisis, tecnología, investigación y conocimiento técnico.' },
  { key: 'personaje_wis', label: 'WIS', name: 'Wisdom',       desc: 'Percepción, intuición, instinto, supervivencia, lectura de intenciones y conexión con el entorno.' },
  { key: 'personaje_cha', label: 'CHA', name: 'Charisma',     desc: 'Presencia, liderazgo, encanto, confianza, intimidación, persuasión, actuación y vínculos sociales.' },
]
const EMPTY_STATS = { personaje_dex: 0, personaje_str: 0, personaje_con: 0, personaje_int: 0, personaje_wis: 0, personaje_cha: 0 }
const BG_POINTS  = 3
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]
const AZAR_MIN = 4
const MIN_DETALLES = 3
const DETALLE_OPCIONES = [
  'Tono de piel', 'Estatura', 'Complexión', 'Edad', 'Cabello', 'Ojos', 'Cicatrices',
  'Ropa', 'Forma de hablar', 'Cultura', 'Manera de moverse', 'Actitud', 'Estilo personal',
]

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

/* Badges de feat_bonus de un origen/background (healing / skill prof).
   selectedSkills: array de skills elegidas para los bonus skill "any" (en orden) */
function FeatBonusBadges({ bonuses, isSel, selectedSkills = [] }) {
  let anyIdx = 0
  return (bonuses || []).map((b, i) => {
    const type = (b.type || '').toLowerCase()
    if (type === 'healing') {
      return (
        <span key={i} className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-md px-1.5 py-0.5">
          {(b.llave || '').toUpperCase()} +{b.valor}
        </span>
      )
    }
    if (type === 'skill') {
      const isAny = (b.llave || '').toLowerCase() === 'any'
      let skillName
      if (isAny) { skillName = isSel ? selectedSkills[anyIdx] : null; anyIdx++ }
      else skillName = b.llave
      return (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="text-[10px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">prof in</span>
          <span className="text-[11px] font-semibold text-gray-700">{skillName ? cap(skillName) : '(elegir)'}</span>
        </span>
      )
    }
    return null
  })
}

/* Popup: elegir N skills distintas del catálogo */
function SkillSelectPopup({ skills, count = 1, onCancel, onConfirm }) {
  const [chosen, setChosen] = useState([])
  const toggle = (name) => setChosen(c =>
    c.includes(name) ? c.filter(x => x !== name) : (c.length < count ? [...c, name] : c)
  )
  const canConfirm = chosen.length === count

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">{count === 1 ? 'Selecciona una habilidad' : `Selecciona ${count} habilidades`}</h3>
            <p className="text-[11px] text-gray-500">{chosen.length}/{count} elegidas</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-3 space-y-1">
          {skills.map(s => {
            const sel = chosen.includes(s.skill_name)
            return (
              <button key={s.skill_id} onClick={() => toggle(s.skill_name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors border ${
                  sel ? 'bg-red-50 border-red-300' : 'border-transparent hover:bg-gray-50'}`}>
                <span className="flex items-center gap-2">
                  {sel && <Check size={14} className="text-red-600" />}
                  <span className="text-sm font-medium text-gray-800">{s.skill_name}</span>
                </span>
                <span className="text-[10px] font-bold text-gray-400">{s.skill_related_ability}</span>
              </button>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg">Cancelar</button>
          <button onClick={() => onConfirm(chosen)} disabled={!canConfirm}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Paso 1: selección de origen (acordeón) ── */
function OriginStep({ selected, selectedSkills, onSelect }) {
  const [origins, setOrigins] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId,  setOpenId]  = useState(null)

  useEffect(() => {
    apiFetch('/origins/character-creation')
      .then(r => r.json())
      .then(d => setOrigins(Array.isArray(d) ? d : []))
      .catch(() => setOrigins([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Cargando orígenes...
      </div>
    )
  }

  const Block = ({ title, text }) =>
    text?.trim() ? (
      <div>
        {title && <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{title}</p>}
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{text}</p>
      </div>
    ) : null

  return (
    <div className="space-y-2">
      {origins.map(o => {
        const isSel  = selected?.origin_id === o.origin_id
        const isOpen = openId === o.origin_id
        return (
          <div key={o.origin_id}
            className={`rounded-2xl border overflow-hidden transition-all ${
              isSel ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'}`}>

            {/* Cabecera (toggle del acordeón) */}
            <div className={`px-4 py-3 ${isSel ? 'bg-red-50/40' : 'bg-white'}`}>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setOpenId(isOpen ? null : o.origin_id)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  <h3 className="text-base font-bold text-gray-900 truncate">{o.origin_name}</h3>
                </button>
                <button
                  onClick={() => onSelect(o)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isSel ? 'bg-red-600 text-white' : 'bg-gray-900 text-white hover:bg-red-600'}`}
                >
                  {isSel ? <><Check size={13} /> Seleccionado</> : 'Seleccionar'}
                </button>
              </div>

              {/* Bonos de ability + skill proficiency */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-6">
                {o.origin_ability_scores_value_1 && (
                  <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-md px-1.5 py-0.5">
                    {o.origin_ability_scores_value_1.toUpperCase()} +2
                  </span>
                )}
                {o.origin_ability_scores_value_2 && (
                  <span className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-md px-1.5 py-0.5">
                    {o.origin_ability_scores_value_2.toUpperCase()} +1
                  </span>
                )}
                {o.origin_skill_proficiencies_value_1 && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="text-[10px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">prof in</span>
                    <span className="text-[11px] font-semibold text-gray-700">{cap(o.origin_skill_proficiencies_value_1)}</span>
                  </span>
                )}
                <FeatBonusBadges bonuses={o.feat_bonuses} isSel={isSel} selectedSkills={selectedSkills} />
              </div>
            </div>

            {/* Detalle (solo cuando está abierto) */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-white">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{o.origin_description}</p>
                <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                  <Block title={o.origin_ability_scores_name}      text={o.origin_ability_scores_instruction} />
                  <Block title={o.origin_skill_proficiencies_name} text={o.origin_skill_proficiencies_instruction} />
                  <Block title={o.origin_feat_name}                text={o.origin_feat_benefits} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Paso 2: nombre ── */
function NameStep({ nombre, setNombre }) {
  return (
    <div className="py-6 max-w-md mx-auto">
      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del personaje</label>
      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Ej. Ash, Misty..."
        autoFocus
        className="w-full px-4 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50
                   focus:outline-none focus:ring-2 focus:ring-red-400"
      />
    </div>
  )
}

/* ── Paso 4: asignación de stats (Azar / Predeterminados) ── */
const fmtMod = (m) => (m >= 0 ? `+${m}` : `${m}`)

function StatsStep({ mode, setMode, stats, setStats, modifiers }) {
  const inc = (k) => setStats(s => ({ ...s, [k]: s[k] + 1 }))
  const dec = (k) => setStats(s => ({ ...s, [k]: Math.max(0, s[k] - 1) }))
  const chooseMode = (m) => { setMode(m); setStats(EMPTY_STATS) }
  const setStd = (k, value) => setStats(s => ({ ...s, [k]: value }))

  return (
    <div className="max-w-md mx-auto py-2">
      {/* Selector de método */}
      <div className="flex gap-2 justify-center mb-4">
        {[['azar', 'Azar'], ['predeterminados', 'Predeterminados']].map(([m, label]) => (
          <button key={m} onClick={() => chooseMode(m)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              mode === m ? 'bg-red-600 border-red-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'azar' && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 leading-relaxed">
          El jugador elige un Ability Score, tira 4d6, descarta el dado más bajo y suma los 3 dados más altos.
        </p>
      )}

      {!mode ? (
        <p className="text-center text-sm text-gray-400 mt-8">Elige un método para asignar tus stats.</p>
      ) : (
        <div className="space-y-2">
          {STAT_FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-bold text-gray-800">{f.label}</span>
                  <span className="text-sm font-semibold text-gray-600">{f.name}</span>
                  <span className={`text-xs font-bold ${(modifiers[f.key] ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    modifier {fmtMod(modifiers[f.key] ?? 0)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{f.desc}</p>
              </div>

              {mode === 'azar' ? (
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => dec(f.key)} disabled={stats[f.key] === 0}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100
                               disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg text-gray-900 tabular-nums">{stats[f.key]}</span>
                  <button onClick={() => inc(f.key)}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100
                               flex items-center justify-center transition-colors">
                    <Plus size={15} />
                  </button>
                </div>
              ) : (
                <select
                  value={stats[f.key] || ''}
                  onChange={e => setStd(f.key, Number(e.target.value))}
                  className="shrink-0 w-20 px-2 py-1.5 text-sm font-bold text-gray-900 border border-gray-300 rounded-lg bg-white
                             focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">—</option>
                  {STANDARD_ARRAY.map(v => {
                    const usedElsewhere = stats[f.key] !== v && STAT_FIELDS.some(o => o.key !== f.key && stats[o.key] === v)
                    return <option key={v} value={v} disabled={usedElsewhere}>{v}</option>
                  })}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Popup genérico: distribución de 3 puntos entre abilities ──
   options: [{ key: 'personaje_str', label: 'STR' }]
   requireTwo: si true, exige exactamente 2 abilities con puntos (p.ej. [2,1]) */
function AbilityPointsPopup({ title, hint, options, requireTwo, onCancel, onAccept }) {
  const [points, setPoints] = useState(() => Object.fromEntries(options.map(o => [o.key, 0])))
  const total     = Object.values(points).reduce((a, b) => a + b, 0)
  const remaining = BG_POINTS - total
  const nonZero   = Object.values(points).filter(v => v > 0).length
  const canAccept = total === BG_POINTS && (!requireTwo || nonZero === 2)

  const inc = (k) => { if (remaining > 0 && points[k] < 2) setPoints(p => ({ ...p, [k]: p[k] + 1 })) }
  const dec = (k) => setPoints(p => ({ ...p, [k]: Math.max(0, p[k] - 1) }))

  const handleAccept = () => {
    const dist = {}
    for (const k of Object.keys(points)) if (points[k] > 0) dist[k] = points[k]
    onAccept(dist)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Puntos disponibles</p>
            <p className={`text-4xl font-black ${remaining === 0 ? 'text-gray-400' : 'text-red-600'}`}>{remaining}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{hint || 'máx. 2 por habilidad'}</p>
          </div>

          <div className="space-y-2">
            {options.map(o => (
              <div key={o.key} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                <span className="font-bold text-gray-800">{o.label}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => dec(o.key)} disabled={points[o.key] === 0}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100
                               disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg text-gray-900 tabular-nums">{points[o.key]}</span>
                  <button onClick={() => inc(o.key)} disabled={remaining === 0 || points[o.key] >= 2}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100
                               disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg">Cancelar</button>
          <button onClick={handleAccept} disabled={!canAccept}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Bloque de proficiencia: título rojo + descripción + lista de beneficios */
function ProfBlock({ name, description, items }) {
  const list = (items || []).map(x => (x || '').trim()).filter(Boolean)
  if (!name && !description?.trim() && list.length === 0) return null
  return (
    <div className="space-y-1">
      {name && <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{name}</p>}
      {description?.trim() && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{description}</p>}
      {list.length > 0 && (
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
          {list.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      )}
    </div>
  )
}

/* ── Paso 3: selección de background (acordeón) ── */
function BackgroundStep({ selected, selectedSkills, onSelect }) {
  const [backgrounds, setBackgrounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId,  setOpenId]  = useState(null)

  useEffect(() => {
    apiFetch('/backgrounds/character-creation')
      .then(r => r.json())
      .then(d => setBackgrounds(Array.isArray(d) ? d : []))
      .catch(() => setBackgrounds([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Cargando backgrounds...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {backgrounds.map(b => {
        const isSel  = selected?.background_id === b.background_id
        const isOpen = openId === b.background_id
        const abilities = [b.background_ability_scores_value_1, b.background_ability_scores_value_2, b.background_ability_scores_value_3].filter(Boolean)
        const skills    = [b.background_skill_proficiencies_value_1, b.background_skill_proficiencies_value_2].filter(Boolean)
        return (
          <div key={b.background_id}
            className={`rounded-2xl border overflow-hidden transition-all ${
              isSel ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'}`}>

            <div className={`px-4 py-3 ${isSel ? 'bg-red-50/40' : 'bg-white'}`}>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setOpenId(isOpen ? null : b.background_id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                  <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  <h3 className="text-base font-bold text-gray-900 truncate">{b.background_name}</h3>
                </button>
                <button onClick={() => onSelect(b)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isSel ? 'bg-red-600 text-white' : 'bg-gray-900 text-white hover:bg-red-600'}`}>
                  {isSel ? <><Check size={13} /> Seleccionado</> : 'Seleccionar'}
                </button>
              </div>

              {/* Bonos de ability + skill proficiencies */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-6">
                {abilities.map((a, i) => (
                  <span key={i} className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-md px-1.5 py-0.5">
                    +{a.toUpperCase()}
                  </span>
                ))}
                {skills.length > 0 && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="text-[10px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">prof in</span>
                    {skills.map((s, i) => (
                      <span key={i} className="text-[11px] font-semibold text-gray-700">{cap(s)}</span>
                    ))}
                  </span>
                )}
                <FeatBonusBadges bonuses={b.feat_bonuses} isSel={isSel} selectedSkills={selectedSkills} />
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-white">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{b.background_description}</p>
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
                  {/* Feat */}
                  {(b.background_feat_description?.trim() || b.background_feat_benefits?.trim()) && (
                    <div className="space-y-1">
                      {b.background_feat_name && (
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{b.background_feat_name}</p>
                      )}
                      {b.background_feat_description?.trim() && (
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{b.background_feat_description}</p>
                      )}
                      {b.background_feat_benefits?.trim() && (
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{b.background_feat_benefits}</p>
                      )}
                    </div>
                  )}

                  {/* Tool proficiencies */}
                  <ProfBlock
                    name={b.background_tool_proficiencies_name}
                    description={b.background_tool_proficiencies_description}
                    items={(b.background_tool_proficiencies_values || '').split(',')}
                  />

                  {/* Armor proficiencies */}
                  <ProfBlock
                    name={b.background_armor_proficiencies_name}
                    description={b.background_armor_proficiencies_description}
                    items={[
                      b.background_armor_proficiencies_value_1,
                      b.background_armor_proficiencies_value_2,
                      b.background_armor_proficiencies_value_3,
                      b.background_armor_proficiencies_value_4,
                    ]}
                  />

                  {/* Weapon proficiencies */}
                  <ProfBlock
                    name={b.background_weapon_proficiencies_name}
                    description={b.background_weapon_proficiencies_description}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Paso 5: valores iniciales ── */
function IniRow({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
      <span className="text-xs font-bold text-red-700 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  )
}

function IniciativesStep({ conMod, skills, iniSkills, setIniSkills, onMount }) {
  useEffect(() => { onMount() }, []) // al entrar: agrega Animal Handling al prof in

  const hp = 6 + conMod
  const opciones = skills.filter(s => s.skill_name !== 'Animal Handling')
  const toggle = (name) => setIniSkills(cur =>
    cur.includes(name) ? cur.filter(x => x !== name) : (cur.length < 2 ? [...cur, name] : cur)
  )

  return (
    <div className="max-w-md mx-auto py-2 space-y-2">
      <IniRow label="Nivel inicial" value="1" />
      <IniRow label="Hit Dice" value="1d6 por nivel" />
      <IniRow label="Hit Points" value={`${hp}`} />
      <IniRow label="Saving Throw Proficiency" value="CHA (Charisma)" />

      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Skill Proficiencies adicionales</p>
          <span className={`text-xs font-bold ${iniSkills.length === 2 ? 'text-green-600' : 'text-gray-400'}`}>{iniSkills.length}/2</span>
        </div>
        <p className="text-[11px] text-gray-400 mb-2">Elige 2 habilidades.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {opciones.map(s => {
            const sel = iniSkills.includes(s.skill_name)
            return (
              <button key={s.skill_id} onClick={() => toggle(s.skill_name)}
                className={`flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  sel ? 'bg-red-600 border-red-600 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'}`}>
                <span className="truncate">{s.skill_name}</span>
                {sel && <Check size={12} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Paso 6: equipo inicial (asociado a personaje_equipo) ── */
const PACK_IDS = [361, 362, 363]

function EquipoStep({ choice, setChoice, roll, setRoll }) {
  const [items, setItems]     = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = [1, 25, 322, 323, ...PACK_IDS]
    Promise.all(ids.map(id => apiFetch(`/items/${id}`).then(r => r.json())))
      .then(arr => {
        const map = {}
        arr.forEach(it => { if (it && it.item_id) map[it.item_id] = it })
        setItems(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Cargando equipo...
      </div>
    )
  }

  const ItemCard = ({ id, cantidad }) => {
    const it = items[id]
    if (!it) return null
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
        <p className="font-bold text-gray-800">{it.item_name}</p>
        <p className="text-xs text-gray-600 leading-snug mt-0.5">{it.item_description}</p>
        <p className="text-xs font-semibold text-red-700 mt-1">Cantidad: {cantidad}</p>
      </div>
    )
  }

  const pokedollars = (roll === '' || isNaN(Number(roll))) ? null : 1000 + 100 * Number(roll)

  return (
    <div className="max-w-md mx-auto py-2 space-y-2">
      <ItemCard id={1}  cantidad={5} />
      <ItemCard id={25} cantidad={1} />

      {/* Select de paquete (361 / 362 / 363) */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
        <select
          value={choice ?? ''}
          onChange={e => setChoice(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white
                     focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <option value="">Selecciona un paquete...</option>
          {PACK_IDS.map(id => <option key={id} value={id}>{items[id]?.item_name}</option>)}
        </select>
        {choice && items[choice] && (
          <>
            <p className="text-xs text-gray-600 leading-snug mt-2">{items[choice].item_description}</p>
            <p className="text-xs font-semibold text-red-700 mt-1">Cantidad: 1</p>
          </>
        )}
      </div>

      <ItemCard id={322} cantidad={1} />
      <ItemCard id={323} cantidad={1} />

      {/* Pokédollars */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
        <p className="font-bold text-gray-800">Pokédollars</p>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="number"
            value={roll}
            onChange={e => setRoll(e.target.value)}
            placeholder="4d4"
            className="w-24 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          {pokedollars !== null && (
            <span className="text-sm font-bold text-green-700">= {pokedollars.toLocaleString()} ₽</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Paso 7: detalles narrativos (asociado a personaje_details) ── */
function DetallesStep({ detalles, setDetalles }) {
  const [tipo,  setTipo]  = useState('')
  const [texto, setTexto] = useState('')

  const usados       = detalles.map(d => d.tipo)
  const disponibles  = DETALLE_OPCIONES.filter(o => !usados.includes(o))

  const agregar = () => {
    if (!tipo || !texto.trim()) return
    setDetalles([...detalles, { tipo, texto: texto.trim() }])
    setTipo(''); setTexto('')
  }
  const quitar = (i) => setDetalles(detalles.filter((_, j) => j !== i))

  return (
    <div className="max-w-md mx-auto py-2">
      <h3 className="text-sm font-semibold text-gray-800 text-center mb-1">
        Define algunos detalles narrativos para enriquecer la historia
      </h3>
      <p className="text-xs text-gray-400 text-center mb-4">(Al menos {MIN_DETALLES})</p>

      {/* Detalles agregados — parte superior */}
      {detalles.length > 0 && (
        <div className="space-y-2 mb-4">
          {detalles.map((d, i) => (
            <div key={i} className="flex items-start justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{d.tipo}</p>
                <p className="text-sm text-gray-700 leading-snug">{d.texto}</p>
              </div>
              <button onClick={() => quitar(i)} className="text-gray-400 hover:text-red-500 shrink-0" title="Quitar">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selector + campo de texto */}
      {disponibles.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <select
            value={tipo}
            onChange={e => { setTipo(e.target.value); setTexto('') }}
            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">Selecciona un detalle...</option>
            {disponibles.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          {tipo && (
            <div className="flex gap-2 mt-2">
              <input
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') agregar() }}
                placeholder={`Describe: ${tipo.toLowerCase()}...`}
                autoFocus
                className="flex-1 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50
                           focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                onClick={agregar}
                disabled={!texto.trim()}
                className="shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                           text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Agregar
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400">Has agregado todos los detalles disponibles.</p>
      )}

      <p className={`text-xs text-center mt-3 font-medium ${detalles.length >= MIN_DETALLES ? 'text-green-600' : 'text-gray-400'}`}>
        {detalles.length}/{MIN_DETALLES} mínimo
      </p>
    </div>
  )
}

export default function CharacterWizard({ idPartida, onClose, onCreated }) {
  const [step,        setStep]        = useState(0)
  const [origin,      setOrigin]      = useState(null)
  const [originStats, setOriginStats] = useState({}) // bonos elegidos si el origen es "any"
  const [originPopup, setOriginPopup] = useState(null) // origen "any" con popup de ability abierto
  const [originSkills, setOriginSkills] = useState([]) // skills elegidas para feat_bonus skill "any"
  const [skillPopup,  setSkillPopup]  = useState(null) // origen pendiente de elegir skills
  const [pendingOrigin, setPendingOrigin] = useState(null) // { o, abilityDist }
  const [skillsList,  setSkillsList]  = useState([])
  const [nombre,      setNombre]      = useState('')
  const [stats,       setStats]       = useState(EMPTY_STATS)
  const [statsMode,   setStatsMode]   = useState(null) // 'azar' | 'predeterminados'
  const [iniSkills,   setIniSkills]   = useState([]) // 2 skill proficiencies iniciales
  const [animalHandling, setAnimalHandling] = useState(false) // prof base al entrar a Iniciales
  const [equipoChoice, setEquipoChoice] = useState(null) // paquete elegido (361/362/363)
  const [pokedollarsRoll, setPokedollarsRoll] = useState('') // resultado 4d4
  const [detalles,    setDetalles]    = useState([]) // [{ tipo, texto }] → personaje_details
  const [background,  setBackground]  = useState(null)
  const [bgStats,     setBgStats]     = useState({}) // bonos de ability del background
  const [bgPopup,     setBgPopup]     = useState(null) // background con popup de ability abierto
  const [bgSkills,    setBgSkills]    = useState([]) // skills elegidas para feat_bonus skill "any"
  const [bgSkillPopup, setBgSkillPopup] = useState(false)
  const [pendingBg,   setPendingBg]   = useState(null) // { b, abilityDist }
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    apiFetch('/skills').then(r => r.json()).then(d => setSkillsList(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // Validación de stats según el método elegido
  const statVals = STAT_FIELDS.map(f => stats[f.key])
  const statsValid =
    statsMode === 'azar' ? statVals.every(v => v >= AZAR_MIN) :
    statsMode === 'predeterminados'
      ? [...statVals].sort((a, b) => a - b).join() === [...STANDARD_ARRAY].sort((a, b) => a - b).join()
      : false

  const canNext =
    step === 0 ? nombre.trim().length > 0 :
    step === 1 ? !!origin :
    step === 2 ? !!background :
    step === 3 ? statsValid :
    step === 4 ? iniSkills.length === 2 :
    step === 5 ? (equipoChoice !== null && pokedollarsRoll !== '' && Number(pokedollarsRoll) > 0) :
    detalles.length >= MIN_DETALLES // Detalles (último)
  const isLast  = step === STEPS.length - 1

  const isAnyOrigin = (o) =>
    (o.origin_ability_scores_value_1 || '').toLowerCase() === 'any' ||
    (o.origin_ability_scores_value_2 || '').toLowerCase() === 'any'

  // nº de feat_bonus de skill "any" → cuántas skills hay que elegir
  const anySkillCount = (src) =>
    (src.feat_bonuses || []).filter(b => (b.type || '').toLowerCase() === 'skill' && (b.llave || '').toLowerCase() === 'any').length

  const finalizeOrigin = (o, abilityDist, skills) => {
    setOrigin(o); setOriginStats(abilityDist); setOriginSkills(skills)
  }

  // Tras resolver el bono de ability, si falta elegir skills se abre el segundo popup
  const proceedAfterAbility = (o, abilityDist) => {
    if (anySkillCount(o) > 0) { setPendingOrigin({ o, abilityDist }); setSkillPopup(o); return }
    finalizeOrigin(o, abilityDist, [])
  }

  // Origen: si los ability son "any" se abre el popup de ability; si no, sigue directo
  const handleSelectOrigin = (o) => {
    if (isAnyOrigin(o)) { setOriginPopup(o); return }
    proceedAfterAbility(o, {})
  }
  const handleAcceptOrigin = (dist) => {
    const o = originPopup
    setOriginPopup(null)
    proceedAfterAbility(o, dist)
  }
  const handleConfirmOriginSkills = (skills) => {
    finalizeOrigin(pendingOrigin.o, pendingOrigin.abilityDist, skills)
    setSkillPopup(null); setPendingOrigin(null)
  }

  // Background: Seleccionar abre el popup de ability; luego (si aplica) el de skills
  const finalizeBackground = (b, abilityDist, skills) => {
    setBackground(b); setBgStats(abilityDist); setBgSkills(skills)
  }

  const handleSelectBackground = (b) => setBgPopup(b)
  const handleAcceptBg = (dist) => {
    const b = bgPopup
    setBgPopup(null)
    if (anySkillCount(b) > 0) { setPendingBg({ b, abilityDist: dist }); setBgSkillPopup(true); return }
    finalizeBackground(b, dist, [])
  }
  const handleConfirmBgSkills = (skills) => {
    finalizeBackground(pendingBg.b, pendingBg.abilityDist, skills)
    setBgSkillPopup(false); setPendingBg(null)
  }

  // Bono combinado: origen + background
  const bonus = {}
  if (origin) {
    if (isAnyOrigin(origin)) {
      for (const k of Object.keys(originStats)) if (k in EMPTY_STATS) bonus[k] = (bonus[k] || 0) + originStats[k]
    } else {
      for (const [val, amount] of [
        [origin.origin_ability_scores_value_1, 2],
        [origin.origin_ability_scores_value_2, 1],
      ]) {
        const k = `personaje_${(val || '').toLowerCase()}`
        if (k in EMPTY_STATS) bonus[k] = (bonus[k] || 0) + amount
      }
    }
  }
  for (const k of Object.keys(bgStats)) {
    if (k in EMPTY_STATS) bonus[k] = (bonus[k] || 0) + bgStats[k]
  }
  const displayStats = Object.fromEntries(
    Object.keys(EMPTY_STATS).map(k => [k, stats[k] + (bonus[k] || 0)])
  )

  // Modifier por habilidad: FLOOR((Ability Score - 10) / 2), sobre el score final
  const modifiers = Object.fromEntries(
    Object.keys(EMPTY_STATS).map(k => [k, Math.floor((displayStats[k] - 10) / 2)])
  )
  const [savedModifiers, setSavedModifiers] = useState({})
  useEffect(() => { setSavedModifiers(modifiers) }, [JSON.stringify(modifiers)])

  // Skill proficiencies de los feat_bonus del origen seleccionado
  const originFeatProfSkills = []
  if (origin) {
    for (const b of (origin.feat_bonuses || [])) {
      if ((b.type || '').toLowerCase() !== 'skill') continue
      if ((b.llave || '').toLowerCase() !== 'any') originFeatProfSkills.push(b.llave)
    }
    originFeatProfSkills.push(...originSkills)
  }

  // Bonos de healing (HP) del origen + background → se muestran en el header
  const healingBonuses = []
  for (const src of [origin, background]) {
    if (!src) continue
    for (const b of (src.feat_bonuses || [])) {
      if ((b.type || '').toLowerCase() === 'healing') healingBonuses.push(b)
    }
  }

  // Skill proficiencies de los feat_bonus del background seleccionado
  const bgFeatProfSkills = []
  if (background) {
    for (const b of (background.feat_bonuses || [])) {
      if ((b.type || '').toLowerCase() !== 'skill') continue
      if ((b.llave || '').toLowerCase() !== 'any') bgFeatProfSkills.push(b.llave)
    }
    bgFeatProfSkills.push(...bgSkills)
  }

  // Skill proficiencies: origen + background (+ feat_bonus) + iniciales
  const profSkills = [
    ...(origin ? [origin.origin_skill_proficiencies_value_1] : []),
    ...originFeatProfSkills,
    ...(background ? [background.background_skill_proficiencies_value_1, background.background_skill_proficiencies_value_2] : []),
    ...bgFeatProfSkills,
    ...(animalHandling ? ['Animal Handling'] : []),
    ...iniSkills,
  ].filter(Boolean)

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      const res = await apiFetch('/personaje', {
        method: 'POST',
        body: JSON.stringify({
          id_partida: idPartida,
          nombre_personaje: nombre.trim(),
          personaje_origin: origin?.origin_id ?? null,
          personaje_background: background?.background_id ?? null,
          stats: displayStats,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'No se pudo crear el personaje')
      }
      const personaje = await res.json()
      onCreated?.(personaje)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header + progreso */}
        <div className="px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-bold text-gray-900 shrink-0">Crear personaje</h2>
                <div className="flex items-center gap-1 flex-wrap">
                  {STAT_FIELDS.map(f => {
                    const hasBonus = (bonus[f.key] || 0) > 0
                    return (
                      <span key={f.key}
                        className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${hasBonus ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {f.label} <span className={hasBonus ? 'text-green-800' : 'text-gray-900'}>{displayStats[f.key]}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
              {/* Bonos de healing / HP */}
              {healingBonuses.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  {healingBonuses.map((b, i) => (
                    <span key={i} className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">
                      {(b.llave || '').toUpperCase()} +{b.valor}
                    </span>
                  ))}
                </div>
              )}

              {/* Skill proficiencies (origen + background) */}
              {profSkills.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  <span className="text-[10px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">prof in</span>
                  {profSkills.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">{cap(s)}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={18} /></button>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-red-500' : 'bg-gray-200'}`} />
                <p className={`text-[10px] mt-1 font-medium ${i === step ? 'text-red-600' : 'text-gray-400'}`}>
                  {i + 1}. {label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Paso {step + 1} de {STEPS.length}</p>
        </div>

        {/* Contenido del paso */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {step === 0 && <NameStep nombre={nombre} setNombre={setNombre} />}
          {step === 1 && <OriginStep selected={origin} selectedSkills={originSkills} onSelect={handleSelectOrigin} />}
          {step === 2 && <BackgroundStep selected={background} selectedSkills={bgSkills} onSelect={handleSelectBackground} />}
          {step === 3 && <StatsStep mode={statsMode} setMode={setStatsMode} stats={stats} setStats={setStats} modifiers={modifiers} />}
          {step === 4 && (
            <IniciativesStep
              conMod={modifiers.personaje_con ?? 0}
              skills={skillsList}
              iniSkills={iniSkills}
              setIniSkills={setIniSkills}
              onMount={() => setAnimalHandling(true)}
            />
          )}
          {step === 5 && (
            <EquipoStep
              choice={equipoChoice}
              setChoice={setEquipoChoice}
              roll={pokedollarsRoll}
              setRoll={setPokedollarsRoll}
            />
          )}
          {step === 6 && <DetallesStep detalles={detalles} setDetalles={setDetalles} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 shrink-0 flex items-center justify-between">
          <button
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors"
          >
            <ChevronLeft size={15} /> {step === 0 ? 'Cancelar' : 'Atrás'}
          </button>

          {error && <span className="text-xs text-red-600">{error}</span>}

          {isLast ? (
            <button
              onClick={handleCreate}
              disabled={!canNext || saving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                         text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              {saving && <Loader2 className="animate-spin" size={15} />} Crear personaje
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="bg-gray-900 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed
                         text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>

      {/* Popup de bono de skills del background (abilities específicas) */}
      {bgPopup && (
        <AbilityPointsPopup
          title="Bono de skills"
          options={[
            bgPopup.background_ability_scores_value_1,
            bgPopup.background_ability_scores_value_2,
            bgPopup.background_ability_scores_value_3,
          ].filter(Boolean).map(ab => ({ key: `personaje_${ab.toLowerCase()}`, label: ab.toUpperCase() }))}
          onCancel={() => setBgPopup(null)}
          onAccept={handleAcceptBg}
        />
      )}

      {/* Popup de bono de ability del origen "any" (todas las abilities, [2,1]) */}
      {originPopup && (
        <AbilityPointsPopup
          title="Bono de habilidad"
          hint="2 puntos a una habilidad y 1 a otra"
          options={STAT_FIELDS.map(f => ({ key: f.key, label: f.label }))}
          requireTwo
          onCancel={() => setOriginPopup(null)}
          onAccept={handleAcceptOrigin}
        />
      )}

      {/* Popup para elegir skills del origen (feat_bonus skill "any") */}
      {skillPopup && (
        <SkillSelectPopup
          skills={skillsList}
          count={anySkillCount(skillPopup)}
          onCancel={() => { setSkillPopup(null); setPendingOrigin(null) }}
          onConfirm={handleConfirmOriginSkills}
        />
      )}

      {/* Popup para elegir skills del background (feat_bonus skill "any") */}
      {bgSkillPopup && pendingBg && (
        <SkillSelectPopup
          skills={skillsList}
          count={anySkillCount(pendingBg.b)}
          onCancel={() => { setBgSkillPopup(false); setPendingBg(null) }}
          onConfirm={handleConfirmBgSkills}
        />
      )}
    </div>
  )
}

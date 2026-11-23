import { useState, useEffect } from 'react'
import { X, Check, ChevronLeft, ChevronDown, Plus, Minus } from 'lucide-react'
import { apiFetch } from '../api'
import { healingBase } from '../lib/hp'
import SkilledModal from './SkilledModal'
import PokeballSpinner from './PokeballSpinner'
import { ResolvedBonusBadges } from './featBonoBadges'
import { specPreviewBonos } from '../lib/specBonus'
import SpecializationInfoModal from './SpecializationInfoModal'

// Skilled no tiene filas en feats_bonus: su forma son 3 elecciones entre
// proficiencias de skill y textos de 'Tool Prof'. Se pide aquí cuando lo otorga
// el origen o el background, igual que lo pide el lápiz.
const FEAT_SKILLED = 10
const grantsSkilled = (o, b) =>
  Number(o?.origin_feat_id) === FEAT_SKILLED || Number(b?.background_feat_id) === FEAT_SKILLED

// Hay rasgos que traen un bono de terreno: el catálogo lista las opciones en el
// valor, separadas por coma, y hay que escoger una antes de crear. Igual que
// Skilled, se pide aquí cuando lo otorga el origen o el background.
const opcionesDeTerreno = (featBonuses = []) => {
  const vistos = new Set()
  const out = []
  for (const b of featBonuses) {
    if (String(b?.feats_bonus_type || b?.type || '').trim().toLowerCase() !== 'terrain') continue
    for (const t of String(b.feats_bonus_valor ?? b.valor ?? '').split(',')) {
      const limpio = t.trim()
      if (!limpio || vistos.has(limpio.toLowerCase())) continue
      vistos.add(limpio.toLowerCase())
      out.push(limpio)
    }
  }
  return out
}

const STEPS = ['Nombre', 'Origen', 'Background', 'Stats', 'Iniciales', 'Especialidad', 'Equipo', 'Detalles']

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
const PROF_INICIAL = 2 // bono de proficiencia a nivel 1

function ReadCheck({ checked }) {
  return (
    <span className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 ${
      checked ? 'bg-acento border-acento' : 'border-tinte/60 bg-superficie'}`}>
      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
    </span>
  )
}

/* Badges de feat_bonus de un origen/background (healing / skill prof).
   selectedSkills: array de skills elegidas para los bonus skill "any" (en orden) */
function FeatBonusBadges({ bonuses, isSel, selectedSkills = [] }) {
  let anyIdx = 0
  return (bonuses || []).map((b, i) => {
    const type = (b.type || '').toLowerCase()
    if (type === 'healing') {
      return (
        <span key={i} className="text-[11px] font-bold text-ok bg-ok/10 border border-ok/30 rounded-md px-1.5 py-0.5">
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
          <span className="text-[10px] font-bold text-white bg-ok rounded px-1.5 py-0.5">prof in</span>
          <span className="text-[11px] font-semibold text-texto">{skillName ? cap(skillName) : '(elegir)'}</span>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 animate-velo">
      <div className="bg-fondo text-texto rounded-hoja w-full max-w-sm max-h-[80vh] flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-3 border-b border-separador flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-texto">{count === 1 ? 'Selecciona una habilidad' : `Selecciona ${count} habilidades`}</h3>
            <p className="text-[11px] text-texto-2">{chosen.length}/{count} elegidas</p>
          </div>
          <button onClick={onCancel} className="text-texto-2 hover:text-texto"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-3 space-y-1">
          {skills.map(s => {
            const sel = chosen.includes(s.skill_name)
            return (
              <button key={s.skill_id} onClick={() => toggle(s.skill_name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors border ${
                  sel ? 'bg-tinte/10 border-tinte/40' : 'border-transparent hover:bg-superficie'}`}>
                <span className="flex items-center gap-2">
                  {sel && <Check size={14} className="text-tinte" />}
                  <span className="text-sm font-medium text-texto">{s.skill_name}</span>
                </span>
                <span className="text-[10px] font-bold text-texto-2">{s.skill_related_ability}</span>
              </button>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t border-separador flex items-center justify-between shrink-0">
          <button onClick={onCancel} className="text-sm text-texto-2 hover:text-texto px-3 py-2 rounded-lg">Cancelar</button>
          <button onClick={() => onConfirm(chosen)} disabled={!canConfirm}
            className="bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-[15px] font-semibold px-5 h-10 rounded-full transition-colors">
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
  const [loadError, setLoadError] = useState('')
  const [openId,  setOpenId]  = useState(null)
  const [intento, setIntento] = useState(0)

  // Mismo motivo que en BackgroundStep: sin origin_feat_id no se sabe qué
  // otorga el origen, y el fallo se disfrazaría de funcionalidad rota.
  useEffect(() => {
    let vivo = true
    apiFetch('/origins/character-creation')
      .then(r => { if (!r.ok) throw new Error(`El servidor respondió ${r.status}`); return r.json() })
      .then(d => { if (vivo) setOrigins(Array.isArray(d) ? d : []) })
      .catch(e => { if (vivo) { setOrigins([]); setLoadError(e.message || 'No se pudieron cargar los orígenes') } })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [intento])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-texto-2">
        <PokeballSpinner size={18} className="mr-2" /> Cargando orígenes...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="py-14 text-center space-y-3">
        <p className="text-sm font-semibold text-peligro">No se pudieron cargar los orígenes</p>
        <p className="text-xs text-texto-2">{loadError}</p>
        <button onClick={() => { setLoading(true); setLoadError(''); setIntento(n => n + 1) }}
          className="text-sm font-bold text-white bg-acento hover:bg-acento-hover px-4 py-1.5 rounded-lg transition-colors">
          Reintentar
        </button>
      </div>
    )
  }

  const Block = ({ title, text }) =>
    text?.trim() ? (
      <div>
        {title && <p className="text-xs font-bold text-tinte uppercase tracking-wide">{title}</p>}
        <p className="text-sm text-texto-2 leading-relaxed whitespace-pre-line">{text}</p>
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
              isSel ? 'border-tinte/60 ring-1 ring-tinte/40' : 'border-separador'}`}>

            {/* Cabecera (toggle del acordeón) */}
            <div className={`px-4 py-3 ${isSel ? 'bg-tinte/10' : 'bg-superficie'}`}>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setOpenId(isOpen ? null : o.origin_id)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <ChevronDown size={16} className={`shrink-0 text-texto-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  <h3 className="text-base font-bold text-texto truncate">{o.origin_name}</h3>
                </button>
                <button
                  onClick={() => onSelect(o)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isSel ? 'bg-acento text-white' : 'bg-relleno text-tinte hover:bg-relleno-2'}`}
                >
                  {isSel ? <><Check size={13} /> Seleccionado</> : 'Seleccionar'}
                </button>
              </div>

              {/* Bonos de ability + skill proficiency */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-6">
                {o.origin_ability_scores_value_1 && (
                  <span className="text-[11px] font-bold text-ok bg-ok/10 border border-ok/30 rounded-md px-1.5 py-0.5">
                    {o.origin_ability_scores_value_1.toUpperCase()} +2
                  </span>
                )}
                {o.origin_ability_scores_value_2 && (
                  <span className="text-[11px] font-bold text-ok bg-ok/10 border border-ok/30 rounded-md px-1.5 py-0.5">
                    {o.origin_ability_scores_value_2.toUpperCase()} +1
                  </span>
                )}
                {o.origin_skill_proficiencies_value_1 && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="text-[10px] font-bold text-white bg-ok rounded px-1.5 py-0.5">prof in</span>
                    <span className="text-[11px] font-semibold text-texto">{cap(o.origin_skill_proficiencies_value_1)}</span>
                  </span>
                )}
                <FeatBonusBadges bonuses={o.feat_bonuses} isSel={isSel} selectedSkills={selectedSkills} />
              </div>
            </div>

            {/* Detalle (solo cuando está abierto) */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-separador bg-superficie">
                <p className="text-sm text-texto-2 leading-relaxed whitespace-pre-line">{o.origin_description}</p>
                <div className="mt-3 space-y-3 border-t border-separador pt-3">
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
      <label className="block text-sm font-semibold text-texto mb-2">Nombre del personaje</label>
      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Ej. Ash, Misty..."
        autoFocus
        className="w-full px-4 py-2.5 text-sm text-texto border border-separador rounded-xl bg-superficie
                   focus:outline-none focus:ring-2 focus:ring-tinte/50"
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
              mode === m ? 'bg-acento border-acento text-white' : 'border-separador text-texto-2 hover:border-separador bg-superficie'}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'azar' && (
        <p className="text-xs text-aviso bg-aviso/10 border border-aviso/30 rounded-xl p-3 mb-4 leading-relaxed">
          El jugador elige un Ability Score, tira 4d6, descarta el dado más bajo y suma los 3 dados más altos.
        </p>
      )}

      {!mode ? (
        <p className="text-center text-sm text-texto-2 mt-8">Elige un método para asignar tus stats.</p>
      ) : (
        <div className="space-y-2">
          {STAT_FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-3 bg-superficie border border-separador rounded-xl px-4 py-2.5">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-bold text-texto">{f.label}</span>
                  <span className="text-sm font-semibold text-texto-2">{f.name}</span>
                  <span className={`text-xs font-bold ${(modifiers[f.key] ?? 0) < 0 ? 'text-tinte' : 'text-ok'}`}>
                    modifier {fmtMod(modifiers[f.key] ?? 0)}
                  </span>
                </div>
                <p className="text-[11px] text-texto-2 leading-snug mt-0.5">{f.desc}</p>
              </div>

              {mode === 'azar' ? (
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => dec(f.key)} disabled={stats[f.key] === 0}
                    className="w-8 h-8 rounded-lg bg-superficie border border-separador text-texto hover:bg-relleno
                               disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg text-texto tabular-nums">{stats[f.key]}</span>
                  <button onClick={() => inc(f.key)}
                    className="w-8 h-8 rounded-lg bg-superficie border border-separador text-texto hover:bg-relleno
                               flex items-center justify-center transition-colors">
                    <Plus size={15} />
                  </button>
                </div>
              ) : (
                <select
                  value={stats[f.key] || ''}
                  onChange={e => setStd(f.key, Number(e.target.value))}
                  className="shrink-0 w-20 px-2 py-1.5 text-sm font-bold text-texto border border-separador rounded-lg bg-superficie
                             focus:outline-none focus:ring-2 focus:ring-tinte/50"
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 animate-velo">
      <div className="bg-fondo text-texto rounded-hoja w-full max-w-sm max-h-[85vh] flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
          <h3 className="font-bold text-texto">{title}</h3>
          <button onClick={onCancel} className="text-texto-2 hover:text-texto"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <div className="text-center mb-4">
            <p className="text-xs text-texto-2 uppercase tracking-wide font-semibold">Puntos disponibles</p>
            <p className={`text-4xl font-black ${remaining === 0 ? 'text-texto-2' : 'text-tinte'}`}>{remaining}</p>
            <p className="text-[11px] text-texto-2 mt-0.5">{hint || 'máx. 2 por habilidad'}</p>
          </div>

          <div className="space-y-2">
            {options.map(o => (
              <div key={o.key} className="flex items-center justify-between bg-superficie border border-separador rounded-xl px-4 py-2">
                <span className="font-bold text-texto">{o.label}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => dec(o.key)} disabled={points[o.key] === 0}
                    className="w-8 h-8 rounded-lg bg-superficie border border-separador text-texto hover:bg-relleno
                               disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg text-texto tabular-nums">{points[o.key]}</span>
                  <button onClick={() => inc(o.key)} disabled={remaining === 0 || points[o.key] >= 2}
                    className="w-8 h-8 rounded-lg bg-superficie border border-separador text-texto hover:bg-relleno
                               disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-separador flex items-center justify-between shrink-0">
          <button onClick={onCancel} className="text-sm text-texto-2 hover:text-texto px-3 py-2 rounded-lg">Cancelar</button>
          <button onClick={handleAccept} disabled={!canAccept}
            className="bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-[15px] font-semibold px-5 h-10 rounded-full transition-colors">
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
      {name && <p className="text-xs font-bold text-tinte uppercase tracking-wide">{name}</p>}
      {description?.trim() && <p className="text-sm text-texto-2 leading-relaxed whitespace-pre-line">{description}</p>}
      {list.length > 0 && (
        <ul className="list-disc list-inside text-sm text-texto-2 space-y-0.5">
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
  const [loadError, setLoadError] = useState('')
  const [openId,  setOpenId]  = useState(null)
  const [intento, setIntento] = useState(0)

  // Un fallo aquí NO se puede tragar en silencio: sin background_feat_id el
  // wizard no sabe que el background otorga Skilled y se salta su ventana, con
  // el aspecto de un bug de la funcionalidad y no de una carga fallida.
  useEffect(() => {
    let vivo = true
    apiFetch('/backgrounds/character-creation')
      .then(r => { if (!r.ok) throw new Error(`El servidor respondió ${r.status}`); return r.json() })
      .then(d => { if (vivo) setBackgrounds(Array.isArray(d) ? d : []) })
      .catch(e => { if (vivo) { setBackgrounds([]); setLoadError(e.message || 'No se pudieron cargar los backgrounds') } })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [intento])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-texto-2">
        <PokeballSpinner size={18} className="mr-2" /> Cargando backgrounds...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="py-14 text-center space-y-3">
        <p className="text-sm font-semibold text-peligro">No se pudieron cargar los backgrounds</p>
        <p className="text-xs text-texto-2">{loadError}</p>
        <button onClick={() => { setLoading(true); setLoadError(''); setIntento(n => n + 1) }}
          className="text-sm font-bold text-white bg-acento hover:bg-acento-hover px-4 py-1.5 rounded-lg transition-colors">
          Reintentar
        </button>
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
              isSel ? 'border-tinte/60 ring-1 ring-tinte/40' : 'border-separador'}`}>

            <div className={`px-4 py-3 ${isSel ? 'bg-tinte/10' : 'bg-superficie'}`}>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setOpenId(isOpen ? null : b.background_id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                  <ChevronDown size={16} className={`shrink-0 text-texto-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  <h3 className="text-base font-bold text-texto truncate">{b.background_name}</h3>
                </button>
                <button onClick={() => onSelect(b)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    isSel ? 'bg-acento text-white' : 'bg-relleno text-tinte hover:bg-relleno-2'}`}>
                  {isSel ? <><Check size={13} /> Seleccionado</> : 'Seleccionar'}
                </button>
              </div>

              {/* Bonos de ability + skill proficiencies */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-6">
                {abilities.map((a, i) => (
                  <span key={i} className="text-[11px] font-bold text-ok bg-ok/10 border border-ok/30 rounded-md px-1.5 py-0.5">
                    +{a.toUpperCase()}
                  </span>
                ))}
                {skills.length > 0 && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="text-[10px] font-bold text-white bg-ok rounded px-1.5 py-0.5">prof in</span>
                    {skills.map((s, i) => (
                      <span key={i} className="text-[11px] font-semibold text-texto">{cap(s)}</span>
                    ))}
                  </span>
                )}
                <FeatBonusBadges bonuses={b.feat_bonuses} isSel={isSel} selectedSkills={selectedSkills} />
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-separador bg-superficie">
                <p className="text-sm text-texto-2 leading-relaxed whitespace-pre-line">{b.background_description}</p>
                <div className="mt-3 border-t border-separador pt-3 space-y-3">
                  {/* Feat */}
                  {(b.background_feat_description?.trim() || b.background_feat_benefits?.trim()) && (
                    <div className="space-y-1">
                      {b.background_feat_name && (
                        <p className="text-xs font-bold text-tinte uppercase tracking-wide">{b.background_feat_name}</p>
                      )}
                      {b.background_feat_description?.trim() && (
                        <p className="text-sm text-texto-2 leading-relaxed whitespace-pre-line">{b.background_feat_description}</p>
                      )}
                      {b.background_feat_benefits?.trim() && (
                        <p className="text-sm text-texto-2 leading-relaxed whitespace-pre-line">{b.background_feat_benefits}</p>
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

function IniRow({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-superficie border border-separador rounded-xl px-4 py-2.5">
      <span className="text-xs font-bold text-tinte uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-texto text-right">{value}</span>
    </div>
  )
}

/* ── Paso 6: especialidad (a nivel 1 se elige una; mismos bonos que en el lápiz) ── */
function SpecStep({ specs, loading, valor, onPick }) {
  const [busca, setBusca] = useState('')
  const [specInfo, setSpecInfo] = useState(null) // especialidad cuyo detalle se muestra
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-texto-2">
        <PokeballSpinner size={18} className="mr-2" /> Cargando especialidades...
      </div>
    )
  }
  const lista = specs.filter(s => !busca || s.specialization_name?.toLowerCase().includes(busca.toLowerCase()))
  return (
    <div className="max-w-md mx-auto py-2">
      <p className="text-xs font-bold text-texto uppercase tracking-wide mb-1">Especialidad</p>
      <p className="text-[11px] text-texto-2 mb-2">Elige 1 especialidad. Da un bono de atributo y expertise en una habilidad, y potencia a tus Pokémon de su tipo.</p>
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar especialidad..."
        className="w-full mb-2 px-3 py-1.5 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50" />
      <div className="border border-separador rounded-xl divide-y divide-separador">
        {lista.length === 0 ? (
          <p className="text-xs text-texto-2 italic px-3 py-3">Sin especialidades disponibles.</p>
        ) : lista.map(s => {
          const sel = String(valor) === String(s.specialization_id)
          return (
            <div key={s.specialization_id}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 transition-colors ${sel ? 'bg-tinte/10' : 'hover:bg-superficie'}`}>
              <button onClick={() => onPick(sel ? null : s)} className="min-w-0 flex-1 text-left flex items-center gap-1.5 flex-wrap">
                <span onClick={e => { e.stopPropagation(); setSpecInfo(s) }} title="Ver detalle"
                  className={`text-sm font-medium underline decoration-dotted underline-offset-2 ${sel ? 'text-tinte decoration-tinte/40' : 'text-texto decoration-texto-2/40'} hover:text-tinte`}>
                  {s.specialization_name}
                </span>
                {s.specialization_pokemon_type_name && (
                  <span className="text-[9px] font-bold text-tinte bg-tinte/10 border border-tinte/30 rounded px-1 shrink-0">
                    {s.specialization_pokemon_type_name}
                  </span>
                )}
                <ResolvedBonusBadges bonos={specPreviewBonos(s)} />
              </button>
              <button onClick={() => onPick(sel ? null : s)}
                className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${sel ? 'border-acento bg-acento' : 'border-separador'}`}>
                {sel && <span className="w-1.5 h-1.5 rounded-full bg-superficie" />}
              </button>
            </div>
          )
        })}
      </div>
      {specInfo && (
        <SpecializationInfoModal spec={specInfo} bonos={specPreviewBonos(specInfo)} onClose={() => setSpecInfo(null)} />
      )}
    </div>
  )
}

/* ── Paso 5: valores iniciales ── */
function IniciativesStep({ hpBonus = 0, conMod = 0, skills, iniSkills, setIniSkills, previas, onMount }) {
  useEffect(() => { onMount() }, []) // al entrar: agrega Animal Handling al prof in

  // Lo que se persiste es la base (6 + healing horneado), pero lo que se muestra
  // es el total con el que nace el personaje, que le suma el modificador de CON.
  const hp = 6 + hpBonus + conMod
  const opciones = skills.filter(s => s.skill_name !== 'Animal Handling')
  const yaTiene = (name) => previas.has((name || '').toLowerCase())
  const toggle = (name) => setIniSkills(cur =>
    cur.includes(name) ? cur.filter(x => x !== name) : (cur.length < 2 && !yaTiene(name) ? [...cur, name] : cur)
  )

  return (
    <div className="max-w-md mx-auto py-2 space-y-2">
      <IniRow label="Nivel inicial" value="1" />
      <IniRow label="Hit Dice" value="1d6 por nivel" />
      <IniRow label="Hit Points" value={`${hp}`} />
      <IniRow label="Saving Throw Proficiency" value="CHA (Charisma)" />

      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-texto uppercase tracking-wide">Skill Proficiencies adicionales</p>
          <span className={`text-xs font-bold ${iniSkills.length === 2 ? 'text-ok' : 'text-texto-2'}`}>{iniSkills.length}/2</span>
        </div>
        <p className="text-[11px] text-texto-2 mb-2">
          Elige 2 habilidades. En verde claro, las que ya tienes; en verde, las que vas a elegir.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {opciones.map(s => {
            const sel = iniSkills.includes(s.skill_name)
            const previa = yaTiene(s.skill_name)
            return (
              <button key={s.skill_id} onClick={() => toggle(s.skill_name)} disabled={previa}
                title={previa ? 'Ya tienes esta proficiencia' : undefined}
                className={`flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  previa ? 'bg-ok/15 border-ok/30 text-ok cursor-not-allowed'
                  : sel ? 'bg-ok border-ok text-white'
                  : 'border-separador text-texto hover:border-separador bg-superficie'}`}>
                <span className="truncate">{s.skill_name}</span>
                {(sel || previa) && <Check size={12} className="shrink-0" />}
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
const PACK_NAMES = { 361: "Dungeoneer's Pack", 362: "Explorer's Pack", 363: "Filcher's Pack" }

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
      <div className="flex items-center justify-center py-16 text-texto-2">
        <PokeballSpinner size={18} className="mr-2" /> Cargando equipo...
      </div>
    )
  }

  const ItemCard = ({ id, cantidad }) => {
    const it = items[id]
    if (!it) return null
    return (
      <div className="bg-superficie border border-separador rounded-xl px-4 py-2.5">
        <p className="font-bold text-texto">{it.item_name}</p>
        <p className="text-xs text-texto-2 leading-snug mt-0.5">{it.item_description}</p>
        <p className="text-xs font-semibold text-tinte mt-1">Cantidad: {cantidad}</p>
      </div>
    )
  }

  const pokedollars = (roll === '' || isNaN(Number(roll))) ? null : 1000 + 100 * Number(roll)

  return (
    <div className="max-w-md mx-auto py-2 space-y-2">
      <ItemCard id={1}  cantidad={5} />
      <ItemCard id={25} cantidad={1} />

      {/* Select de paquete (361 / 362 / 363) */}
      <div className="bg-superficie border border-separador rounded-xl px-4 py-2.5">
        <select
          value={choice ?? ''}
          onChange={e => setChoice(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 text-sm text-texto border border-separador rounded-lg bg-superficie
                     focus:outline-none focus:ring-2 focus:ring-tinte/50"
        >
          <option value="">Selecciona un paquete...</option>
          {PACK_IDS.map(id => <option key={id} value={id}>{items[id]?.item_name}</option>)}
        </select>
        {choice && items[choice] && (
          <>
            <p className="text-xs text-texto-2 leading-snug mt-2">{items[choice].item_description}</p>
            <p className="text-xs font-semibold text-tinte mt-1">Cantidad: 1</p>
          </>
        )}
      </div>

      <ItemCard id={322} cantidad={1} />
      <ItemCard id={323} cantidad={1} />

      {/* Pokédollars */}
      <div className="bg-superficie border border-separador rounded-xl px-4 py-2.5">
        <p className="font-bold text-texto">Pokédollars</p>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="number"
            value={roll}
            onChange={e => setRoll(e.target.value)}
            placeholder="4d4"
            className="w-24 px-3 py-2 text-sm text-texto border border-separador rounded-lg bg-superficie
                       focus:outline-none focus:ring-2 focus:ring-tinte/50"
          />
          {pokedollars !== null && (
            <span className="text-sm font-bold text-ok">= {pokedollars.toLocaleString()} ₽</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Paso 7: detalles narrativos (asociado a personaje_details) ── */
function DetallesStep({ detalles, setDetalles, narrativa, setNarrativa }) {
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
      {/* Campos narrativos */}
      <div className="space-y-3 mb-5">
        {[['ideales', 'Ideales'], ['falencias', 'Falencias'], ['conexiones', 'Conexiones']].map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-bold text-tinte uppercase tracking-wide mb-1">{label}</label>
            <textarea
              value={narrativa[key]}
              onChange={e => setNarrativa({ ...narrativa, [key]: e.target.value })}
              rows={2}
              placeholder={`Describe los ${label.toLowerCase()} de tu personaje...`}
              className="w-full px-3 py-2 text-sm text-texto border border-separador rounded-lg bg-superficie
                         focus:outline-none focus:ring-2 focus:ring-tinte/50 resize-none"
            />
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-texto text-center mb-1">
        Define algunos detalles narrativos para enriquecer la historia
      </h3>
      <p className="text-xs text-texto-2 text-center mb-4">(Al menos {MIN_DETALLES})</p>

      {/* Detalles agregados — parte superior */}
      {detalles.length > 0 && (
        <div className="space-y-2 mb-4">
          {detalles.map((d, i) => (
            <div key={i} className="flex items-start justify-between gap-3 bg-superficie border border-separador rounded-xl px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-bold text-tinte uppercase tracking-wide">{d.tipo}</p>
                <p className="text-sm text-texto leading-snug">{d.texto}</p>
              </div>
              <button onClick={() => quitar(i)} className="text-texto-2 hover:text-tinte shrink-0" title="Quitar">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selector + campo de texto */}
      {disponibles.length > 0 ? (
        <div className="bg-superficie border border-separador rounded-xl p-3">
          <select
            value={tipo}
            onChange={e => { setTipo(e.target.value); setTexto('') }}
            className="w-full px-3 py-2 text-sm text-texto border border-separador rounded-lg bg-superficie
                       focus:outline-none focus:ring-2 focus:ring-tinte/50"
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
                className="flex-1 px-3 py-2 text-sm text-texto border border-separador rounded-lg bg-superficie
                           focus:outline-none focus:ring-2 focus:ring-tinte/50"
              />
              <button
                onClick={agregar}
                disabled={!texto.trim()}
                className="shrink-0 bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed
                           text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Agregar
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-texto-2">Has agregado todos los detalles disponibles.</p>
      )}

      <p className={`text-xs text-center mt-3 font-medium ${detalles.length >= MIN_DETALLES ? 'text-ok' : 'text-texto-2'}`}>
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
  const [specList,    setSpecList]    = useState([])
  const [specLoading, setSpecLoading] = useState(true)
  const [spec,        setSpec]        = useState(null) // especialización elegida
  const [iniSkillsRaw, setIniSkills]   = useState([]) // 2 skill proficiencies iniciales
  const [animalHandling, setAnimalHandling] = useState(false) // prof base al entrar a Iniciales
  const [equipoChoice, setEquipoChoice] = useState(null) // paquete elegido (361/362/363)
  const [pokedollarsRoll, setPokedollarsRoll] = useState('') // resultado 4d4
  const [detalles,    setDetalles]    = useState([]) // [{ tipo, texto }] → personaje_details
  const [narrativa,   setNarrativa]   = useState({ ideales: '', falencias: '', conexiones: '' })
  const [showVerify,  setShowVerify]  = useState(false)
  const [background,  setBackground]  = useState(null)
  const [bgStats,     setBgStats]     = useState({}) // bonos de ability del background
  const [bgPopup,     setBgPopup]     = useState(null) // background con popup de ability abierto
  const [bgSkills,    setBgSkills]    = useState([]) // skills elegidas para feat_bonus skill "any"
  const [skilledChoices, setSkilledChoices] = useState(null)  // { skills, texts } del feat Skilled
  const [skilledPopup,   setSkilledPopup]   = useState(false)
  const [terrainOpts,    setTerrainOpts]    = useState([])   // terrenos elegibles del rasgo de cuna
  const [terrainChoice,  setTerrainChoice]  = useState('')
  const [bgSkillPopup, setBgSkillPopup] = useState(false)
  const [pendingBg,   setPendingBg]   = useState(null) // { b, abilityDist }
  const [armorList,    setArmorList]    = useState([])
  const [armorSelected, setArmorSelected] = useState(null)
  const [showArmorPicker, setShowArmorPicker] = useState(false)
  const [weaponList,   setWeaponList]   = useState([])
  const [weaponSelected, setWeaponSelected] = useState(null)
  const [showWeaponPicker, setShowWeaponPicker] = useState(false)
  const [weaponSearch, setWeaponSearch] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    apiFetch('/specializations?limit=200').then(r => r.json()).then(d => setSpecList(d.data ?? []))
      .catch(() => {}).finally(() => setSpecLoading(false))
  }, [])

  useEffect(() => {
    apiFetch('/skills').then(r => r.json()).then(d => setSkillsList(Array.isArray(d) ? d : [])).catch(() => {})
    apiFetch('/armor-types?limit=200').then(r => r.json()).then(d => setArmorList(Array.isArray(d.data) ? d.data : [])).catch(() => {})
    apiFetch('/weapon-types?limit=500').then(r => r.json()).then(d => setWeaponList(Array.isArray(d.data) ? d.data : [])).catch(() => {})
  }, [])

  // Validación de stats según el método elegido
  const statVals = STAT_FIELDS.map(f => stats[f.key])
  const statsValid =
    statsMode === 'azar' ? statVals.every(v => v >= AZAR_MIN) :
    statsMode === 'predeterminados'
      ? [...statVals].sort((a, b) => a - b).join() === [...STANDARD_ARRAY].sort((a, b) => a - b).join()
      : false

  const isLast  = step === STEPS.length - 1

  const isAnyOrigin = (o) =>
    (o.origin_ability_scores_value_1 || '').toLowerCase() === 'any' ||
    (o.origin_ability_scores_value_2 || '').toLowerCase() === 'any'

  // nº de feat_bonus de skill "any" → cuántas skills hay que elegir
  const anySkillCount = (src) =>
    (src.feat_bonuses || []).filter(b => (b.type || '').toLowerCase() === 'skill' && (b.llave || '').toLowerCase() === 'any').length

  const finalizeOrigin = (o, abilityDist, skills) => {
    setOrigin(o); setOriginStats(abilityDist); setOriginSkills(skills)
    // Cambiar de origen invalida las elecciones de Skilled: puede dejar de
    // otorgarlo, o hacerlo cuando antes no.
    setSkilledChoices(null)
    if (grantsSkilled(o, background)) setSkilledPopup(true)
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
    setArmorSelected(null); setWeaponSelected(null) // al cambiar de background se vuelve a elegir
    setSkilledChoices(null)
    if (grantsSkilled(origin, b)) setSkilledPopup(true)
  }

  // Armaduras cuyo armor_type_category coincide con la proficiencia del background
  const armorOptions = (b) => {
    if (!b) return []
    const cats = [
      b.background_armor_proficiencies_value_1, b.background_armor_proficiencies_value_2,
      b.background_armor_proficiencies_value_3, b.background_armor_proficiencies_value_4,
    ].filter(Boolean).map(c => c.toLowerCase())
    if (!cats.length) return []
    return armorList.filter(a => cats.includes((a.armor_type_category || '').toLowerCase()))
  }

  const handleSelectArmor = (armor) => {
    setArmorSelected(armor)
    setShowArmorPicker(false)
    if (!weaponSelected) setShowWeaponPicker(true) // continuar con arma
    else setStep(s => s + 1)
  }

  const handleSelectWeapon = (weapon) => {
    setWeaponSelected(weapon)
    setShowWeaponPicker(false)
    setStep(s => s + 1) // avanza a Stats
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
  // El bono de la especialidad se muestra pero no entra en `bonus`: el backend
  // lo persiste como bono de la especialidad, no como stats_bonus.
  const specStatKey = spec?.specialization_ability_score_increase
    ? `personaje_${spec.specialization_ability_score_increase.toLowerCase().slice(0, 3)}` : null
  const displayStats = Object.fromEntries(
    Object.keys(EMPTY_STATS).map(k => [k, stats[k] + (bonus[k] || 0)
      + (k === specStatKey ? Number(spec.specialization_ability_score_increase_value ?? 1) : 0)])
  )

  // Modifier por habilidad: FLOOR((Ability Score - 10) / 2), sobre la base asignada
  const modifiers = Object.fromEntries(
    Object.keys(EMPTY_STATS).map(k => [k, Math.floor((stats[k] - 10) / 2)])
  )
  // Modifier del score final (base + bonos) para el header
  const displayModifiers = Object.fromEntries(
    Object.keys(EMPTY_STATS).map(k => [k, Math.floor((displayStats[k] - 10) / 2)])
  )

  // AC = base_ac + (DEX mod, tope max_dex) si usa modificador + ac_bonus
  const armorAC = (() => {
    if (!armorSelected) return null
    const dexMod = displayModifiers.personaje_dex ?? 0
    let ac = armorSelected.armor_type_base_ac || 0
    if (armorSelected.armor_type_uses_dex_modifier === 1) {
      const max = armorSelected.armor_type_max_dex_modifier
      ac += (max != null) ? Math.min(dexMod, max) : dexMod
    }
    if (armorSelected.armor_type_ac_bonus != null) ac += armorSelected.armor_type_ac_bonus
    return ac
  })()

  // Intercepta "Siguiente": en Background, pide armadura y luego arma antes de avanzar
  const handleNext = () => {
    if (step === 2 && background) {
      if (!armorSelected && armorOptions(background).length > 0) { setShowArmorPicker(true); return }
      if (!weaponSelected) { setShowWeaponPicker(true); return }
    }
    setStep(s => s + 1)
  }
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
  // Bono total de HP (llave 'hp') para sumar a los Hit Points.
  // El personaje nace a nivel 1, así que de un bono "N per lvl" se hornea una
  // sola instancia; los niveles restantes los repone lib/hp.js al mostrar.
  const hpBonus = healingBonuses
    .filter(b => (b.llave || '').toLowerCase() === 'hp')
    .reduce((sum, b) => sum + healingBase(b.valor), 0)

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
  const profSkillsPrevias = [
    ...(origin ? [origin.origin_skill_proficiencies_value_1] : []),
    ...originFeatProfSkills,
    ...(background ? [background.background_skill_proficiencies_value_1, background.background_skill_proficiencies_value_2] : []),
    ...bgFeatProfSkills,
    ...(animalHandling ? ['Animal Handling'] : []),
    // Las skills elegidas dentro de Skilled NO van aquí: quedan como bono del
    // feat, igual que cuando se agrega por lápiz. La hoja hace el OR entre
    // personaje_skill_pref y las skills de los feats, así que se ven igual y
    // no queda el mismo dato en dos sitios.
  ].filter(Boolean)

  // Lo que ya tiene ANTES de elegir las 2 iniciales: origen, background y Skilled. La
  // especialidad va DESPUÉS a propósito: su expertise puede caer en una skill que ya se tiene. El paso Iniciales las pinta y no deja repetirlas.
  const profPrevias = new Set([
    ...profSkillsPrevias.map(s => s.toLowerCase()),
    ...(skilledChoices?.skills || []).map(s => (s || '').toLowerCase()),
  ])
  // Si cambiar origen/background vuelve "previa" una inicial ya
  // elegida, deja de contar: no puede quedar la misma proficiencia dos veces.
  const iniSkills = iniSkillsRaw.filter(n => !profPrevias.has(n.toLowerCase()))

  const profSkills = [...profSkillsPrevias, ...iniSkills]


  const canNext =
    step === 0 ? nombre.trim().length > 0 :
    step === 1 ? !!origin :
    step === 2 ? !!background :
    step === 3 ? statsValid :
    step === 4 ? iniSkills.length === 2 :
    step === 5 ? !!spec :
    step === 6 ? (equipoChoice !== null && pokedollarsRoll !== '' && Number(pokedollarsRoll) > 0) :
    detalles.length >= MIN_DETALLES // Detalles (último)

  // ¿El origen o el background otorgan Skilled? Entonces hay que elegir sus 3
  // opciones antes de poder crear.
  const needsSkilled = grantsSkilled(origin, background)
  const featDeCuna = Number(background?.background_feat_id) || Number(origin?.origin_feat_id) || null
  // Las opciones salen del catálogo del rasgo, no de una lista fija: si mañana
  // se agrega o quita un terreno, el selector lo refleja solo.
  // Todo el setState va dentro de la promesa: la regla de lint no distingue el
  // caso "sin rasgo" de un setState suelto en el efecto, y el resultado es el
  // mismo. Sin rasgo se resuelve con la lista vacía.
  useEffect(() => {
    let vivo = true
    const cargar = featDeCuna
      ? apiFetch(`/feats/${featDeCuna}`).then(r => r.json()).then(f => opcionesDeTerreno(f?.feat_bonuses || []))
      : Promise.resolve([])
    cargar
      .then(opts => { if (vivo) { setTerrainOpts(opts); setTerrainChoice('') } })
      .catch(() => { if (vivo) { setTerrainOpts([]); setTerrainChoice('') } })
    return () => { vivo = false }
  }, [featDeCuna])
  const needsTerrain = terrainOpts.length > 0
  const terrainListo = !needsTerrain || !!terrainChoice
  const skilledListo = !needsSkilled || !!skilledChoices
  // Las que ya tiene ANTES de Skilled: es lo que el selector marca en verde.
  const profSkillNames = new Set(profSkills.map(s => (s || '').toLowerCase()))

  // Para MOSTRAR proficiencias hay que sumar las elegidas dentro de Skilled.
  // No van en profSkills porque no se persisten en personaje_skill (quedan como
  // bono del feat), pero al usuario le cuentan igual: es el mismo OR que hace la
  // hoja entre personaje_skill_pref y las skills de los feats.
  const profSkillsVisibles = new Set([
    ...profSkillNames,
    ...(skilledChoices?.skills || []).map(s => (s || '').toLowerCase()),
    ...(spec?.specialization_skill_proficiency ? [spec.specialization_skill_proficiency.toLowerCase()] : []),
  ])

  const handleCreate = async () => {
    setSaving(true); setError('')
    try {
      const baseStats   = Object.fromEntries(STAT_FIELDS.map(f => [f.key, stats[f.key] || 0]))
      const bonusStats  = Object.fromEntries(STAT_FIELDS.map(f => [f.key, bonus[f.key] || 0]))
      const hitPoints   = 6 + hpBonus
      const pokedollars = pokedollarsRoll === '' ? 0 : 1000 + 100 * Number(pokedollarsRoll)
      const equipo = [
        { id_item: 1,  cantidad: 5 },
        { id_item: 25, cantidad: 1 },
        ...(equipoChoice ? [{ id_item: equipoChoice, cantidad: 1 }] : []),
        { id_item: 322, cantidad: 1 },
        { id_item: 323, cantidad: 1 },
      ]

      const res = await apiFetch('/personaje', {
        method: 'POST',
        body: JSON.stringify({
          id_partida: idPartida,
          nombre_personaje: nombre.trim(),
          personaje_origin: origin?.origin_id ?? null,
          personaje_background: background?.background_id ?? null,
          id_armor: armorSelected?.armor_type_id ?? null,
          personaje_ac: armorAC,
          id_weapon: weaponSelected?.weapon_type_id ?? null,
          stats_base: baseStats,
          stats_bonus: bonusStats,
          personaje_level: 1,
          personaje_hit_dice: '1d6',
          personaje_hp: hitPoints,
          saving_throw_prof: 'CHA',
          prof_skills: profSkills,
          specialization_id: spec?.specialization_id ?? null,
          pokedollars,
          equipo,
          ideales: narrativa.ideales,
          falencias: narrativa.falencias,
          conexiones: narrativa.conexiones,
          detalles,
          // El backend lo persiste como un feat agregado al personaje
          skilled_choices: needsSkilled ? skilledChoices : null,
          // El terreno del rasgo de cuna: el backend lo valida y lo persiste
          terrain_choice: needsTerrain ? terrainChoice : null,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 animate-velo">
      <div className="animate-hoja bg-fondo text-texto rounded-t-hoja sm:rounded-hoja w-full max-w-2xl h-[94dvh] sm:h-[85vh] flex flex-col shadow-hoja overflow-hidden">

        {/* Header + progreso */}
        <div className="px-5 py-4 border-b border-separador shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-bold text-texto shrink-0">Crear personaje</h2>
                <div className="flex items-center gap-1 flex-wrap">
                  {STAT_FIELDS.map(f => {
                    const hasBonus = (bonus[f.key] || 0) > 0
                    return (
                      <span key={f.key}
                        className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${hasBonus ? 'bg-ok/15 text-ok' : 'bg-relleno text-texto-2'}`}>
                        {f.label} <span className={hasBonus ? 'text-ok' : 'text-texto'}>{displayStats[f.key]}</span>
                        <span className={`text-[9px] ml-0.5 rounded px-0.5 ${
                          displayModifiers[f.key] < 0 ? 'bg-peligro text-white' : 'text-texto-2'}`}>
                          {fmtMod(displayModifiers[f.key])}
                        </span>
                      </span>
                    )
                  })}
                </div>
              </div>
              {/* Bonos de healing / HP */}
              {healingBonuses.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  {healingBonuses.map((b, i) => (
                    <span key={i} className="text-[10px] font-bold text-ok bg-ok/15 rounded px-1.5 py-0.5">
                      {(b.llave || '').toUpperCase()} +{b.valor}
                    </span>
                  ))}
                </div>
              )}

              {/* Skill proficiencies (origen + background) */}
              {profSkills.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  <span className="text-[10px] font-bold text-white bg-ok rounded px-1.5 py-0.5">prof in</span>
                  {profSkills.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold text-ok bg-ok/15 rounded px-1.5 py-0.5">{cap(s)}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2 shrink-0"><X size={16} strokeWidth={2.4} /></button>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${i <= step ? 'bg-acento' : 'bg-relleno-2'}`} />
                <p className={`hidden sm:block text-[10px] mt-1 font-medium truncate ${i === step ? 'text-tinte' : 'text-texto-2'}`}>
                  {i + 1}. {label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-texto-2 mt-1.5">Paso {step + 1} de {STEPS.length}<span className="sm:hidden"> · <span className="font-semibold text-tinte">{STEPS[step]}</span></span></p>
        </div>

        {/* Contenido del paso */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {step === 0 && <NameStep nombre={nombre} setNombre={setNombre} />}
          {step === 1 && <OriginStep selected={origin} selectedSkills={originSkills} onSelect={handleSelectOrigin} />}
          {step === 2 && <BackgroundStep selected={background} selectedSkills={bgSkills} onSelect={handleSelectBackground} />}
          {step === 3 && <StatsStep mode={statsMode} setMode={setStatsMode} stats={stats} setStats={setStats} modifiers={modifiers} />}
          {step === 4 && (
            <IniciativesStep
              hpBonus={hpBonus}
              conMod={Math.floor(((displayStats.personaje_con ?? 0) - 10) / 2)}
              skills={skillsList}
              iniSkills={iniSkills}
              setIniSkills={setIniSkills}
              previas={profPrevias}
              onMount={() => setAnimalHandling(true)}
            />
          )}
          {step === 5 && <SpecStep specs={specList} loading={specLoading} valor={spec?.specialization_id ?? ''} onPick={setSpec} />}
          {step === 6 && (
            <EquipoStep
              choice={equipoChoice}
              setChoice={setEquipoChoice}
              roll={pokedollarsRoll}
              setRoll={setPokedollarsRoll}
            />
          )}
          {step === 7 && <DetallesStep detalles={detalles} setDetalles={setDetalles} narrativa={narrativa} setNarrativa={setNarrativa} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-separador shrink-0 flex items-center justify-between">
          <button
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="flex items-center gap-0.5 text-[15px] text-tinte hover:opacity-75 -ml-2 px-2 h-10 transition-opacity"
          >
            <ChevronLeft size={15} /> {step === 0 ? 'Cancelar' : 'Atrás'}
          </button>

          {error && <span className="text-xs text-peligro">{error}</span>}

          {isLast ? (
            <button
              onClick={() => setShowVerify(true)}
              disabled={!canNext}
              className="flex items-center gap-2 bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed
                         text-white text-[15px] font-semibold px-5 h-10 rounded-full transition-colors"
            >
              Crear personaje
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canNext}
              className="bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed
                         text-white text-[15px] font-semibold px-5 h-10 rounded-full transition-colors"
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

      {/* Skilled otorgado por el origen o el background: sus 3 elecciones.
          Aquí solo se guardan; el feat se persiste al crear el personaje, así
          que a diferencia del lápiz esto todavía se puede deshacer. */}
      {skilledPopup && (
        <SkilledModal
          allSkills={skillsList}
          proficientNames={profSkillNames}
          confirmLabel="Guardar"
          warn={false}
          initial={skilledChoices}
          onCancel={() => setSkilledPopup(false)}
          onConfirm={(payload) => { setSkilledChoices(payload); setSkilledPopup(false) }}
        />
      )}

      {/* Selección de armadura (al avanzar desde Background) */}
      {showArmorPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 animate-velo">
          <div className="bg-fondo text-texto rounded-hoja w-full max-w-md max-h-[85vh] flex flex-col shadow-hoja overflow-hidden">
            <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-texto">Equipar armadura</h3>
                <p className="text-[11px] text-texto-2">Elige una (según tu background)</p>
              </div>
              <button onClick={() => setShowArmorPicker(false)} className="text-texto-2 hover:text-texto"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {armorOptions(background).map(a => (
                <button key={a.armor_type_id} onClick={() => handleSelectArmor(a)}
                  className="w-full text-left border border-separador rounded-xl px-4 py-2.5 hover:border-tinte/40 hover:bg-tinte/10 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-texto text-sm">{a.armor_type_name}</span>
                    <span className="text-[10px] font-bold text-texto-2 uppercase">{a.armor_type_category}</span>
                  </div>
                  <p className="text-[11px] text-texto-2 mt-0.5">
                    AC base {a.armor_type_base_ac}
                    {a.armor_type_uses_dex_modifier === 1 && ' + DEX'}
                    {a.armor_type_max_dex_modifier != null && ` (máx +${a.armor_type_max_dex_modifier})`}
                    {a.armor_type_ac_bonus != null && ` + ${a.armor_type_ac_bonus}`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selección de arma (después de la armadura) */}
      {showWeaponPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 animate-velo">
          <div className="bg-fondo text-texto rounded-hoja w-full max-w-md max-h-[85vh] flex flex-col shadow-hoja overflow-hidden">
            <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-texto">Equipar arma</h3>
                <p className="text-[11px] text-texto-2">Elige una</p>
              </div>
              <button onClick={() => setShowWeaponPicker(false)} className="text-texto-2 hover:text-texto"><X size={18} /></button>
            </div>
            <div className="px-4 pt-3 pb-2 shrink-0">
              <input value={weaponSearch} onChange={e => setWeaponSearch(e.target.value)} placeholder="Buscar arma..."
                className="w-full px-3 py-1.5 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50" />
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {weaponList
                .filter(w => !weaponSearch || w.weapon_type_name?.toLowerCase().includes(weaponSearch.toLowerCase()))
                .map(w => (
                  <button key={w.weapon_type_id} onClick={() => handleSelectWeapon(w)}
                    className="w-full text-left border border-separador rounded-xl px-4 py-2.5 hover:border-tinte/40 hover:bg-tinte/10 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-texto text-sm">{w.weapon_type_name}</span>
                      <span className="text-[10px] font-bold text-texto-2 uppercase">{w.weapon_type_dnd_category}</span>
                    </div>
                    <p className="text-[11px] text-texto-2 mt-0.5">
                      {w.weapon_type_damage_dice} {w.weapon_type_damage_type}
                      {w.weapon_type_range && ` · ${w.weapon_type_range}`}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Ventana de verificación antes de crear */}
      {showVerify && (() => {
        // 6 + healing horneado es solo la BASE que se persiste. El total con el
        // que nace el personaje le suma el modificador de CON, igual que la hoja.
        const hitPointsBase = 6 + hpBonus
        const hitPoints     = hitPointsBase + Math.floor(((displayStats.personaje_con ?? 0) - 10) / 2)
        const pokedollars = pokedollarsRoll === '' ? 0 : 1000 + 100 * Number(pokedollarsRoll)
        const VRow = ({ label, value }) => (
          <div className="flex justify-between gap-3 py-1 border-b border-separador">
            <span className="text-xs font-semibold text-tinte uppercase tracking-wide shrink-0">{label}</span>
            <span className="text-sm text-texto text-right">{value || '—'}</span>
          </div>
        )
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 animate-velo">
            <div className="bg-fondo text-texto rounded-hoja w-full max-w-lg max-h-[90vh] flex flex-col shadow-hoja overflow-hidden">
              <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
                <h3 className="font-bold text-texto">Verifica tu personaje</h3>
                <button onClick={() => setShowVerify(false)} className="text-texto-2 hover:text-texto"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* General */}
                <div>
                  <VRow label="Nombre"      value={nombre} />
                  <VRow label="Especialidad" value={spec?.specialization_name} />
                  <VRow label="Origen"      value={origin?.origin_name} />
                  <VRow label="Background"  value={background?.background_name} />
                  {background?.background_tool_proficiencies_values && (
                    <VRow label="Herramientas" value={background.background_tool_proficiencies_values} />
                  )}
                  {needsTerrain && (
                    <div className="flex justify-between items-start gap-3 py-1 border-b border-separador">
                      <span className="text-xs font-semibold text-tinte uppercase tracking-wide shrink-0">Terreno</span>
                      <select value={terrainChoice} onChange={e => setTerrainChoice(e.target.value)}
                        className={`text-sm text-right bg-transparent focus:outline-none ${
                          terrainChoice ? 'text-texto' : 'text-peligro font-semibold'}`}>
                        <option value="">Falta elegirlo</option>
                        {terrainOpts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  )}
                  {needsSkilled && (
                    <div className="flex justify-between items-start gap-3 py-1 border-b border-separador">
                      <span className="text-xs font-semibold text-tinte uppercase tracking-wide shrink-0">Skilled</span>
                      <div className="text-right">
                        <span className={`text-sm ${skilledChoices ? 'text-texto' : 'text-tinte font-semibold'}`}>
                          {skilledChoices
                            ? [...skilledChoices.skills, ...skilledChoices.texts].join(', ')
                            : 'Faltan las 3 elecciones'}
                        </span>
                        <button onClick={() => setSkilledPopup(true)}
                          className="block ml-auto text-[11px] font-bold text-tinte hover:text-tinte underline">
                          {skilledChoices ? 'Cambiar' : 'Elegir'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Atributos */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-texto-2 mb-1.5">Atributos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {STAT_FIELDS.map(f => (
                      <div key={f.key} className="bg-superficie border border-separador rounded-lg px-2 py-1.5 text-center">
                        <p className="text-[10px] font-bold text-texto-2">{f.label}</p>
                        <p className="text-base font-bold text-texto leading-tight">{displayStats[f.key]}</p>
                        <p className={`text-[10px] font-bold ${displayModifiers[f.key] < 0 ? 'text-tinte' : 'text-ok'}`}>
                          {fmtMod(displayModifiers[f.key])}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Habilidades */}
                {skillsList.length > 0 && (() => {
                  // Incluye las elegidas en Skilled: no se persisten en
                  // personaje_skill, pero sí dan proficiencia (vía el feat).
                  const profSet = profSkillsVisibles
                  const skillVal = (sk) => {
                    const key = `personaje_${(sk.skill_related_ability || '').toLowerCase()}`
                    if (!(key in displayModifiers)) return null
                    let v = displayModifiers[key]
                    if (profSet.has((sk.skill_name || '').toLowerCase())) v += PROF_INICIAL
                    // La especialidad da expertise: el bono de proficiencia cuenta doble
                    if ((spec?.specialization_skill_proficiency || '').toLowerCase() === (sk.skill_name || '').toLowerCase()) v += PROF_INICIAL
                    return v
                  }
                  const half = Math.ceil(skillsList.length / 2)
                  const cols = [skillsList.slice(0, half), skillsList.slice(half)]
                  return (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-texto-2 mb-1.5">Habilidades</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                        {cols.map((col, ci) => (
                          <div key={ci}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-3.5 text-center text-[9px] font-bold text-texto-2">E</span>
                              <span className="w-3.5 text-center text-[9px] font-bold text-texto-2">P</span>
                            </div>
                            <div className="space-y-1.5">
                              {col.map((sk, i) => {
                                const v = skillVal(sk)
                                const pref = profSet.has((sk.skill_name || '').toLowerCase())
                                const expert = (spec?.specialization_skill_proficiency || '').toLowerCase() === (sk.skill_name || '').toLowerCase()
                                return (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <ReadCheck checked={expert} />
                                    <ReadCheck checked={pref} />
                                    <span className={`w-7 text-center text-[11px] font-bold border-b border-texto-2/50 leading-tight ${
                                      v != null && v < 0 ? 'text-tinte' : 'text-texto'}`}>
                                      {v == null ? '' : fmtMod(v)}
                                    </span>
                                    <span className="text-[11px] leading-tight truncate">
                                      <span className="font-semibold text-texto">{sk.skill_name}</span>
                                      <span className="text-texto-2"> ({sk.skill_related_ability})</span>
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

                {/* Iniciales */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-texto-2 mb-1.5">Iniciales</p>
                  <VRow label="Nivel"        value="1" />
                  <VRow label="Hit Dice"     value="1d6 por nivel" />
                  <VRow label="Hit Points"   value={hitPoints} />
                  <VRow label="Velocidad"    value="30 ft" />
                  <VRow label="Iniciativa"   value={fmtMod(displayModifiers.personaje_dex ?? 0)} />
                  <VRow label="Saving Throw" value="CHA (Charisma)" />
                  <VRow label="Armadura"     value={armorSelected?.armor_type_name} />
                  <VRow label="AC"           value={armorAC} />
                  <VRow label="Arma"         value={weaponSelected?.weapon_type_name} />
                </div>

                {/* Equipo */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-texto-2 mb-1.5">Equipo</p>
                  <VRow label="Poké Ball"          value="x5" />
                  <VRow label="Potion"             value="x1" />
                  <VRow label="Paquete"            value={equipoChoice ? PACK_NAMES[equipoChoice] : '—'} />
                  <VRow label="Trainer's License"  value="x1" />
                  <VRow label="Pokédex"            value="x1" />
                  <VRow label="Pokédollars"        value={`${pokedollars.toLocaleString()} ₽`} />
                </div>

                {/* Narrativa + detalles */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-texto-2 mb-1.5">Detalles</p>
                  {narrativa.ideales    && <VRow label="Ideales"    value={narrativa.ideales} />}
                  {narrativa.falencias  && <VRow label="Falencias"  value={narrativa.falencias} />}
                  {narrativa.conexiones && <VRow label="Conexiones" value={narrativa.conexiones} />}
                  {detalles.map((d, i) => <VRow key={i} label={d.tipo} value={d.texto} />)}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-separador shrink-0 flex items-center justify-between gap-3">
                <button onClick={() => setShowVerify(false)} className="text-sm text-texto-2 hover:text-texto px-3 py-2 rounded-lg">
                  Volver
                </button>
                {error && <span className="text-xs text-peligro flex-1 text-center">{error}</span>}
                <button
                  onClick={handleCreate}
                  disabled={saving || !skilledListo || !terrainListo}
                  title={!skilledListo ? 'Faltan las elecciones de Skilled' : !terrainListo ? 'Falta elegir el terreno del rasgo' : undefined}
                  className="flex items-center gap-2 bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed
                             text-white text-[15px] font-semibold px-5 h-10 rounded-full transition-colors"
                >
                  {saving && <PokeballSpinner size={15} />} Confirmar y crear
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

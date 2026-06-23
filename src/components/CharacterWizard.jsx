import { useState, useEffect } from 'react'
import { X, Check, ChevronLeft, ChevronDown, Plus, Minus, Loader2 } from 'lucide-react'
import { apiFetch } from '../api'

const STEPS = ['Nombre', 'Stats', 'Origen', 'Background']

const STAT_FIELDS = [
  { key: 'personaje_dex', label: 'DEX' },
  { key: 'personaje_str', label: 'STR' },
  { key: 'personaje_con', label: 'CON' },
  { key: 'personaje_int', label: 'INT' },
  { key: 'personaje_wis', label: 'WIS' },
  { key: 'personaje_cha', label: 'CHA' },
]
const EMPTY_STATS = { personaje_dex: 0, personaje_str: 0, personaje_con: 0, personaje_int: 0, personaje_wis: 0, personaje_cha: 0 }
const MAX_POINTS = 20
const BG_POINTS  = 3

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

/* ── Paso 1: selección de origen (acordeón) ── */
function OriginStep({ selected, onSelect }) {
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
            <div className={`flex items-center justify-between gap-3 px-4 py-3 ${isSel ? 'bg-red-50/40' : 'bg-white'}`}>
              <button
                onClick={() => setOpenId(isOpen ? null : o.origin_id)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left"
              >
                <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <h3 className="text-base font-bold text-gray-900 truncate">{o.origin_name}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
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
                </div>
              </button>
              <button
                onClick={() => onSelect(o)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isSel ? 'bg-red-600 text-white' : 'bg-gray-900 text-white hover:bg-red-600'}`}
              >
                {isSel ? <><Check size={13} /> Seleccionado</> : 'Seleccionar'}
              </button>
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

/* ── Paso 2: asignación de stats ── */
function StatsStep({ stats, setStats }) {
  const total     = STAT_FIELDS.reduce((a, f) => a + stats[f.key], 0)
  const remaining = MAX_POINTS - total
  const inc = (k) => { if (remaining > 0) setStats(s => ({ ...s, [k]: s[k] + 1 })) }
  const dec = (k) => setStats(s => ({ ...s, [k]: Math.max(0, s[k] - 1) }))

  return (
    <div className="max-w-md mx-auto py-2">
      <div className="text-center mb-5">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Puntos disponibles</p>
        <p className={`text-4xl font-black ${remaining === 0 ? 'text-gray-400' : 'text-red-600'}`}>{remaining}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">de {MAX_POINTS} en total</p>
      </div>

      <div className="space-y-2">
        {STAT_FIELDS.map(f => (
          <div key={f.key} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
            <span className="font-bold text-gray-800 w-12">{f.label}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => dec(f.key)}
                disabled={stats[f.key] === 0}
                className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100
                           disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Minus size={15} />
              </button>
              <span className="w-8 text-center font-bold text-lg text-gray-900 tabular-nums">{stats[f.key]}</span>
              <button
                onClick={() => inc(f.key)}
                disabled={remaining === 0}
                className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100
                           disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Popup: distribución de bonos de skills del background ── */
function BackgroundSkillsPopup({ background, onCancel, onAccept }) {
  const abilities = [
    background.background_ability_scores_value_1,
    background.background_ability_scores_value_2,
    background.background_ability_scores_value_3,
  ].filter(Boolean)

  const [points, setPoints] = useState(abilities.map(() => 0))
  const total     = points.reduce((a, b) => a + b, 0)
  const remaining = BG_POINTS - total
  const canAccept = total === BG_POINTS

  const inc = (i) => { if (remaining > 0 && points[i] < 2) setPoints(p => p.map((v, j) => j === i ? v + 1 : v)) }
  const dec = (i) => setPoints(p => p.map((v, j) => (j === i && v > 0) ? v - 1 : v))

  const handleAccept = () => {
    const dist = {}
    abilities.forEach((ab, i) => {
      const k = `personaje_${(ab || '').toLowerCase()}`
      if (k in EMPTY_STATS) dist[k] = (dist[k] || 0) + points[i]
    })
    onAccept(dist)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Bono de skills</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="px-5 py-4">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Puntos disponibles</p>
            <p className={`text-4xl font-black ${remaining === 0 ? 'text-gray-400' : 'text-red-600'}`}>{remaining}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">máx. 2 por habilidad</p>
          </div>

          <div className="space-y-2">
            {abilities.map((ab, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                <span className="font-bold text-gray-800 uppercase">{ab}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => dec(i)} disabled={points[i] === 0}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100
                               disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg text-gray-900 tabular-nums">{points[i]}</span>
                  <button onClick={() => inc(i)} disabled={remaining === 0 || points[i] >= 2}
                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100
                               disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
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

/* ── Paso 3: selección de background (acordeón) ── */
function BackgroundStep({ selected, onSelect }) {
  const [backgrounds, setBackgrounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId,  setOpenId]  = useState(null)

  useEffect(() => {
    apiFetch('/backgrounds?limit=200')
      .then(r => r.json())
      .then(d => setBackgrounds(Array.isArray(d.data) ? d.data : []))
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
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-white">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{b.background_description}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CharacterWizard({ idPartida, onClose, onCreated }) {
  const [step,       setStep]       = useState(0)
  const [origin,     setOrigin]     = useState(null)
  const [nombre,     setNombre]     = useState('')
  const [stats,      setStats]      = useState(EMPTY_STATS)
  const [background, setBackground] = useState(null)
  const [bgStats,    setBgStats]    = useState({}) // bonos de ability del background
  const [bgPopup,    setBgPopup]    = useState(null) // background con popup abierto
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const canNext =
    step === 0 ? nombre.trim().length > 0 :
    step === 1 ? true :
    step === 2 ? !!origin :
    !!background
  const isLast  = step === STEPS.length - 1

  const handleSelectOrigin = (o) => setOrigin(o)

  // Background: el botón Seleccionar abre el popup de distribución de puntos
  const handleSelectBackground = (b) => setBgPopup(b)
  const handleAcceptBg = (dist) => {
    setBackground(bgPopup)
    setBgStats(dist)
    setBgPopup(null)
  }

  // Bono combinado: origen (value_1 → +2, value_2 → +1) + background (popup)
  const bonus = {}
  if (origin) {
    for (const [val, amount] of [
      [origin.origin_ability_scores_value_1, 2],
      [origin.origin_ability_scores_value_2, 1],
    ]) {
      const k = `personaje_${(val || '').toLowerCase()}`
      if (k in EMPTY_STATS) bonus[k] = (bonus[k] || 0) + amount
    }
  }
  for (const k of Object.keys(bgStats)) {
    if (k in EMPTY_STATS) bonus[k] = (bonus[k] || 0) + bgStats[k]
  }
  const displayStats = Object.fromEntries(
    Object.keys(EMPTY_STATS).map(k => [k, stats[k] + (bonus[k] || 0)])
  )

  const bgSkills = background
    ? [background.background_skill_proficiencies_value_1, background.background_skill_proficiencies_value_2].filter(Boolean)
    : []

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
              {/* Skill proficiencies del background */}
              {bgSkills.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  <span className="text-[10px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">prof in</span>
                  {bgSkills.map((s, i) => (
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
          {step === 1 && <StatsStep stats={stats} setStats={setStats} />}
          {step === 2 && <OriginStep selected={origin} onSelect={handleSelectOrigin} />}
          {step === 3 && <BackgroundStep selected={background} onSelect={handleSelectBackground} />}
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

      {/* Popup de bono de skills del background */}
      {bgPopup && (
        <BackgroundSkillsPopup
          background={bgPopup}
          onCancel={() => setBgPopup(null)}
          onAccept={handleAcceptBg}
        />
      )}
    </div>
  )
}

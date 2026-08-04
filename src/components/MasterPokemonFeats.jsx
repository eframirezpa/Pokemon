import { useState, useEffect } from 'react'
import { X, Search, Plus, Trash2 } from 'lucide-react'
import { apiFetch } from '../api'
import { featPrereqStatus } from '../lib/featPrereq'
import { ResolvedBonusBadges } from './featBonoBadges'
import FeatInfoModal from './FeatInfoModal'

const STAT_KEYS = ['dex', 'str', 'con', 'int', 'wis', 'cha']
const statLabel = k => k.toUpperCase()
const lower = s => (s ?? '').toLowerCase()

// Analizadores (mismo criterio que la herramienta lápiz), acotados a los feats Pokemon
function analyzeStat(b) {
  if (lower(b.type) !== 'stat') return null
  const llave = lower(b.llave).trim()
  const value = parseInt(b.valor, 10) || 0
  if (/\s+or\s+/i.test(llave)) {
    const options = llave.split(/\s+or\s+/i).map(s => s.trim()).filter(s => STAT_KEYS.includes(s))
    return { mode: 'choose', options, value }
  }
  if (STAT_KEYS.includes(llave)) return { mode: 'fixed', llave, value }
  return null
}
function analyzeSkill(b) {
  if (lower(b.type) !== 'skill') return null
  const kind = lower(b.valor)
  if (kind !== 'prof' && kind !== 'expert') return null
  if (lower(b.llave).trim() === 'any') {
    // Regla 3.1: excluir los skills listados en feats_bonus_limit (separados por 'and')
    const excluded = new Set((b.limit || '').split(/\s+and\s+/i).map(s => s.trim().toLowerCase()).filter(Boolean))
    return { mode: 'choose', kind, excluded }
  }
  return { mode: 'fixed', kind, llave: b.llave }
}
const perLvlNum = (v) => { const m = /(\d+)\s*per\s*l/i.exec(v || ''); return m ? Number(m[1]) : null }

// Regla 3.2: healing 'N per lvl' → N × nivel (solo para mostrar; se persiste crudo)
const displayBonos = (bonos, level) => (bonos || []).map(b => {
  if (lower(b.type) === 'healing') { const n = perLvlNum(b.value); if (n != null) return { ...b, value: String(n * level) } }
  return b
})

// Bonos "reales" del feat (los que se persisten); ignora los portadores de prerequisito
const bonusList = (feat) => (feat.feat_bonuses || []).filter(b => (b.type || '').trim())

// Botones para elegir un atributo (igual que StatSingleSelect del lápiz)
function StatSingleSelect({ options, selected, onPick }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map(k => {
        const sel = selected === k
        return (
          <button key={k} onClick={() => onPick(k)}
            className={`text-xs font-bold px-2 py-1.5 rounded-lg border transition-colors ${
              sel ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-400' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            {statLabel(k)}
          </button>
        )
      })}
    </div>
  )
}
// Lista de skills para elegir (igual que SkillPickMany del lápiz)
function SkillPickMany({ skills, proficientNames, kind, count, chosen, onToggle }) {
  const full = chosen.length >= count
  return (
    <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
      {skills.map(s => {
        const owned = proficientNames.has(lower(s.skill_name))
        const sel   = chosen.includes(s.skill_name)
        let cls
        if (sel) cls = (kind === 'expert' && owned) ? 'bg-blue-700 text-white border-blue-700' : 'bg-green-600 text-white border-green-600'
        else if (owned) cls = 'bg-green-50 border-green-300 text-green-700'
        else cls = 'border-gray-200 text-gray-700 hover:bg-gray-50'
        return (
          <button key={s.skill_id} onClick={() => onToggle(s.skill_name)} disabled={!sel && full}
            className={`text-left text-xs px-2 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${cls}`}>
            <span className="font-semibold">{s.skill_name}</span>
            <span className={sel ? 'text-white/70' : 'text-gray-400'}> ({s.skill_related_ability})</span>
          </button>
        )
      })}
    </div>
  )
}

/* Modal de confirmación: elecciones (stat 'x or y', skill 'any') con los controles del lápiz */
function ConfirmFeat({ feat, skillsList, proficientNames, level, onCancel, onConfirm }) {
  const bonos = bonusList(feat)
  // Estado de elección por índice: string (stat) o array de nombres (skill)
  const [choices, setChoices] = useState(() => {
    const init = {}
    bonos.forEach((b, i) => {
      const st = analyzeStat(b); const sk = analyzeSkill(b)
      if (st?.mode === 'choose') init[i] = st.options[0] || ''
      else if (sk?.mode === 'choose') init[i] = []
    })
    return init
  })

  const needsChoice = bonos.some((b) => analyzeStat(b)?.mode === 'choose' || analyzeSkill(b)?.mode === 'choose')
  const complete = bonos.every((b, i) => {
    const st = analyzeStat(b); const sk = analyzeSkill(b)
    if (st?.mode === 'choose') return !!choices[i]
    if (sk?.mode === 'choose') return (choices[i] || []).length === 1
    return true
  })

  const resolve = () => {
    const out = []
    bonos.forEach((b, i) => {
      const st = analyzeStat(b); const sk = analyzeSkill(b)
      if (st) {
        out.push({ type: 'stat', llave: st.mode === 'fixed' ? st.llave : choices[i], value: String(st.value) })
      } else if (sk) {
        const llave = sk.mode === 'fixed' ? sk.llave : (choices[i] || [])[0]
        out.push({ type: 'skill', llave, value: sk.kind })
      } else {
        out.push({ type: b.type, llave: b.llave, value: b.valor })
      }
    })
    onConfirm(out)
  }

  // Bonos para el badge (con elecciones aplicadas)
  const badgeBonos = displayBonos(bonos.map((b, i) => {
    const st = analyzeStat(b); const sk = analyzeSkill(b)
    if (st) return { type: 'stat', llave: st.mode === 'fixed' ? st.llave : (choices[i] || '?'), value: String(st.value) }
    if (sk) return { type: 'skill', llave: sk.mode === 'fixed' ? sk.llave : ((choices[i] || [])[0] || '?'), value: sk.kind }
    return { type: b.type, llave: b.llave, value: b.valor }
  }), level)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900 truncate">{feat.feat_name}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {bonos.map((b, i) => {
            const st = analyzeStat(b); const sk = analyzeSkill(b)
            if (st?.mode === 'choose') return (
              <div key={i}>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Elige atributo (+{st.value})</label>
                <StatSingleSelect options={st.options} selected={choices[i]} onPick={(k) => setChoices(c => ({ ...c, [i]: k }))} />
              </div>
            )
            if (sk?.mode === 'choose') {
              const opts = skillsList.filter(s => !sk.excluded.has(lower(s.skill_name)))
              return (
                <div key={i}>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Elige 1 habilidad ({sk.kind})</label>
                  <SkillPickMany skills={opts} proficientNames={proficientNames} kind={sk.kind} count={1}
                    chosen={choices[i] || []}
                    onToggle={(name) => setChoices(c => {
                      const cur = c[i] || []
                      return { ...c, [i]: cur.includes(name) ? cur.filter(x => x !== name) : (cur.length < 1 ? [...cur, name] : cur) }
                    })} />
                </div>
              )
            }
            return null
          })}
          {!needsChoice && <p className="text-sm text-gray-600">¿Agregar este rasgo al Pokémon?</p>}
          <div className="flex flex-wrap gap-1"><ResolvedBonusBadges bonos={badgeBonos} /></div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onCancel} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
          <button onClick={resolve} disabled={!complete}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
            <Plus size={15} /> Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Sección de feats (tipo Pokemon) del creador/editor de Pokémon del master */
export default function MasterPokemonFeats({ feats, setFeats, level, stats, skills, skillsList, maxFeats = Infinity, ownedFeatIds = [] }) {
  const [catalog, setCatalog] = useState([])
  const [search, setSearch]   = useState('')
  const [confirm, setConfirm] = useState(null)
  const [info, setInfo]       = useState(null)

  useEffect(() => {
    apiFetch('/feats?type=Pokemon&limit=100').then(r => r.json())
      .then(d => setCatalog(d.data ?? [])).catch(() => setCatalog([]))
  }, [])

  // Skills en los que el Pokémon ya es proficiente (para colorear el picker como el lápiz)
  const proficientNames = new Set()
  for (const s of (skills || [])) if (s.pref || s.expert) proficientNames.add(lower(s.skill_name))

  const prereqCtx = { level, statTotal: k => Number(stats?.[k]) || 0, armorProfs: new Set() }
  const featStatus = (f) => featPrereqStatus(
    (f.feat_bonuses || []).filter(b => b.prereq).map(b => ({ prereq: b.prereq, valor: b.prereqValor })), prereqCtx)

  // Ya tomados: los elegidos en esta ventana más los que el Pokémon tiene guardados
  const added = new Set([...feats.map(f => f.feat_id), ...ownedFeatIds])
  const available = catalog
    .filter(f => Number(f.feat_is_repeatable) === 1 || !added.has(f.feat_id))
    .filter(f => !search || f.feat_name?.toLowerCase().includes(search.toLowerCase()))

  const openAdd = (feat) => {
    const bonos = bonusList(feat)
    const needsChoice = bonos.some(b => analyzeStat(b)?.mode === 'choose' || analyzeSkill(b)?.mode === 'choose')
    if (needsChoice) { setConfirm(feat); return }
    addFeat(feat, bonos.map(b => {
      const st = analyzeStat(b); const sk = analyzeSkill(b)
      if (st) return { type: 'stat', llave: st.llave, value: String(st.value) }
      if (sk) return { type: 'skill', llave: sk.llave, value: sk.kind }
      return { type: b.type, llave: b.llave, value: b.valor }
    }))
  }
  const addFeat = (feat, bonos) => {
    setFeats(list => [...list, { key: `${feat.feat_id}-${Date.now()}`, feat_id: feat.feat_id, feat_name: feat.feat_name, feat_bonuses: feat.feat_bonuses, bonos }])
    setConfirm(null)
  }
  const removeFeat = (key) => setFeats(list => list.filter(f => f.key !== key))

  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Feats</label>

      {/* 1. Feats agregados (arriba) */}
      {feats.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {feats.map((f, i) => (
            <div key={f.key} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="text-sm font-semibold text-gray-800 truncate">
                  <span className="text-gray-400 font-normal mr-1.5">Rasgo {i + 1}:</span>{f.feat_name}
                </span>
                <ResolvedBonusBadges bonos={displayBonos(f.bonos, level)} />
              </div>
              <button onClick={() => removeFeat(f.key)} title="Quitar" className="shrink-0 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Panel para agregar (oculto al alcanzar el máximo de feats) */}
      {feats.length < maxFeats && (
      <><div className="relative mb-2">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar feat..."
          className="w-full pl-8 pr-7 py-1.5 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
        {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
      </div>
      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-48 overflow-y-auto">
        {available.length === 0 ? (
          <p className="text-xs text-gray-400 italic px-3 py-3">Sin feats disponibles.</p>
        ) : available.map(f => {
          const status = featStatus(f)
          return (
            <div key={f.feat_id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50">
              <button onClick={() => setInfo(f)} title="Ver detalle"
                className="text-left min-w-0 flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-gray-800 truncate underline decoration-dotted decoration-gray-300 underline-offset-2 hover:text-red-700">{f.feat_name}</span>
                <ResolvedBonusBadges bonos={displayBonos(previewBonos(f), level)} />
                {!status.met && <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1 shrink-0">{status.reason}</span>}
              </button>
              <button onClick={() => openAdd(f)} disabled={!status.met}
                title={status.met ? undefined : status.reason}
                className="shrink-0 flex items-center gap-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-md transition-colors">
                <Plus size={13} /> Agregar
              </button>
            </div>
          )
        })}
      </div></>
      )}

      {confirm && (
        <ConfirmFeat feat={confirm} skillsList={skillsList} proficientNames={proficientNames} level={level}
          onCancel={() => setConfirm(null)} onConfirm={(bonos) => addFeat(confirm, bonos)} />
      )}
      {info && <FeatInfoModal feat={info} theme="light" onClose={() => setInfo(null)} />}
    </div>
  )
}

// Bonos "preview" para el badge del listado (elección sin resolver → muestra opciones)
function previewBonos(feat) {
  return bonusList(feat).map(b => {
    const st = analyzeStat(b); const sk = analyzeSkill(b)
    if (st) return { type: 'stat', llave: st.mode === 'fixed' ? st.llave : b.llave, value: String(st.value) }
    if (sk) return { type: 'skill', llave: sk.mode === 'fixed' ? sk.llave : 'any', value: sk.kind }
    return { type: b.type, llave: b.llave, value: b.valor }
  })
}

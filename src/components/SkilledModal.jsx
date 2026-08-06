// Selector del feat Skilled (id 10): exactamente 3 entre proficiencias de skill
// y textos de 'Tool Prof'.
//
// Skilled no tiene filas en feats_bonus -- su forma es enteramente esta regla --
// así que el mismo selector se usa en los dos caminos por los que puede llegar:
// el lápiz (EditarPersonajeModal) y la creación, cuando lo otorga el origen o el
// background. El payload que devuelve onConfirm es el que espera addFeat en
// `choices.skilled`.
import { useState } from 'react'
import { X, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react'

const lower = s => (s ?? '').toLowerCase()

/* Grilla de skills para elegir varias. proficientNames: Set de nombres en minúscula */
export function SkillPickMany({ skills, proficientNames, kind, count, chosen, onToggle, disabled }) {
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
          <button key={s.skill_id} onClick={() => onToggle(s.skill_name)} disabled={disabled || (!sel && full)}
            className={`text-left text-xs px-2 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${cls}`}>
            <span className="font-semibold">{s.skill_name}</span>
            <span className={sel ? 'text-white/70' : 'text-gray-400'}> ({s.skill_related_ability})</span>
          </button>
        )
      })}
    </div>
  )
}

/* confirmLabel / warn se ajustan al contexto: en el lápiz el feat se agrega de
   inmediato y es irreversible; en la creación solo se guarda la elección y
   todavía se puede volver atrás. */
export default function SkilledModal({
  allSkills, proficientNames, busy, error, onCancel, onConfirm,
  confirmLabel = 'Agregar', warn = true, initial = null,
}) {
  const TOTAL = 3
  const [skills, setSkills] = useState(initial?.skills || []) // skill names
  const [texts, setTexts]   = useState(initial?.texts  || []) // strings de Tool Prof
  const used = skills.length + texts.length

  const toggleSkill = (name) => setSkills(s => {
    if (s.includes(name)) return s.filter(x => x !== name)
    if (s.length + texts.length >= TOTAL) return s
    return [...s, name]
  })
  const addText = () => setTexts(t => (t.length + skills.length < TOTAL ? [...t, ''] : t))
  const setText = (i, v) => setTexts(t => t.map((x, k) => (k === i ? v : x)))
  const removeText = (i) => setTexts(t => t.filter((_, k) => k !== i))
  const canConfirm = used === TOTAL && texts.every(t => t.trim() !== '') && !busy

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900 truncate">Skilled</h3>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-gray-500">{used}/{TOTAL}</span>
            <button onClick={onCancel} disabled={busy} className="text-gray-400 hover:text-gray-700 disabled:opacity-40"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-[11px] text-gray-500">Elige 3 en total entre proficiencias de habilidad y textos de Tool Prof.</p>

          {/* Skills (proficiencia) */}
          <div className="border border-gray-200 rounded-xl px-3 py-2.5">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
              Habilidades <span className="text-green-700 normal-case font-semibold">(proficiencia)</span>
            </p>
            <p className="text-[11px] text-gray-400 mb-2">Las que ya tienes aparecen en verde; puedes elegirlas igual.</p>
            <SkillPickMany skills={allSkills} proficientNames={proficientNames} kind="prof" count={TOTAL - texts.length}
              chosen={skills} onToggle={toggleSkill} disabled={busy} />
          </div>

          {/* Tool Prof (textos) */}
          <div className="border border-gray-200 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500">Tool Prof</p>
              <button onClick={addText} disabled={busy || used >= TOTAL}
                className="flex items-center gap-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md transition-colors">
                <Plus size={13} /> Texto
              </button>
            </div>
            {texts.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">Sin textos de Tool Prof.</p>
            ) : (
              <div className="space-y-1.5">
                {texts.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={t} onChange={e => setText(i, e.target.value)} placeholder="Escribe aquí..." disabled={busy}
                      className="flex-1 px-2.5 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                    <button onClick={() => removeText(i)} disabled={busy} className="text-gray-400 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {warn && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Esta acción <span className="font-bold">no se puede deshacer</span>.</p>
            </div>
          )}
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onCancel} disabled={busy} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
          <button onClick={() => onConfirm({ skills, texts: texts.map(t => t.trim()).filter(Boolean) })} disabled={!canConfirm}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

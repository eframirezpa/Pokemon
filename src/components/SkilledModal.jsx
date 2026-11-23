// Selector del feat Skilled (id 10): exactamente 3 entre proficiencias de skill
// y textos de 'Tool Prof'.
//
// Skilled no tiene filas en feats_bonus -- su forma es enteramente esta regla --
// así que el mismo selector se usa en los dos caminos por los que puede llegar:
// el lápiz (EditarPersonajeModal) y la creación, cuando lo otorga el origen o el
// background. El payload que devuelve onConfirm es el que espera addFeat en
// `choices.skilled`.
import { useState } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import PokeballSpinner from './PokeballSpinner'
import Hoja from './ui/Hoja'
import Boton from './ui/Boton'

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
        if (sel) cls = (kind === 'expert' && owned) ? 'bg-blue-700 text-white border-blue-700' : 'bg-ok text-white border-ok'
        else if (owned) cls = 'bg-ok/10 border-ok/40 text-ok'
        else cls = 'bg-superficie border-separador text-texto hover:bg-relleno'
        return (
          <button key={s.skill_id} onClick={() => onToggle(s.skill_name)} disabled={disabled || (!sel && full)}
            className={`text-left text-[13px] px-2.5 py-2 rounded-xl border transition-colors disabled:opacity-40 ${cls}`}>
            <span className="font-semibold">{s.skill_name}</span>
            <span className={sel ? 'text-white/75' : 'text-texto-2'}> ({s.skill_related_ability})</span>
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

  const titulo = <span className="flex items-baseline gap-2">Skilled <span className="text-[13px] font-semibold text-texto-2 tabular-nums">{used}/{TOTAL}</span></span>

  return (
    <Hoja titulo={titulo} onClose={busy ? null : onCancel} ancho="sm:max-w-md" alto="max-h-[88dvh]" z="z-[80]"
      pie={
        <div className="flex items-center justify-end gap-2">
          <Boton variante="plano" onClick={onCancel} disabled={busy}>Cancelar</Boton>
          <Boton onClick={() => onConfirm({ skills, texts: texts.map(t => t.trim()).filter(Boolean) })} disabled={!canConfirm}>
            {busy ? <PokeballSpinner size={15} /> : <Plus size={15} />} {confirmLabel}
          </Boton>
        </div>
      }>
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-texto-2 px-1">Elige 3 en total entre proficiencias de habilidad y textos de Tool Prof.</p>

        {/* Skills (proficiencia) */}
        <section>
          <h3 className="text-[13px] font-semibold text-texto-2 uppercase tracking-[.03em] px-4 pb-1">
            Habilidades <span className="text-ok normal-case tracking-normal">(proficiencia)</span>
          </h3>
          <p className="text-xs text-texto-2 px-4 pb-2">Las que ya tienes aparecen en verde; puedes elegirlas igual.</p>
          <SkillPickMany skills={allSkills} proficientNames={proficientNames} kind="prof" count={TOTAL - texts.length}
            chosen={skills} onToggle={toggleSkill} disabled={busy} />
        </section>

        {/* Tool Prof (textos) */}
        <section>
          <div className="flex items-center justify-between px-4 pb-1.5">
            <h3 className="text-[13px] font-semibold text-texto-2 uppercase tracking-[.03em]">Tool Prof</h3>
            <Boton variante="tintado" tamano="sm" onClick={addText} disabled={busy || used >= TOTAL}>
              <Plus size={14} /> Texto
            </Boton>
          </div>
          <div className="bg-superficie rounded-grupo overflow-hidden divide-y divide-separador">
            {texts.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-texto-2 italic">Sin textos de Tool Prof.</p>
            ) : texts.map((t, i) => (
              <div key={i} className="flex items-center gap-2 pl-4 pr-2 min-h-11">
                <input value={t} onChange={e => setText(i, e.target.value)} placeholder="Escribe aquí…" disabled={busy}
                  aria-label={`Tool Prof ${i + 1}`}
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] text-texto placeholder:text-texto-2" />
                <button type="button" onClick={() => removeText(i)} disabled={busy} aria-label="Quitar"
                  className="w-8 h-8 rounded-full grid place-items-center text-texto-2 hover:text-peligro hover:bg-relleno shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {warn && (
          <div className="flex items-start gap-2 bg-aviso/10 rounded-xl px-3.5 py-2.5">
            <AlertTriangle size={16} className="text-aviso shrink-0 mt-0.5" />
            <p className="text-[13px] text-aviso">Esta acción <span className="font-bold">no se puede deshacer</span>.</p>
          </div>
        )}
        {error && <p role="alert" className="text-[13px] text-peligro font-medium px-1">{error}</p>}
      </div>
    </Hoja>
  )
}

import { X } from 'lucide-react'
import { ResolvedBonusBadges } from './featBonoBadges'

/* Estilos por tema: 'light' (hoja del personaje) y 'dark' (panel del master) */
const THEMES = {
  light: {
    panel:        'bg-fondo text-texto',
    header:       'border-b border-separador',
    title:        'text-texto',
    close:        'w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2',
    chip:         'bg-tinte/15 text-tinte',
    sectionLabel: 'text-tinte',
    text:         'text-texto',
    good:         'text-ok',
  },
  dark: {
    panel:        'bg-superficie border border-separador',
    header:       'border-b border-separador',
    title:        'text-white',
    close:        'text-texto-2 hover:text-white',
    chip:         'bg-elevada text-texto',
    sectionLabel: 'text-tinte',
    text:         'text-texto',
    good:         'text-ok',
  },
}

const has = x => (x ?? '') !== '' && x !== null

/* Popup con el detalle de una especialidad (juego.specializations) */
export default function SpecializationInfoModal({ spec, bonos, onClose, theme = 'light' }) {
  if (!spec) return null
  const t = THEMES[theme] ?? THEMES.light

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 animate-velo"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-md max-h-[85dvh] flex flex-col shadow-hoja overflow-hidden ${t.panel}`}>
        <div className={`px-4 py-3 flex items-center justify-between shrink-0 ${t.header}`}>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`font-bold text-sm truncate ${t.title}`}>{spec.specialization_name}</h3>
            {has(spec.specialization_pokemon_type_name) && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${t.chip}`}>{spec.specialization_pokemon_type_name}</span>
            )}
          </div>
          <button onClick={onClose} className={`shrink-0 ml-2 ${t.close}`}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {has(spec.specialization_description) && (
            <div>
              <p className={`font-bold uppercase tracking-widest mb-1 ${t.sectionLabel}`}>Descripción</p>
              <p className={`leading-relaxed whitespace-pre-line ${t.text}`}>{spec.specialization_description}</p>
            </div>
          )}
          {(bonos || []).length > 0 && (
            <div>
              <p className={`font-bold uppercase tracking-widest mb-1 ${t.sectionLabel}`}>Bonos</p>
              <div className="flex flex-wrap gap-1">
                <ResolvedBonusBadges bonos={bonos} />
              </div>
            </div>
          )}
          {has(spec.specialization_ability_score_increase) && (
            <p className={t.text}>
              <span className={`font-bold ${t.sectionLabel}`}>Aumento de atributo: </span>
              {String(spec.specialization_ability_score_increase).toUpperCase()} +{spec.specialization_ability_score_increase_value ?? 1}
            </p>
          )}
          {has(spec.specialization_skill_proficiency) && (
            <p className={t.text}>
              <span className={`font-bold ${t.sectionLabel}`}>Proficiencia: </span>{spec.specialization_skill_proficiency}
            </p>
          )}
          {Number(spec.specialization_grants_expertise_if_proficient) === 1 && (
            <p className={`font-medium ${t.good}`}>✓ Otorga expertise si ya es proficiente</p>
          )}
          {has(spec.specialization_notes) && (
            <p className={t.text}><span className={`font-bold ${t.sectionLabel}`}>Notas: </span>{spec.specialization_notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}

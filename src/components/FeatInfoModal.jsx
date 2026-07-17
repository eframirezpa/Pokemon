import { X } from 'lucide-react'
import { ResolvedBonusBadges, ArmorProfBadges } from './featBonoBadges'

/* Estilos por tema: 'light' (hoja del personaje) y 'dark' (panel del master) */
const THEMES = {
  light: {
    panel:        'bg-white border border-gray-200',
    header:       'border-b border-gray-200',
    title:        'text-gray-900',
    close:        'text-gray-400 hover:text-gray-700',
    chip:         'bg-red-100 text-red-700',
    sectionLabel: 'text-red-700',
    text:         'text-gray-700',
    good:         'text-green-700',
  },
  dark: {
    panel:        'bg-gray-800 border border-gray-700',
    header:       'border-b border-gray-700',
    title:        'text-white',
    close:        'text-gray-400 hover:text-white',
    chip:         'bg-gray-700 text-gray-200',
    sectionLabel: 'text-amber-400/90',
    text:         'text-gray-200',
    good:         'text-green-400',
  },
}

const has = x => (x ?? '') !== ''

/* Popup con el detalle de un rasgo (feat) asociado a origen/background */
export default function FeatInfoModal({ feat, onClose, theme = 'light' }) {
  if (!feat) return null
  const t = THEMES[theme] ?? THEMES.light

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden ${t.panel}`}>
        <div className={`px-4 py-3 flex items-center justify-between shrink-0 ${t.header}`}>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`font-bold text-sm truncate ${t.title}`}>{feat.feat_name}</h3>
            {has(feat.feat_type) && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${t.chip}`}>{feat.feat_type}</span>
            )}
          </div>
          <button onClick={onClose} className={`shrink-0 ml-2 ${t.close}`}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {has(feat.feat_prerequisite) && (
            <p className={t.text}><span className={`font-bold ${t.sectionLabel}`}>Prerrequisito: </span>{feat.feat_prerequisite}</p>
          )}
          {has(feat.feat_benefits) && (
            <div>
              <p className={`font-bold uppercase tracking-widest mb-1 ${t.sectionLabel}`}>Beneficios</p>
              <p className={`leading-relaxed whitespace-pre-line ${t.text}`}>{feat.feat_benefits}</p>
            </div>
          )}
          {/* Bonos ya entrenados (personaje_feat_bonus + armaduras) — bajo los beneficios */}
          {((feat.bonos || []).length > 0 || (feat.armor_profs || []).length > 0) && (
            <div>
              <p className={`font-bold uppercase tracking-widest mb-1 ${t.sectionLabel}`}>Bonos</p>
              <div className="flex flex-wrap gap-1">
                <ResolvedBonusBadges bonos={feat.bonos} />
                <ArmorProfBadges profs={feat.armor_profs} />
              </div>
            </div>
          )}
          {has(feat.feat_ability_score_increase) && (
            <p className={t.text}><span className={`font-bold ${t.sectionLabel}`}>Aumento de atributo: </span>{feat.feat_ability_score_increase}</p>
          )}
          {Number(feat.feat_is_repeatable) === 1 && <p className={`font-medium ${t.good}`}>✓ Repetible</p>}
          {has(feat.feat_notes) && (
            <p className={t.text}><span className={`font-bold ${t.sectionLabel}`}>Notas: </span>{feat.feat_notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}

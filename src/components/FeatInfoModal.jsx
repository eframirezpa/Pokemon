import { X } from 'lucide-react'
import { ResolvedBonusBadges, ArmorProfBadges } from './featBonoBadges'

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

const has = x => (x ?? '') !== ''

/* Popup con el detalle de un rasgo (feat) asociado a origen/background */
export default function FeatInfoModal({ feat, onClose, theme = 'light' }) {
  if (!feat) return null
  const t = THEMES[theme] ?? THEMES.light

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 animate-velo"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-md max-h-[85dvh] flex flex-col shadow-hoja overflow-hidden ${t.panel}`}>
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

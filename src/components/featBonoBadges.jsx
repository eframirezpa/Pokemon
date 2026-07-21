// Badges de los bonos ya resueltos de un feat (personaje_feat_bonus) + proficiencias de armadura.
// Se usan en el editor (lápiz), en la ficha del personaje y en el panel del master.

const lower = s => (s ?? '').toLowerCase()
export const TEXT_SEP = String.fromCharCode(31) // separador de textos (igual que el backend)

/* Bonos resueltos: skill (prof verde / expert azul), text (índigo), stat/healing ("LLAVE +valor" verde) */
export function ResolvedBonusBadges({ bonos }) {
  return (bonos || []).map((b, i) => {
    if (lower(b.type) === 'skill') {
      // 'exp' (especializaciones) tiene la misma semántica que 'expert' (feats)
      const isExpert = ['expert', 'exp'].includes(lower(b.value))
      const cls = isExpert ? 'text-blue-800 bg-blue-100 border-blue-300' : 'text-green-800 bg-green-100 border-green-300'
      return <span key={i} className={`text-[9px] font-bold rounded px-1 shrink-0 border ${cls}`}>{isExpert ? 'expert' : 'prof'}: {b.llave}</span>
    }
    if (lower(b.type) === 'text') {
      const vals = (b.value ?? '').split(TEXT_SEP)
      const txt = vals.length > 1
        ? `${b.llave} ${vals.map((v, k) => `${k + 1}. ${v}`).join(' ')}`
        : `${b.llave} : ${vals[0] ?? ''}`
      return <span key={i} className="text-[9px] font-bold text-indigo-800 bg-indigo-100 border border-indigo-300 rounded px-1 shrink-0">{txt}</span>
    }
    // Bonos sin llave (carriers de prerequisito) → no se muestran (evita el badge "+")
    const llave = (b.llave || '').trim()
    if (!llave) return null
    return (
      <span key={i} className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1 shrink-0">
        {llave.toUpperCase()} +{b.value}
      </span>
    )
  })
}

/* Proficiencias de armadura otorgadas (personaje_armor_prof) */
export function ArmorProfBadges({ profs }) {
  return (profs || []).map((a, i) => (
    <span key={i} className="text-[9px] font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded px-1 shrink-0">armadura: {a}</span>
  ))
}

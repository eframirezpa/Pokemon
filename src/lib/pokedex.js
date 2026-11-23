// Ayudas de texto para la ficha de la Pokédex (página y panel lateral)

export const splitList = s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : []
export const slugToTitle = s => s ? s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''
export const statMod = v => { const m = Math.floor((v - 10) / 2); return m >= 0 ? `+${m}` : `${m}` }
export const numeroPokedex = n => n != null ? `#${String(n).padStart(4, '0')}` : ''
export const genderLabel = r => {
  if (!r) return 'Desconocido'
  const [f, m] = r.split(':').map(Number)
  if (!m) return 'Sin género'
  const fp = Math.round((f / (f + m)) * 100)
  return `♀ ${fp}%  ♂ ${100 - fp}%`
}

// Bonos que otorga una especialización, derivados de su fila del catálogo.
//
// Los comparten la herramienta del lápiz y la ventana de subida de nivel, que
// son las dos vías por las que se puede ganar una. Vivía duplicado en el lápiz;
// tenerlo en un solo sitio evita que las dos vistas prometan cosas distintas.
export function specPreviewBonos(s) {
  const bonos = []
  if (s?.specialization_ability_score_increase) {
    bonos.push({
      type: 'stat',
      llave: s.specialization_ability_score_increase,
      value: String(s.specialization_ability_score_increase_value ?? 1),
    })
  }
  if (s?.specialization_skill_proficiency) {
    bonos.push({ type: 'skill', llave: s.specialization_skill_proficiency, value: 'exp' })
  }
  return bonos
}

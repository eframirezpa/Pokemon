// Interpretación de los bonos de ruta (path_bonus), compartida por las tres
// vistas que los muestran: el catálogo del home, la ventana de subida de nivel
// y el detalle de la ruta en la ficha.
//
// Sin esto cada una renderizaba la fila en crudo y se leía como
// "Proficiencia · chosen skill 2", que no dice nada. Y tres copias de la misma
// lógica es justo lo que se desincroniza cuando cambian las reglas.
//
// Espejo de clasificarBono() en back/src/services/personaje_improvement.service.js.

const norm = s => (s ?? '').toLowerCase().trim()
export const legible = s => (s ?? '').replace(/_/g, ' ')

export const TIPO_BONO = {
  resource: 'Recurso', resource_die: 'Dado de recurso', feature_uses: 'Usos',
  ability_score_increase: 'Aumento de atributo', skill_proficiency: 'Proficiencia',
  skill_expertise: 'Experiencia', stab_bonus: 'Bono STAB', saving_throw: 'Tirada de salvación',
}
export const TARGET_BONO = {
  trainer: 'Entrenador', all_pokemon: 'Todos los Pokémon', pokemon: 'Pokémon',
}

/* 'animal_handling' → 'Animal Handling' */
export const skillLegible = s => legible(s)
  .split(' ').filter(Boolean)
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ')

/**
 * Qué hay que hacer con el bono:
 *   { modo:'elegir', valor, cuantas, target }  el jugador escoge N habilidades
 *   { modo:'fija',   valor, llave, target }    la habilidad viene dada
 *   null                                       narrativa: se muestra, no se aplica
 */
export function clasificarPathBonus(tipo, llave, valor, target) {
  const t = norm(tipo), k = norm(llave), tg = norm(target)
  if (t !== 'skill_proficiency' && t !== 'skill_expertise') return null
  const v = t === 'skill_expertise' ? 'expert' : 'prof'
  if (k === 'chosen_skill') {
    return { modo: 'elegir', valor: v, cuantas: Math.max(1, Math.floor(Number(valor) || 1)), target: tg }
  }
  if (!k) return null
  return { modo: 'fija', valor: v, llave: k, target: tg }
}

/* Acepta una fila del catálogo (path_bonus_*) o la forma anidada de /paths */
const campos = (b) => ({
  tipo:   b.path_bonus_type   ?? b.type,
  llave:  b.path_bonus_key    ?? b.key,
  valor:  b.path_bonus_value  ?? b.value,
  target: b.path_bonus_target ?? b.target,
  die:    b.path_bonus_resource_die ?? b.resource_die,
  notas:  b.path_bonus_notes  ?? b.notes,
})

/**
 * Texto legible del bono, más metadatos para pintarlo.
 * { texto, detalle, target, aplica }  — aplica=false ⇒ narrativa, lo lleva el DM.
 */
export function describirPathBonus(bonus) {
  const c = campos(bonus)
  const r = clasificarPathBonus(c.tipo, c.llave, c.valor, c.target)
  const tg = norm(c.target)
  const quien = tg && tg !== 'trainer' ? (TARGET_BONO[tg] || legible(tg)) : null

  if (r?.modo === 'elegir') {
    const q = r.valor === 'expert' ? 'experiencia' : 'proficiencia'
    return {
      texto: `Elige ${r.cuantas} habilidad${r.cuantas > 1 ? 'es' : ''}`,
      detalle: `Gana ${q}${quien ? ` para ${quien.toLowerCase()}` : ''}`,
      target: tg, aplica: true,
    }
  }
  if (r?.modo === 'fija') {
    return {
      texto: `${r.valor === 'expert' ? 'Experiencia' : 'Proficiencia'} en ${skillLegible(r.llave)}`,
      detalle: quien ? `Para ${quien.toLowerCase()}` : null,
      target: tg, aplica: true,
    }
  }
  // Narrativa: se describe lo que dice el catálogo, sin prometer que se aplique
  const partes = [TIPO_BONO[norm(c.tipo)] || legible(c.tipo)]
  if (c.llave) partes.push(legible(c.llave))
  if (c.valor) partes.push(String(c.valor))
  if (c.die)   partes.push(c.die)
  return {
    texto: partes.join(' · '),
    detalle: c.notas || null,
    target: tg, aplica: false,
  }
}

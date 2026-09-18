// Habilidades, stats y modificadores efectivos del entrenador, con los bonos
// que aplica la ficha: feats, especializaciones y ruta.
//
// Vive aquí y no dentro de una pantalla porque lo necesitan dos: el panel de
// combate y la tirada de iniciativa, que suma el modificador de DEX ya
// bonificado. Es una función pura sobre el /full del personaje.
export function construirSkillsTrainer(d) {
  const norm = x => (x ?? '').toLowerCase()
  const statAdd = {}, skProf = new Set(), skExpert = new Set(), savingProf = new Set()

  const acumular = (bonos) => {
    for (const b of (bonos || [])) {
      const t = norm(b.type), k = norm(b.llave), v = norm(b.value)
      if (t === 'stat') statAdd[k] = (statAdd[k] || 0) + (Number(b.value) || 0)
      else if (t === 'skill') { if (v === 'expert' || v === 'exp') skExpert.add(k); else if (v === 'prof') skProf.add(k) }
      else if (t === 'saving') savingProf.add(k)
    }
  }
  for (const f of (d.extra_feats || [])) acumular(f.bonos)
  for (const sp of (d.specializations || [])) acumular(sp.bonos)
  // El origen y el background también otorgan salvaciones (p. ej. Frostborn)
  for (const f of [d.origin_feat, d.background_feat]) acumular(f?.bonos)
  // Los bonos de ruta con target all_pokemon son para los Pokémon, no para él
  acumular((d.path_bonos || []).filter(b => norm(b.target) === 'trainer'))

  const st = d.stats || {}
  const modOf = k => Math.floor(
    ((Number(st[`personaje_${k}`]) || 0) + (Number(st[`personaje_${k}_bonus`]) || 0) + (statAdd[k] || 0) - 10) / 2)
  const prof = Number(d.personaje_prof) || 2

  const skills = (Array.isArray(d.skills) ? d.skills : []).map(s => {
    const nombre = norm(s.skill_name)
    let pref = !!s.personaje_skill_pref, expert = !!s.personaje_skill_expert
    if (skProf.has(nombre)) pref = true
    if (skExpert.has(nombre)) { if (pref) expert = true; else pref = true }
    return {
      name: s.skill_name,
      ability: s.skill_related_ability,
      pref, expert,
      mod: modOf(norm(s.skill_related_ability)) + (pref ? prof : 0) + (expert ? prof : 0),
    }
  })
  // El modificador de DEX sale de aquí porque ya tiene aplicados los bonos de
  // feats y especialidades; lo necesita el cálculo del AC.
  // Proficiencia en la tirada de salvación: el booleano de personaje_stats más
  // las que otorgan los feats. Misma condición que el check verde de la ficha.
  const stats = ['str','dex','con','int','wis','cha'].map(k => ({
    key: k.toUpperCase(),
    valor: (Number(st[`personaje_${k}`]) || 0) + (Number(st[`personaje_${k}_bonus`]) || 0) + (statAdd[k] || 0),
    mod: modOf(k),
    prof: !!st[`personaje_stats_${k}_prof`] || savingProf.has(k),
  }))
  return { skills, dexMod: modOf('dex'), stats }
}

/**
 * Modificador de una característica de un Pokémon del entrenador, con sus
 * bonos de feats aplicados y topado por nivel (20, o 22 desde nivel 20). Es
 * la misma fórmula que arma el panel de combate para leer `d` de
 * `/personaje/:id/pokemon/:idpp` — vive aparte porque también la necesita la
 * tirada de iniciativa cuando se elige tirar con el Pokémon invocado en vez
 * de con el entrenador.
 */
export function statModPokemon(d, key) {
  const stats = d.stats || {}
  const nivel = Number(d.pokemon_level) || 1
  const conFeats = (d.feats || []).length > 0
  const statAdd = {}
  if (conFeats) for (const f of (d.feats || [])) for (const b of (f.bonos || [])) {
    if ((b.type || '').toLowerCase() !== 'stat') continue
    const llave = (b.llave || '').toLowerCase()
    statAdd[llave] = (statAdd[llave] || 0) + (Number(b.value) || 0)
  }
  const crudo = (Number(stats[`pokemon_${key}`]) || 0) + (Number(stats[`pokemon_${key}_bonus`]) || 0) + (statAdd[key] || 0)
  const valor = conFeats ? Math.min(crudo, nivel >= 20 ? 22 : 20) : crudo
  return Math.floor((valor - 10) / 2)
}

/** ¿El entrenador o el Pokémon tiene este feat? Se compara por feat_name_id
 *  (el slug del catálogo, p. ej. 'alert'/'alert_p'), no por el id numérico:
 *  es el mismo criterio que ya usa item_name_id, más legible y estable que
 *  un id que solo tiene sentido mirando la tabla. */
export function tieneFeat(feats, nameId) {
  return (feats || []).some(f => (f.feat_name_id || '').toLowerCase() === nameId)
}

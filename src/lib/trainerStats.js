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

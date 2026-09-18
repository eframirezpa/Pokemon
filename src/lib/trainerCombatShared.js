// Compartido entre TrainerPartida.jsx y su CombatePanel extraído.

// AC del entrenador con la MISMA regla que la ficha: base de la armadura más el
// modificador de DEX, topado por la armadura (Medium Armor Master sube ese tope
// de +2 a +3). Sin armadura, el AC guardado. Replicarlo evita que el panel y la
// ficha muestren números distintos.
const FEAT_MEDIUM_ARMOR_MASTER = 33
export function acDelTrainer(d, dexMod) {
  const a = d.armor
  if (!a) return d.personaje_ac
  let v = a.armor_type_base_ac || 0
  if (a.armor_type_uses_dex_modifier === 1) {
    if (a.armor_type_max_dex_modifier != null) {
      const sube = (d.extra_feats || []).some(f => Number(f.feat_id) === FEAT_MEDIUM_ARMOR_MASTER)
      const cap = sube ? Math.max(a.armor_type_max_dex_modifier, 3) : a.armor_type_max_dex_modifier
      v += Math.min(dexMod, cap)
    } else v += dexMod
  }
  return v
}

// Estética de los iconos laterales: redondo, gris, con borde y sombra. Vive
// aquí y no dentro del componente para que CombatePanel pueda reutilizarla.
export const ICONO_REDONDO = 'shrink-0 flex items-center justify-center rounded-full bg-gray-700 ' +
  'hover:bg-gray-600 text-gray-200 shadow-lg border border-gray-600 transition-all'

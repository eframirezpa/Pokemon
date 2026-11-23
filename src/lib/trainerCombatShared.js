// Compartido entre TrainerPartida.jsx y su CombatePanel extraído.

// AC del entrenador con la MISMA regla que la ficha: base de la armadura más el
// modificador de DEX, topado por la armadura (Medium Armor Master sube ese tope
// de +2 a +3). Sin armadura, 10 + DEX (regla de D&D). Replicarlo evita que el panel y la
// ficha muestren números distintos.
const FEAT_MEDIUM_ARMOR_MASTER = 33
export function acDelTrainer(d, dexMod) {
  const a = d.armor
  // Sin armadura: 10 + DEX. Al quitarla, el AC guardado queda en null.
  if (!a) return 10 + (Number(dexMod) || 0)
  let v = a.armor_type_base_ac || 0
  if (a.armor_type_uses_dex_modifier === 1) {
    if (a.armor_type_max_dex_modifier != null) {
      const sube = (d.extra_feats || []).some(f => Number(f.feat_id) === FEAT_MEDIUM_ARMOR_MASTER)
      const cap = sube ? Math.max(a.armor_type_max_dex_modifier, 3) : a.armor_type_max_dex_modifier
      v += Math.min(dexMod, cap)
    } else v += dexMod
  }
  // Como la ficha: el bono propio de la armadura (si trae)
  if (a.armor_type_ac_bonus != null) v += Number(a.armor_type_ac_bonus) || 0
  return v
}

// Estética de los iconos de la sala: cápsula redonda de cristal oscuro con
// la silueta en un blanco lila suave (#E2D8E4, elegido por el usuario). Es la
// única definición: la usan BotonIcono (columna de la sala), TrainerPartida y
// CombatePanel. Lleva `modo-oscuro` propio para que el cristal y el texto
// tomen los valores oscuros aunque el contenedor siga en claro.
export const ICONO_REDONDO = 'modo-oscuro cristal shrink-0 flex items-center justify-center rounded-full ' +
  'text-[#E2D8E4] hover:bg-[rgba(72,72,74,.85)] transition-colors'
// Variante encendida (algo en curso: iniciativa, actividad abierta…)
export const ICONO_REDONDO_ACTIVO = 'modo-oscuro shrink-0 flex items-center justify-center rounded-full ' +
  'bg-acento hover:bg-acento-hover text-white shadow-[0_6px_18px_rgba(127,0,178,.55)] transition-colors'

// Movimientos con requerimientos especiales que la app no resuelve sola: la
// ventana del ataque muestra un aviso para hablarlo con el DM.
// Claves: moves.move_name_id.

// Hacen más de un ataque
const VARIOS_ATAQUES = new Set([
  'beat-up', 'bonemerang', 'bubble', 'double-hit', 'double-iron-bash', 'double-kick',
  'dragon-darts', 'dual-chop', 'dual-wingbeat', 'gear-grind', 'population-bomb',
  'precipice-blades', 'scale-shot', 'surging-strikes', 'swords-dance', 'triple-arrows',
  'triple-axel', 'triple-dive', 'triple-kick', 'twin-beam', 'twineedle', 'zing-zap',
])

// move_name_id si viene; si no, el nombre llevado a la misma forma ("Double Kick" → double-kick)
const clave = (m) => String(m?.move_name_id || m?.move_name || '').trim().toLowerCase().replace(/\s+/g, '-')

/** Lista de avisos del movimiento (vacía si no tiene requerimientos especiales) */
export const requerimientosEspeciales = (m) => {
  const avisos = []
  if (VARIOS_ATAQUES.has(clave(m))) avisos.push('Este movimiento hace más de un ataque, habla con tu DM.')
  return avisos
}

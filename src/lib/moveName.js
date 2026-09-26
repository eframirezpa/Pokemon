// Clave para comparar nombres de movimientos: la Pokédex escribe "Double Edge"
// y el catálogo "Double-Edge". Se quita todo lo que no sea letra o número.
// Es el mismo criterio que back/src/lib/move_name.js.
export const claveMove = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

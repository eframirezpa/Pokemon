// Tipos de item con su etiqueta y color. Los comparten el catálogo de items y
// su panel de detalle.
export const ITEM_TYPES = [
  { value: 'berry',        label: 'Berry',           bg: '#78C850' },
  { value: 'evolution',    label: 'Evolución',       bg: '#7038F8' },
  { value: 'held item',    label: 'Objeto Equipado', bg: '#6890F0' },
  { value: 'medicine',     label: 'Medicina',        bg: '#F85888' },
  { value: 'pokeball',     label: 'Pokéball',        bg: '#C03028' },
  { value: 'trainer gear', label: 'Equipo',          bg: '#F08030' },
  { value: 'Proyectil',    label: 'Proyectil',       bg: '#F8D030' },
  { value: 'TM',           label: 'TM',              bg: '#1FA2B0' },
]

export const tipoItem = (value) => ITEM_TYPES.find(t => t.value === value) ?? null

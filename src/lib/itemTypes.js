// Tipos que el máster puede ponerle a un item al crearlo o corregirlo.
//
// Vive aparte y no dentro de uno de los dos popups porque lo comparten los dos,
// y exportarlo desde un archivo de componente rompe el refresco en caliente.
export const TIPOS_ITEM = [
  'berry', 'pokeball', 'held item', 'evolution',
  'trainer gear', 'Event Item', 'medicine', 'Proyectil',
]

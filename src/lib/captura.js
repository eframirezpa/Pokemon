// Pokébolas en la ventana de captura automática: qué tiene que marcar o
// aportar el jugador para cada una. La DC la calcula el servidor
// (back/src/lib/captura.js); esta lista es su espejo en la interfaz, así que si
// se agrega una pokébola con condición hay que tocar los dos sitios.

/** 'Poké Ball' → 'poke', 'Great Ball' → 'great'. Igual que en el servidor. */
export const claveBola = (nombre) => String(nombre ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().split(/\s+/)[0] || ''

// Las que dependen de algo que la app no sabe: las marca el jugador
export const CONDICION_BOLA = {
  lure:  { texto: 'Estás pescando', descuento: 10 },
  dive:  { texto: 'Estás bajo el agua', descuento: 10 },
  dusk:  { texto: 'Es de noche o está oscuro', descuento: 10 },
  moon:  { texto: 'Evoluciona con una Moon Stone', descuento: 10 },
  dream: { texto: 'El Pokémon está dormido', descuento: 5 },
}

// Las que descuentan una habilidad del entrenador (se lee de su ficha)
export const SKILL_BOLA = { safari: 'Nature', friend: 'Persuasion', sport: 'Athletics' }

// Lo que la app sí calcula sola, para contárselo al jugador antes de lanzar
export const NOTA_BOLA = {
  great:  'Reduce la DC en 5.',
  ultra:  'Reduce la DC en 10.',
  master: 'Atrapa sin tirada.',
  quick:  'Reduce la DC en 15 si es la primera ronda del combate.',
  net:    'Reduce la DC en 10 contra tipo Agua o Bicho.',
  nest:   'Reduce la DC en 5 si el Pokémon es de nivel 5 o menos.',
  level:  'Reduce la DC en 5 si tienes más nivel que el Pokémon.',
  heavy:  'Reduce la DC en 10 si el Pokémon es Medium o más grande.',
  repeat: 'Reduce la DC en 10 si ya tienes uno de esta especie.',
  timer:  'Reduce la DC en 1 por turno que te concentraste, hasta 10.',
  love:   'Reduce la DC en el doble del modificador de CHA de tu Pokémon invocado.',
}

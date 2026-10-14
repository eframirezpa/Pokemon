// Climas de combate de poke5e (https://poke5e.app/rules/weather). Las claves
// son las que guarda el servidor (partida_clima).
export const CLIMAS = [
  {
    clave: 'sol', nombre: 'Sol intenso', icono: '☀️', color: '#f59e0b',
    reglas: ['Daño de tipo Fuego con ventaja.', 'Daño de tipo Agua con desventaja.'],
  },
  {
    clave: 'lluvia', nombre: 'Lluvia', icono: '🌧️', color: '#3b82f6',
    reglas: ['Daño de tipo Agua con ventaja.', 'Daño de tipo Fuego con desventaja.'],
  },
  {
    clave: 'arena', nombre: 'Tormenta de arena', icono: '🌪️', color: '#b45309',
    reglas: ['Zona ligeramente oscurecida.', 'Los Pokémon de tipo Roca ganan +1 AC.',
      'Si la provocó un Pokémon: daño de Roca cada turno igual a la mitad de su nivel.'],
  },
  {
    clave: 'granizo', nombre: 'Granizo', icono: '🧊', color: '#7dd3fc',
    reglas: ['Si lo provocó un Pokémon: daño de Hielo cada turno igual a la mitad de su nivel.'],
  },
  {
    clave: 'nieve', nombre: 'Nieve', icono: '❄️', color: '#e0f2fe',
    reglas: ['Los Pokémon de tipo Hielo ganan +1 AC (más si la provocó un Pokémon).'],
  },
  {
    clave: 'niebla', nombre: 'Niebla', icono: '🌫️', color: '#9ca3af',
    reglas: ['Zona muy oscurecida.'],
  },
]

export const climaPorClave = (clave) => CLIMAS.find(c => c.clave === clave) || null

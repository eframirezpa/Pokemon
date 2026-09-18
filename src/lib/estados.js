// Estados alterados clásicos. Cada quien se los pone y se los quita, sobre sí
// mismo y sobre sus Pokémon; por ahora nada se aplica solo.
//
// La misma lista vive en el backend, que descarta cualquier estado que no esté
// aquí, así que si se agrega uno hay que tocar los dos sitios.
export const ESTADOS = [
  { clave: 'paralizado',  label: 'Paralizado', icono: '⚡', color: '#F8D030' },
  { clave: 'dormido',     label: 'Dormido',    icono: '💤', color: '#A890F0' },
  { clave: 'envenenado',  label: 'Envenenado', icono: '☠️', color: '#A040A0' },
  { clave: 'quemado',     label: 'Quemado',    icono: '🔥', color: '#F08030' },
  { clave: 'congelado',   label: 'Congelado',  icono: '❄️', color: '#98D8D8' },
  { clave: 'confuso',     label: 'Confuso',    icono: '💫', color: '#F85888' },
]

const PORCLAVE = new Map(ESTADOS.map(e => [e.clave, e]))

/** 'quemado,confuso' → [{clave,label,...}]. Ignora lo que no conozca. */
export const leerEstados = (texto) => String(texto ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  .map(e => PORCLAVE.get(e)).filter(Boolean)

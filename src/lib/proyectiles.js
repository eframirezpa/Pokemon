// Proyectiles del entrenador (items de tipo "Proyectil", db/Csv/Proyectiles_Pokemon_DnD.csv).
//
// - Elemental: el nombre empieza por un tipo Pokémon ("Fire Arrows",
//   "Normal-Type Rifle Rounds") Y la descripción lo confirma ("cambia su tipo
//   a Fire"). Conserva la cantidad de daño del arma y cambia su tipo, así que
//   contra un Pokémon aplican vulnerabilidad, resistencia e inmunidad.
//   Sin el tipo en el nombre no es elemental. Poison Darts lleva Poison en el
//   nombre pero su descripción no cambia el tipo: es un dardo con efecto.
// - Compatibilidad: cada clase de proyectil va con su arma (flechas → arcos,
//   virotes → ballestas…). Lo que no se reconoce se deja usar con cualquiera.
// - Efectos no elementales que se pueden resolver en la pantalla del DM
//   (salvación del objetivo y su consecuencia). El resto es narrativo: solo
//   se anuncia.

export const TIPOS_POKEMON = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground',
  'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy']

const nombreDe = (item) => String(item?.item_name ?? item ?? '').trim()

/** Tipo Pokémon del proyectil ('Fire'…) o null si no es elemental. */
export const elementoDeProyectil = (item) => {
  const r = /^([A-Za-z]+)(?:-Type)?\s+\S/.exec(nombreDe(item))
  if (!r) return null
  const tipo = TIPOS_POKEMON.find(t => t.toLowerCase() === r[1].toLowerCase())
  if (!tipo) return null
  // La descripción tiene que confirmarlo (si viene)
  const desc = item?.item_description
  if (desc != null && !new RegExp(`(cambia su tipo a|changes? (its|the) (damage )?type to)\\s+${tipo}\\b`, 'i').test(desc)) return null
  return tipo
}

/** Clase del proyectil por su nombre: arrow, bolt, dart, sling, pistol, rifle, shotgun (o null). */
export const claseDeProyectil = (item) => {
  const n = nombreDe(item).toLowerCase()
  if (/crossbow bolts?$/.test(n)) return 'bolt'
  if (/arrows?$/.test(n)) return 'arrow'
  if (/darts?$/.test(n)) return 'dart'
  if (/(sling bullets?|pellets?)$/.test(n)) return 'sling'
  if (/pistol rounds?$/.test(n)) return 'pistol'
  if (/rifle rounds?$/.test(n)) return 'rifle'
  if (/shotgun shells?$/.test(n)) return 'shotgun'
  return null
}

/** Qué clase de proyectil dispara el arma (por su nombre) o null. */
export const claseDeArma = (arma) => {
  const n = String(arma?.weapon_type_name || '').toLowerCase()
  if (/crossbow/.test(n)) return 'bolt'
  if (/bow/.test(n)) return 'arrow'
  if (/blowgun/.test(n)) return 'dart'
  if (/sling/.test(n)) return 'sling'
  if (/pistol|revolver/.test(n)) return 'pistol'
  if (/rifle/.test(n)) return 'rifle'
  if (/shotgun/.test(n)) return 'shotgun'
  return null
}

/** ¿Se puede disparar este proyectil con esta arma? Lo desconocido, sí. */
export const esCompatible = (item, arma) => {
  const a = claseDeArma(arma)
  const p = claseDeProyectil(item)
  return !a || !p || a === p
}

/**
 * Efecto no elemental del proyectil al impactar, o null si no tiene.
 *   salvacion/dc: la tira el objetivo.
 *   dano/tipoDano: daño extra (mitad si salva) · estado: el que queda si falla
 *   curaEstado: el que se le quita si salva · falla/supera: texto para el registro
 *   area: también afecta a lo que esté cerca (eso lo resuelve el DM a mano)
 *   nota: efecto narrativo, solo se anuncia
 */
export const efectoDeProyectil = (item) => {
  const n = nombreDe(item).toLowerCase()
  if (/^explosive /.test(n)) {
    return { salvacion: 'DEX', dc: 13, dano: '2d8', tipoDano: 'Fire', mitad: true, area: 'las criaturas a 5 pies del objetivo' }
  }
  if (n === 'poison darts') return { salvacion: 'CON', dc: 13, estado: 'envenenado', falla: 'queda Envenenado (repite la salvación al final de cada turno)' }
  if (n === 'antidote darts') return { salvacion: 'CON', dc: 13, curaEstado: 'envenenado', supera: 'termina su envenenamiento', soloVoluntario: true }
  if (n === 'tranquilizer darts') return { salvacion: 'CON', dc: 13, falla: 'queda somnoliento 1 minuto: desventaja en Percepción y salvaciones de DEX (repite la salvación al final de cada turno)' }
  if (n === 'sticky pellets') return { salvacion: 'DEX', dc: 13, falla: 'su velocidad baja 10 pies hasta el final de su siguiente turno' }
  if (n === 'flash pellets') return { salvacion: 'CON', dc: 13, falla: 'tiene desventaja en su próxima tirada de ataque o de Percepción', area: 'las criaturas a 5 pies del impacto' }
  if (/^(marking|tracking|noise|smoke|scent|chalk) /.test(n)) return { nota: true }
  return null
}

/** Lo que viaja con el ataque a la pantalla del DM. */
export const proyectilParaAtaque = (item) => {
  if (!item) return null
  const efecto = efectoDeProyectil(item)
  return {
    nombre: nombreDe(item),
    elemento: elementoDeProyectil(item),
    efecto,
    // El texto del efecto narrativo, para el registro
    descripcion: efecto?.nota ? String(item.item_description || '').replace(/^Munición[^.]*\.\s*Cada ataque consume[^.]*\.\s*/i, '') : null,
  }
}

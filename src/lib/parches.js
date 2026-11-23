// Notas de parche: qué cambió en cada versión de la app.
//
// El primero de la lista es el parche actual. Su número debe coincidir con
// "version" de front/package.json y back/package.json y con el tag vX.Y.Z de
// git en los dos repos (test/parches.test.js lo comprueba contra el front).
//
// Cambios: una línea cada uno, informativa, sin explicar el cómo.
// Para abrir un parche nuevo se agrega una entrada arriba y se sube la versión.

export const PARCHES = [
  {
    // Incluye lo que iba a salir como 1.1.0: esa versión no llegó a la mesa.
    version: '1.2.0',
    fecha: '2026-11-23',
    cambios: [
      'El DM tiene Pokédex en su barra lateral.',
      'Atrapar un Pokémon oculto ya no revela cuál era.',
      'La tirada de iniciativa muestra el bono en el chat.',
      'Ataque con arma: daño del arma y gasto de munición opcional.',
      'Especialidades: +1 a todas las skill checks de tus Pokémon de ese tipo.',
      'Se ocultó el botón de editar jugador (lápiz).',
      'Derrotar o atrapar un Pokémon deja en el chat la experiencia que otorga.',
      'Al renombrar un Pokémon atrapado, el género se ve grande y se recuerda al guardar.',
      'Todo ataque pide objetivo; el chat dice a quién se atacó.',
      'Daño de movimientos: vulnerable ×2, resistente ÷2 e inmune 0 según el tipo del objetivo.',
      'STAB: los movimientos del mismo tipo que el Pokémon suman su proficiencia al daño.',
      'Los estados se ven como un aro alrededor del entrenador y del Pokémon: icono arriba, nombre abajo.',
      'Un solo estado a la vez: elegir otro lo reemplaza, repetirlo lo quita y "Ninguno" lo limpia.',
      'Notas de parche: esta ventana.',
      'Rediseño visual: acento morado, claro para consultar y oscuro en la partida.',
      'Pokédex: tocar un Pokémon abre directo su ficha completa.',
      'El mensaje del DM aparece arriba a la izquierda y se pliega solo a los 20 s.',
      'La barra de turno se vuelve a abrir sola cuando tu turno está por llegar.',
      'Turno y clima arriba al centro; "Salir" queda solo como icono.',
      'En el campo: plataforma y ficha con vida bajo tu entrenador y tu Pokémon.',
      'Panel de combate renovado: vida grande, pestañas y botones "Usar" y "Lanzar".',
      'Armaduras: DEX y AC en lugar de DES y CA.',
      'Se instala en el celular como app, sin la barra del navegador.',
      'El registro de actividad ya no queda tapado por los avatares del campo.',
    ],
  },
]

export const PARCHE_ACTUAL = PARCHES[0]

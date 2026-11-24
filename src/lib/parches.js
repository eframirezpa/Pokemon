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
    // Junta lo nuevo con lo de la 1.2.0 (y esta con lo de la 1.1.0), para que
    // la mesa lo vea todo en una sola ventana.
    version: '1.3.0',
    fecha: '2026-11-23',
    cambios: [
      'Atrapar un Pokémon da 1/5 de la experiencia; la Pokédex muestra la de derrotar y la de atrapar.',
      '"Turno anterior" vuelve a la ronda anterior.',
      'En el celular: la pantalla no se apaga en la sala, no se recarga al deslizar y vibra en tu turno.',
      '"Salir" pide confirmación.',
      'Check "Centro Pokémon" del DM: sin él no se mueve, libera ni transfiere en cinturón y Femputadora.',
      'Experiencia en mesa: el DM confirma quién intervino y cada jugador reparte su parte entre sus Pokémon.',
      'Cada ganancia de experiencia sube como máximo un nivel.',
      'Los Pokémon del DM eligen objetivo, comparan con la AC y restan la vida; las salvaciones las tira el jugador.',
      'Check "Daño automático" del DM para no restar vida.',
      'Sin armadura la AC es 10 + DEX.',
      'Ataque con arma: el stat se elige solo según el arma, botón para cambiar de arma y golpe sin arma (1 + STR).',
      'Los ataques de los jugadores a lo del DM se resuelven solos y avisan si acertaron.',
      'Lápiz para entrenar feats a Pokémon en la Femputadora; los feats extra piden aprobación del DM y salen en el resumen de sesión.',
      'El DM tiene Pokédex en su barra lateral.',
      'Atrapar un Pokémon oculto ya no revela cuál era.',
      'La tirada de iniciativa muestra el bono en el chat.',
      'Ataque con arma: daño del arma y gasto de munición opcional.',
      'Especialidades: +1 a todas las skill checks de tus Pokémon de ese tipo.',
      'El botón de editar jugador (lápiz) solo se activa si el DM lo permite.',
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

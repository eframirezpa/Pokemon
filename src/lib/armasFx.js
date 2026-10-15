// Animación del ataque de un entrenador según su arma.
//
// Cada weapon_type_name_id de la tabla weapon_types apunta a un sprite de
// public/armas/ y a un tipo de animación:
//   corte     → barrido en arco (cortantes)
//   estocada  → empuje hacia adelante (perforantes cuerpo a cuerpo)
//   golpe     → se levanta y cae con onda de impacto (contundentes)
//   proyectil → el arma se queda y sale disparado `proyectil`
//   red       → la red vuela y se abre sobre el blanco
// Las armas de fuego llevan además el fogonazo en la boca del cañón.

export const ARMAS_FX = {
  club:               { sprite: 'garrote',   anim: 'golpe' },
  dagger:             { sprite: 'daga',      anim: 'estocada' },
  greatclub:          { sprite: 'garrote',   anim: 'golpe' },
  handaxe:            { sprite: 'hacha',     anim: 'corte' },
  javelin:            { sprite: 'lanza',     anim: 'estocada' },
  'light-hammer':     { sprite: 'martillo',  anim: 'golpe' },
  mace:               { sprite: 'maza',      anim: 'golpe' },
  quarterstaff:       { sprite: 'baston',    anim: 'golpe' },
  sickle:             { sprite: 'hoz',       anim: 'corte' },
  spear:              { sprite: 'lanza',     anim: 'estocada' },
  'light-crossbow':   { sprite: 'ballesta',  anim: 'proyectil', proyectil: 'virote' },
  dart:               { sprite: 'dardo',     anim: 'proyectil', proyectil: 'dardo' },
  shortbow:           { sprite: 'arco',      anim: 'proyectil', proyectil: 'flecha' },
  sling:              { sprite: 'honda',     anim: 'proyectil', proyectil: 'piedra' },
  battleaxe:          { sprite: 'hacha',     anim: 'corte' },
  flail:              { sprite: 'mangual',   anim: 'golpe' },
  glaive:             { sprite: 'alabarda',  anim: 'corte' },
  greataxe:           { sprite: 'hacha',     anim: 'corte' },
  greatsword:         { sprite: 'mandoble',  anim: 'corte' },
  halberd:            { sprite: 'alabarda',  anim: 'corte' },
  lance:              { sprite: 'lanza',     anim: 'estocada' },
  longsword:          { sprite: 'espada',    anim: 'corte' },
  maul:               { sprite: 'martillo',  anim: 'golpe' },
  morningstar:        { sprite: 'maza',      anim: 'golpe' },
  pike:               { sprite: 'lanza',     anim: 'estocada' },
  rapier:             { sprite: 'estoque',   anim: 'estocada' },
  scimitar:           { sprite: 'cimitarra', anim: 'corte' },
  shortsword:         { sprite: 'espada',    anim: 'estocada' },
  trident:            { sprite: 'tridente',  anim: 'estocada' },
  'war-pick':         { sprite: 'pico',      anim: 'golpe' },
  warhammer:          { sprite: 'martillo',  anim: 'golpe' },
  whip:               { sprite: 'latigo',    anim: 'corte' },
  blowgun:            { sprite: 'cerbatana', anim: 'proyectil', proyectil: 'dardo' },
  'hand-crossbow':    { sprite: 'ballesta',  anim: 'proyectil', proyectil: 'virote' },
  'heavy-crossbow':   { sprite: 'ballesta',  anim: 'proyectil', proyectil: 'virote' },
  longbow:            { sprite: 'arco',      anim: 'proyectil', proyectil: 'flecha' },
  net:                { sprite: 'red',       anim: 'red' },
  'pistol-automatic': { sprite: 'pistola',   anim: 'proyectil', proyectil: 'bala', fuego: true },
  revolver:           { sprite: 'pistola',   anim: 'proyectil', proyectil: 'bala', fuego: true },
  'rifle-hunting':    { sprite: 'rifle',     anim: 'proyectil', proyectil: 'bala', fuego: true },
  'rifle-automatic':  { sprite: 'rifle',     anim: 'proyectil', proyectil: 'bala', fuego: true },
  shotgun:            { sprite: 'rifle',     anim: 'proyectil', proyectil: 'perdigones', fuego: true },
}

// Sin arma (ataque con stat): puñetazo
export const SIN_ARMA_FX = { sprite: 'puno', anim: 'golpe' }

// Un arma que no esté en el mapa (una nueva en la tabla) cae por su tipo de daño
export function armaFx(w) {
  if (!w) return SIN_ARMA_FX
  const fx = ARMAS_FX[w.weapon_type_name_id]
  if (fx) return fx
  if (w.weapon_type_is_ranged) return { sprite: 'arco', anim: 'proyectil', proyectil: 'flecha' }
  const dano = String(w.weapon_type_damage_type || '').toLowerCase()
  if (dano === 'slashing') return { sprite: 'espada', anim: 'corte' }
  if (dano === 'piercing') return { sprite: 'lanza', anim: 'estocada' }
  return { sprite: 'martillo', anim: 'golpe' }
}

export const spriteArma = (nombre) => `/armas/${nombre}.svg`

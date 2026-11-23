// Experiencia en mesa (plan-xp-y-mesa, etapa 4): avisos al back.
// No bloquean la jugada: si fallan, el DM igual puede agregar al entrenador
// a mano en su ventana de reparto.
import { apiFetch } from '../api'

/**
 * Un ataque con un Pokémon del DM como objetivo, o una Poké Ball lanzada a él.
 * Solo cuentan los Pokémon del campo: los NPC no dan experiencia.
 *   objetivo: { tipo: 'pokemon', uid } (de getObjetivos o de la tarjeta del campo)
 */
export const registrarIntervencion = (partidaId, objetivo, { personajeId, pokemonId = null, tipo }) => {
  if (!partidaId || !personajeId || objetivo?.tipo !== 'pokemon') return
  const id_campo = Number(objetivo.uid)
  if (!Number.isInteger(id_campo)) return
  apiFetch(`/partida/${partidaId}/intervencion`, {
    method: 'POST',
    body: JSON.stringify({ id_campo, id_personaje: Number(personajeId), id_personaje_pokemon: pokemonId == null ? null : Number(pokemonId), tipo }),
  }).catch(() => {})
}

/** El DM: la experiencia que deja un Pokémon del campo derrotado o atrapado. */
export const crearXpPendiente = (partidaId, pokemon, motivo) => {
  const id_campo = Number(pokemon?.uid)
  if (!partidaId || !Number.isInteger(id_campo)) return Promise.resolve(null)
  return apiFetch(`/partida/${partidaId}/xp`, {
    method: 'POST',
    body: JSON.stringify({ id_campo, pokemon: pokemon.name, nivel: pokemon.level, sr: pokemon.sr, motivo }),
  }).then(r => (r.ok ? r.json() : null)).catch(() => null)
}

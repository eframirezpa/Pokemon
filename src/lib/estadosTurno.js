// Datos para procesar los estados al inicio y al final del turno
// (components/partida/EstadosTurno.jsx es la ventana).
import { apiFetch } from '../api'
import {
  clavesEstados, danoPorTurno, tiradasFinTurno, tiradasInicioTurno, avisosInicioTurno,
  resolverFinTurno, resolverInicioTurno,
} from './estados'
import { construirSkillsTrainer, statModPokemon } from './trainerStats'
import { hpValues } from './hp'

// ── Carga de datos ──────────────────────────────────────────────────────────

const tieneAlgo = (texto, meta) => clavesEstados(texto).length > 0 || !!meta?.gracia

/** El entrenador del jugador y su Pokémon invocado, con lo necesario. */
export async function criaturasJugador({ personajeId, pokemonInvocado }) {
  const out = []
  if (personajeId == null) return out
  try {
    const d = await apiFetch(`/personaje/${personajeId}/full`).then(r => r.json())
    if (tieneAlgo(d.personaje_estados, d.personaje_estados_meta)) {
      const { stats } = construirSkillsTrainer(d)
      const prof = Number(d.personaje_prof) || 2
      const str = stats.find(x => x.key === 'STR')
      const dex = stats.find(x => x.key === 'DEX')
      out.push({
        clave: `t-${personajeId}`, tipo: 'trainer', ids: { personajeId }, nombre: d.nombre_personaje || 'Tu entrenador',
        claves: clavesEstados(d.personaje_estados), meta: d.personaje_estados_meta || null,
        hp: hpValues(d).cur, prof, bonoStr: (Number(str?.mod) || 0) + (str?.prof ? prof : 0),
        mods: { str: Number(str?.mod) || 0, dex: Number(dex?.mod) || 0 },
      })
    }
  } catch { /* sin datos no se procesa */ }
  if (pokemonInvocado != null) {
    try {
      const d = await apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}`).then(r => r.json())
      if (tieneAlgo(d.personaje_pokemon_estados, d.personaje_pokemon_estados_meta)) {
        const prof = Number(d.pokemon_proficient) || 2
        out.push({
          clave: `p-${pokemonInvocado}`, tipo: 'pokemon', ids: { personajeId, idpp: pokemonInvocado }, nombre: d.pokemon_apodo || 'Tu Pokémon',
          claves: clavesEstados(d.personaje_pokemon_estados), meta: d.personaje_pokemon_estados_meta || null,
          hp: Number(d.pokemon_current_hp ?? d.pokemon_hp) || 0, prof,
          bonoStr: statModPokemon(d, 'str') + (d.stats?.pokemon_stats_str_prof ? prof : 0),
          mods: { str: statModPokemon(d, 'str'), dex: statModPokemon(d, 'dex') },
        })
      }
    } catch { /* idem */ }
  }
  return out
}

let nivelesCache = null
/** Proficiencia por nivel (tabla de niveles de entrenador): la de los NPC. */
const profPorNivel = async (nivel) => {
  if (!nivelesCache) nivelesCache = apiFetch('/trainer-levels').then(r => r.json()).catch(() => [])
  const filas = await nivelesCache
  const f = (Array.isArray(filas) ? filas : []).find(x => Number(x.trainer_level) === Number(nivel))
  return Number(f?.trainer_level_proficiency_bonus) || (2 + Math.floor((Math.max(1, Number(nivel) || 1) - 1) / 4))
}

/** Los Pokémon (fuera de la pokébola) y NPC del DM que tienen estados. */
export async function criaturasDm({ pokemons, npcs }) {
  const out = []
  for (const p of pokemons) {
    if (p.inBall || !tieneAlgo(p.estados, p.estadosMeta)) continue
    let d = null
    try { d = await apiFetch(`/master/pokemon/${p.master_pokemon_id}`).then(r => r.json()) } catch { /* sin detalle */ }
    const prof = Number(d?.pokemon_proficient) || 2
    out.push({
      clave: `cp-${p.uid}`, tipo: 'campo-pokemon', ids: { uid: p.uid }, nombre: p.name,
      claves: clavesEstados(p.estados), meta: p.estadosMeta || null, hp: Number(p.hp_current) || 0, prof,
      bonoStr: d ? statModPokemon(d, 'str') + (d.stats?.pokemon_stats_str_prof ? prof : 0) : null,
      mods: d ? { str: statModPokemon(d, 'str'), dex: statModPokemon(d, 'dex') } : null,
    })
  }
  for (const n of npcs) {
    if (!tieneAlgo(n.estados, n.estadosMeta)) continue
    out.push({
      clave: `cn-${n.uid}`, tipo: 'campo-npc', ids: { uid: n.uid }, nombre: n.name,
      claves: clavesEstados(n.estados), meta: n.estadosMeta || null, hp: Number(n.hp_current) || 0,
      prof: await profPorNivel(n.level), bonoStr: null, mods: null,
    })
  }
  return out
}

/** Qué hay que mostrar de una criatura en esta fase (vacío = nada que confirmar). */
export const tareasDe = (c, fase) => (fase === 'fin'
  ? { danos: danoPorTurno(c), tiradas: tiradasFinTurno(c), avisos: [] }
  : { danos: [], tiradas: tiradasInicioTurno(c), avisos: avisosInicioTurno(c) })

export const hayQueMostrar = (c, fase) => {
  const t = tareasDe(c, fase)
  return t.danos.length + t.tiradas.length + t.avisos.length > 0
}

/** Resultado sin ventana (solo avanzan contadores y gracia). */
export const resolverSinVentana = (c, fase) => (fase === 'fin' ? resolverFinTurno(c, {}) : resolverInicioTurno(c, {}))


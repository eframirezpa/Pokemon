import { useState, useEffect } from 'react'
import { X, Users } from 'lucide-react'
import { apiFetch } from '../api'
import { EstadosChips } from './EstadosControl'
import { AuraInspirado } from './InspiradoAura'
import LoadingOverlay from './LoadingOverlay'
import TerrenoPiso from './TerrenoPiso'
import NumerosFlotantes from './NumerosFlotantes'

const hpPct   = (cur, max) => Math.max(0, Math.min(100, Math.round(((cur ?? max ?? 0) / (max || 1)) * 100)))
const hpColor = pct => (pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444')
// Mismo efecto que el Pokémon del master cuando le baja la vida
const bleedClass = pct => (pct <= 20 ? 'animate-bleed-red' : pct <= 50 ? 'animate-bleed-yellow' : 'bg-relleno')

/* Cajitas de estado: EXH (neutro), DSTS (verde), DSTF (rojo) */
function MiniStat({ label, value, tone }) {
  const cls = tone === 'green'
    ? 'border-ok bg-ok/15 text-ok'
    : tone === 'red'
      ? 'border-acento bg-tinte/15 text-tinte'
      : 'border-texto-2/50 bg-superficie text-texto'
  return (
    <div className={`border rounded px-1 py-0.5 text-center leading-none ${cls}`}>
      <p className="text-[4px] font-black uppercase">{label}</p>
      <p className="text-[7px] font-black">{value ?? 0}</p>
    </div>
  )
}

function HpBar({ cur, max, showNumbers = true }) {
  const c = cur ?? max
  const pct = hpPct(cur, max)
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <span className="text-[5px] font-black text-aviso">HP</span>
        <div className="flex-1 h-[5px] bg-elevada rounded-full overflow-hidden border border-texto-2/50">
          <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
        </div>
      </div>
      {/* Los trainers ven la barra y su color, pero no los hit points */}
      {showNumbers && <p className="text-right text-[5px] font-bold text-texto leading-none mt-0.5">{c}/{max}</p>}
    </div>
  )
}

/* Tarjeta de un Pokémon del cinturón (estilo del Pokémon que invoca el master).
   Todo un 30% más chico que el tamaño original -tarjeta, letras, iconos-, y
   luego otro 10% más sobre eso (168px→151px, 34px→31px...), menos los
   estados: esos EstadosChips de abajo siguen en su tamaño de siempre, a
   propósito. */
function PartyPokemon({ p, hideHp, onClick, enTurno = false }) {
  const pct    = hpPct(p.pokemon_current_hp, p.pokemon_hp)
  const sprite = (p.pokemon_is_shiny && p.pokemon_media_sprite_shiny)
    ? p.pokemon_media_sprite_shiny
    : (p.pokemon_media_sprite || p.pokemon_media_main)
  return (
    <div onClick={onClick} title={onClick ? 'Ver detalle del Pokémon' : undefined}
      className={`relative flex items-center gap-[5px] border border-separador rounded-[7px] p-[5px] shrink-0 w-[151px] ${bleedClass(pct)}
        ${enTurno ? 'animate-turno-anillo' : ''}
        ${onClick ? 'poke-hop cursor-pointer hover:ring-2 hover:ring-tinte/60 transition-shadow' : ''}`}>
      <NumerosFlotantes valor={p.pokemon_current_hp} mostrarNumero={!hideHp} />
      <div className="flex flex-col items-center gap-[2px] shrink-0">
        {/* El fondo blanco va en el marco para que salte solo el sprite */}
        <div className="w-[31px] h-[31px] bg-superficie rounded-[5px] border border-separador">
          <img src={sprite} alt={p.pokemon_apodo}
            className="poke-hop-sprite w-full h-full object-contain"
            onError={e => { e.target.style.opacity = '0.2' }} />
        </div>
        <TerrenoPiso terreno={p.personaje_pokemon_terreno} width={31} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-texto text-[7px] truncate">{p.pokemon_apodo}</p>
        <HpBar cur={p.pokemon_current_hp} max={p.pokemon_hp} showNumbers={!hideHp} />
        {/* Debajo de la barra: junto al nombre no cabía más con el sprite y
            los MiniStat al lado. */}
        <EstadosChips estados={p.personaje_pokemon_estados} size="chico" />
      </div>
      <div className="flex flex-col gap-0.5 shrink-0">
        <MiniStat label="EXH"  value={p.personaje_pokemon_exahust_lvl} />
        <MiniStat label="DSTS" value={p.personaje_pokemon_dsts} tone="green" />
        <MiniStat label="DSTF" value={p.personaje_pokemon_dstf} tone="red" />
      </div>
    </div>
  )
}

/* Tarjeta de un jugador + su Pokémon invocado (estilo party, reutilizable).
   Mismo criterio que PartyPokemon: 30% más chico y luego otro 10% más,
   salvo los estados. */
export function PlayerCard({ char: c, pres, invId, hideHp, onCharClick, onPokemonClick, turno = null }) {
  const pct = hpPct(c.personaje_current_hp, c.personaje_hp)
  const initials = (pres?.user_name ?? '?').slice(0, 2).toUpperCase()
  const pokemon = invId != null
    ? (c.pokemons || []).find(p => String(p.id_personaje_pokemon) === String(invId))
    : null
  // Turno de este jugador: el anillo va en el entrenador o en el Pokémon con
  // el que tiró la iniciativa
  const suyo = turno && String(turno.personaje_id) === String(c.id_personaje)
  const turnoPokemon = suyo && turno.personaje_pokemon_id != null
  const turnoEntrenador = suyo && !turnoPokemon
  return (
    <div className="bg-superficie border border-separador rounded-[7px] p-[7px]">
      <div className="flex items-stretch gap-[5px] overflow-x-auto p-1 -m-1">
        <div onClick={onCharClick ? () => onCharClick(c) : undefined}
          title={onCharClick ? 'Ver ficha del personaje' : undefined}
          className={`relative flex items-center gap-[5px] rounded-[7px] p-[5px] border border-separador shrink-0 w-[151px] ${bleedClass(pct)}
            ${turnoEntrenador ? 'animate-turno-anillo' : ''}
            ${onCharClick ? 'cursor-pointer hover:ring-2 hover:ring-tinte/60 transition-shadow' : ''}`}>
          <NumerosFlotantes valor={c.personaje_current_hp} mostrarNumero={!hideHp} />
          <div className="flex flex-col items-center gap-[2px] shrink-0">
          <div className="relative">
            {/* El aura va afuera del círculo: el círculo recorta con
                overflow-hidden y se comería el resplandor, que es más
                grande que el avatar a propósito. */}
            {c.personaje_inspirado && <AuraInspirado size={31} />}
            <div className="relative w-[31px] h-[31px] rounded-full overflow-hidden border border-separador bg-relleno-2 flex items-center justify-center">
              {pres?.avatar_face_url
                ? <img src={pres.avatar_face_url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                : <span className="text-[9px] font-black text-texto-2">{initials}</span>}
            </div>
          </div>
          <TerrenoPiso terreno={c.personaje_terreno} width={31} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-texto text-[9px] truncate">{c.nombre_personaje || 'Sin nombre'}</p>
            <HpBar cur={c.personaje_current_hp} max={c.personaje_hp} showNumbers={!hideHp} />
            {/* Debajo de la barra: junto al nombre no cabía más con el avatar
                y los MiniStat al lado. */}
            <EstadosChips estados={c.personaje_estados} size="chico" />
          </div>
          <div className="flex flex-col gap-0.5 shrink-0">
            <MiniStat label="EXH"  value={c.personaje_exahust_lvl} />
            <MiniStat label="DSTS" value={c.personaje_dsts} tone="green" />
            <MiniStat label="DSTF" value={c.personaje_dstf} tone="red" />
          </div>
        </div>
        {pokemon && <PartyPokemon p={pokemon} hideHp={hideHp}
          enTurno={turnoPokemon && String(turno.personaje_pokemon_id) === String(pokemon.id_personaje_pokemon)}
          onClick={onPokemonClick ? () => onPokemonClick(c, pokemon) : undefined} />}
      </div>
    </div>
  )
}

export default function PartyPanel({ partidaId, presentes, selfUserId, partyVersion, hideHp, invocados = {}, onClose, onCharClick, onPokemonClick, turno = null }) {
  const [chars, setChars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/personaje/party?id_partida=${partidaId}`)
      .then(r => r.json())
      .then(d => setChars(Array.isArray(d) ? d : []))
      .catch(() => setChars([]))
      .finally(() => setLoading(false))
    // partyVersion cambia cuando otro jugador actualiza sus stats → re-consulta en vivo
  }, [partidaId, partyVersion])

  // Jugadores conectados (con personaje activo), excepto quien consulta. Deduplicado por personaje.
  const byId = new Map(chars.map(c => [String(c.id_personaje), c]))
  const seen = new Set()
  const visibles = []
  for (const pr of presentes) {
    if (String(pr.user_id) === String(selfUserId)) continue
    if (pr.personaje_id == null) continue
    const key = String(pr.personaje_id)
    if (seen.has(key)) continue
    const c = byId.get(key)
    if (!c) continue
    seen.add(key)
    visibles.push({ char: c, pres: pr })
  }

  // Hasta que llega la party no se pinta la ventana, solo la pokébola girando:
  // igual que al cambiar de panel de combate. Abrirla vacía para rellenarla un
  // segundo después se veía como un salto.
  //
  // Solo en la primera carga. Las re-consultas por partyVersion no vuelven a
  // levantar `loading`, así que la ventana no parpadea cada vez que otro
  // jugador cambia algo.
  //
  // Aquí sí se puede cerrar desde el fondo: es la única salida si la petición
  // se queda colgada, porque no hay nada debajo a lo que volver.
  if (loading) return <LoadingOverlay label="Party" onClose={onClose} z="z-[70]" />

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-3xl max-h-[88vh] flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-3 border-b border-separador flex items-center justify-between shrink-0">
          <h3 className="font-black text-white text-lg flex items-center gap-2"><Users size={18} /> Party</h3>
          <button onClick={onClose} aria-label="Cerrar" className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2 hover:text-texto shrink-0 disabled:opacity-40"><X size={16} strokeWidth={2.4} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visibles.length === 0 ? (
            <p className="text-center text-texto-2 text-sm py-10">No hay otros jugadores conectados.</p>
          ) : visibles.map(({ char: c, pres }) => {
            const key = String(c.id_personaje)
            const invId = key in invocados ? invocados[key] : pres.pokemon_invocado
            return <PlayerCard key={c.id_personaje} char={c} pres={pres} invId={invId} hideHp={hideHp} turno={turno}
              onCharClick={onCharClick} onPokemonClick={onPokemonClick} />
          })}
        </div>
      </div>
    </div>
  )
}

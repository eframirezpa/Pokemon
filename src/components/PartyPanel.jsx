import { useState, useEffect } from 'react'
import { X, Users } from 'lucide-react'
import { apiFetch } from '../api'
import { EstadosChips } from './EstadosControl'
import { AuraInspirado } from './InspiradoAura'
import LoadingOverlay from './LoadingOverlay'

const hpPct   = (cur, max) => Math.max(0, Math.min(100, Math.round(((cur ?? max ?? 0) / (max || 1)) * 100)))
const hpColor = pct => (pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444')
// Mismo efecto que el Pokémon del master cuando le baja la vida
const bleedClass = pct => (pct <= 20 ? 'animate-bleed-red' : pct <= 50 ? 'animate-bleed-yellow' : 'bg-gray-100')

/* Cajitas de estado: EXH (neutro), DSTS (verde), DSTF (rojo) */
function MiniStat({ label, value, tone }) {
  const cls = tone === 'green'
    ? 'border-green-600 bg-green-100 text-green-700'
    : tone === 'red'
      ? 'border-red-600 bg-red-100 text-red-700'
      : 'border-gray-400 bg-white text-gray-900'
  return (
    <div className={`border rounded px-1 py-0.5 text-center leading-none ${cls}`}>
      <p className="text-[5px] font-black uppercase">{label}</p>
      <p className="text-[8px] font-black">{value ?? 0}</p>
    </div>
  )
}

function HpBar({ cur, max, showNumbers = true }) {
  const c = cur ?? max
  const pct = hpPct(cur, max)
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <span className="text-[6px] font-black text-amber-600">HP</span>
        <div className="flex-1 h-1.5 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
          <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
        </div>
      </div>
      {/* Los trainers ven la barra y su color, pero no los hit points */}
      {showNumbers && <p className="text-right text-[6px] font-bold text-gray-700 leading-none mt-0.5">{c}/{max}</p>}
    </div>
  )
}

/* Tarjeta de un Pokémon del cinturón (estilo del Pokémon que invoca el master).
   Todo un 30% más chico que el tamaño original -tarjeta, letras, iconos-,
   menos los estados: esos EstadosChips de abajo siguen en su tamaño de
   siempre, a propósito. */
function PartyPokemon({ p, hideHp, onClick }) {
  const pct    = hpPct(p.pokemon_current_hp, p.pokemon_hp)
  const sprite = (p.pokemon_is_shiny && p.pokemon_media_sprite_shiny)
    ? p.pokemon_media_sprite_shiny
    : (p.pokemon_media_sprite || p.pokemon_media_main)
  return (
    <div onClick={onClick} title={onClick ? 'Ver detalle del Pokémon' : undefined}
      className={`flex items-center gap-1.5 border border-gray-700 rounded-lg p-1.5 shrink-0 w-[168px] ${bleedClass(pct)}
        ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 transition-shadow' : ''}`}>
      <img src={sprite} alt={p.pokemon_apodo}
        className="w-[34px] h-[34px] object-contain bg-white rounded-md shrink-0 border border-gray-300"
        onError={e => { e.target.style.opacity = '0.2' }} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-[8px] truncate">{p.pokemon_apodo}</p>
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
   Mismo criterio que PartyPokemon: todo un 30% más chico salvo los estados. */
export function PlayerCard({ char: c, pres, invId, hideHp, onCharClick, onPokemonClick }) {
  const pct = hpPct(c.personaje_current_hp, c.personaje_hp)
  const initials = (pres?.user_name ?? '?').slice(0, 2).toUpperCase()
  const pokemon = invId != null
    ? (c.pokemons || []).find(p => String(p.id_personaje_pokemon) === String(invId))
    : null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2">
      <div className="flex items-stretch gap-1.5 overflow-x-auto">
        <div onClick={onCharClick ? () => onCharClick(c) : undefined}
          title={onCharClick ? 'Ver ficha del personaje' : undefined}
          className={`flex items-center gap-1.5 rounded-lg p-1.5 border border-gray-700 shrink-0 w-[168px] ${bleedClass(pct)}
            ${onCharClick ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 transition-shadow' : ''}`}>
          <div className="relative shrink-0">
            {/* El aura va afuera del círculo: el círculo recorta con
                overflow-hidden y se comería el resplandor, que es más
                grande que el avatar a propósito. */}
            {c.personaje_inspirado && <AuraInspirado size={34} />}
            <div className="relative w-[34px] h-[34px] rounded-full overflow-hidden border border-gray-300 bg-gray-200 flex items-center justify-center">
              {pres?.avatar_face_url
                ? <img src={pres.avatar_face_url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                : <span className="text-[10px] font-black text-gray-600">{initials}</span>}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-[10px] truncate">{c.nombre_personaje || 'Sin nombre'}</p>
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
          onClick={onPokemonClick ? () => onPokemonClick(c, pokemon) : undefined} />}
      </div>
    </div>
  )
}

export default function PartyPanel({ partidaId, presentes, selfUserId, partyVersion, hideHp, invocados = {}, onClose, onCharClick, onPokemonClick }) {
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-gray-700">
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h3 className="font-black text-white text-lg flex items-center gap-2"><Users size={18} /> Party</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visibles.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-10">No hay otros jugadores conectados.</p>
          ) : visibles.map(({ char: c, pres }) => {
            const key = String(c.id_personaje)
            const invId = key in invocados ? invocados[key] : pres.pokemon_invocado
            return <PlayerCard key={c.id_personaje} char={c} pres={pres} invId={invId} hideHp={hideHp}
              onCharClick={onCharClick} onPokemonClick={onPokemonClick} />
          })}
        </div>
      </div>
    </div>
  )
}

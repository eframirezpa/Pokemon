import { useState, useEffect } from 'react'
import { X, Users } from 'lucide-react'
import { apiFetch } from '../api'

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
    <div className={`border rounded-md px-1.5 py-0.5 text-center leading-none ${cls}`}>
      <p className="text-[7px] font-black uppercase">{label}</p>
      <p className="text-[11px] font-black">{value ?? 0}</p>
    </div>
  )
}

function HpBar({ cur, max }) {
  const c = cur ?? max
  const pct = hpPct(cur, max)
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] font-black text-amber-600">HP</span>
        <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden border border-gray-400">
          <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: hpColor(pct) }} />
        </div>
      </div>
      <p className="text-right text-[9px] font-bold text-gray-700 leading-none mt-0.5">{c}/{max}</p>
    </div>
  )
}

/* Tarjeta de un Pokémon del cinturón (estilo del Pokémon que invoca el master) */
function PartyPokemon({ p, hideHp }) {
  const pct    = hpPct(p.pokemon_current_hp, p.pokemon_hp)
  const sprite = (p.pokemon_is_shiny && p.pokemon_media_sprite_shiny)
    ? p.pokemon_media_sprite_shiny
    : (p.pokemon_media_sprite || p.pokemon_media_main)
  return (
    <div className={`flex items-center gap-2 border-2 border-gray-700 rounded-xl p-2 shrink-0 w-60 ${bleedClass(pct)}`}>
      <img src={sprite} alt={p.pokemon_apodo}
        className="w-12 h-12 object-contain bg-white rounded-lg shrink-0 border border-gray-300"
        onError={e => { e.target.style.opacity = '0.2' }} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-xs truncate">{p.pokemon_apodo}</p>
        {!hideHp && <HpBar cur={p.pokemon_current_hp} max={p.pokemon_hp} />}
      </div>
      <div className="flex flex-col gap-0.5 shrink-0">
        <MiniStat label="EXH"  value={p.personaje_pokemon_exahust_lvl} />
        <MiniStat label="DSTS" value={p.personaje_pokemon_dsts} tone="green" />
        <MiniStat label="DSTF" value={p.personaje_pokemon_dstf} tone="red" />
      </div>
    </div>
  )
}

export default function PartyPanel({ partidaId, presentes, selfUserId, partyVersion, hideHp, invocados = {}, onClose }) {
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-gray-700">
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h3 className="font-black text-white text-lg flex items-center gap-2"><Users size={18} /> Party</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-center text-gray-500 text-sm py-10">Cargando…</p>
          ) : visibles.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-10">No hay otros jugadores conectados.</p>
          ) : visibles.map(({ char: c, pres }) => {
            const pct = hpPct(c.personaje_current_hp, c.personaje_hp)
            const initials = (pres.user_name ?? '?').slice(0, 2).toUpperCase()
            return (
              <div key={c.id_personaje} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                <div className="flex items-stretch gap-2 overflow-x-auto">
                  {/* Jugador */}
                  <div className={`flex items-center gap-2 rounded-xl p-2 border-2 border-gray-700 shrink-0 w-60 ${bleedClass(pct)}`}>
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-300 bg-gray-200 shrink-0 flex items-center justify-center">
                      {pres.avatar_face_url
                        ? <img src={pres.avatar_face_url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                        : <span className="text-sm font-black text-gray-600">{initials}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{c.nombre_personaje || 'Sin nombre'}</p>
                      {!hideHp && <HpBar cur={c.personaje_current_hp} max={c.personaje_hp} />}
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <MiniStat label="EXH"  value={c.personaje_exahust_lvl} />
                      <MiniStat label="DSTS" value={c.personaje_dsts} tone="green" />
                      <MiniStat label="DSTF" value={c.personaje_dstf} tone="red" />
                    </div>
                  </div>

                  {/* Pokémon invocado (misma línea) */}
                  {(() => {
                    const invId = invocados[String(c.id_personaje)] ?? pres.pokemon_invocado
                    return (c.pokemons || [])
                      .filter(p => String(p.id_personaje_pokemon) === String(invId))
                      .map(p => <PartyPokemon key={p.id_personaje_pokemon} p={p} hideHp={hideHp} />)
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Sparkles, ChevronRight, ExternalLink } from 'lucide-react'
import { apiFetch } from '../api'

/* ── helpers (mismos que PokemonDetail) ── */
const TYPE_COLORS = {
  Normal:   { bg: '#A8A878', dark: false }, Fire:     { bg: '#F08030', dark: false },
  Water:    { bg: '#6890F0', dark: false }, Grass:    { bg: '#78C850', dark: false },
  Electric: { bg: '#F8D030', dark: true  }, Ice:      { bg: '#98D8D8', dark: true  },
  Fighting: { bg: '#C03028', dark: false }, Poison:   { bg: '#A040A0', dark: false },
  Ground:   { bg: '#E0C068', dark: true  }, Flying:   { bg: '#A890F0', dark: false },
  Psychic:  { bg: '#F85888', dark: false }, Bug:      { bg: '#A8B820', dark: false },
  Rock:     { bg: '#B8A038', dark: false }, Ghost:    { bg: '#705898', dark: false },
  Dragon:   { bg: '#7038F8', dark: false }, Dark:     { bg: '#705848', dark: false },
  Steel:    { bg: '#B8B8D0', dark: true  }, Fairy:    { bg: '#EE99AC', dark: true  },
}
const typeBg = t => TYPE_COLORS[t] ?? { bg: '#888', dark: false }
const splitList = s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : []
const slugToTitle = s => s ? s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''
const statMod = v => { const m = Math.floor((v - 10) / 2); return m >= 0 ? `+${m}` : `${m}` }
const genderLabel = r => {
  if (!r) return 'Desconocido'
  const [f, m] = r.split(':').map(Number)
  if (!m) return 'Sin género'
  const fp = Math.round((f / (f + m)) * 100)
  return `♀ ${fp}%  ♂ ${100 - fp}%`
}

function TypeBadge({ type }) {
  const c = typeBg(type)
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: c.bg, color: c.dark ? '#374151' : '#fff' }}>
      {type}
    </span>
  )
}

function StatBox({ label, val }) {
  return (
    <div className="flex flex-col items-center min-w-[2.5rem]">
      <span className="text-[10px] font-black uppercase text-[#7A200D] tracking-wider">{label}</span>
      <span className="text-base font-bold text-gray-900 leading-tight">{val}</span>
      <span className="text-xs text-gray-600">{statMod(val)}</span>
    </div>
  )
}

function TypeRow({ label, types }) {
  if (!types?.length) return null
  return (
    <div className="flex flex-wrap items-start gap-x-2 gap-y-1 py-0.5">
      <span className="text-xs font-semibold text-[#7A200D] uppercase tracking-wide min-w-[6rem] shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">{types.map(t => <TypeBadge key={t} type={t} />)}</div>
    </div>
  )
}

function MovesSection({ title, moveNames, movesMap }) {
  const [open, setOpen] = useState(false)
  if (!moveNames?.length) return null
  const moves = moveNames.map(n => movesMap[n.toLowerCase()]).filter(Boolean)
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-[#7A200D] text-white text-xs font-bold uppercase tracking-wider rounded-t">
        {title}
        <ChevronRight size={13} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border border-[#d4a96a]/60 border-t-0 rounded-b overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#f5e6c8]">
              <tr className="text-[#7A200D] font-semibold text-[10px] uppercase">
                <th className="py-1 px-2 text-left">Nombre</th>
                <th className="py-1 px-2 text-left">Tipo</th>
                <th className="py-1 px-2 text-center">PP</th>
                <th className="py-1 px-2 text-left">Tiempo</th>
                <th className="py-1 px-2 text-left">Rango</th>
              </tr>
            </thead>
            <tbody className="bg-[#FDF1DC]">
              {moves.length > 0 ? moves.map(m => {
                const c = typeBg(m.moves_move_type)
                return (
                  <tr key={m.move_id} className="border-b border-gray-100 hover:bg-amber-50/50">
                    <td className="py-1 px-2 font-medium text-gray-800">{m.moves_move_name}</td>
                    <td className="py-1 px-2">
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: c.bg, color: c.dark ? '#374151' : '#fff' }}>
                        {m.moves_move_type}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-center text-gray-500">{m.moves_move_pp}</td>
                    <td className="py-1 px-2 text-gray-500">{m.moves_move_time}</td>
                    <td className="py-1 px-2 text-gray-500">{m.moves_move_range}</td>
                  </tr>
                )
              }) : moveNames.map(n => (
                <tr key={n} className="border-b border-gray-100">
                  <td className="py-1 px-2 text-gray-600 italic">{n}</td><td colSpan={4} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TmSection({ tmNumbers, tmsMap }) {
  const [open, setOpen] = useState(false)
  if (!tmNumbers?.length) return null
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-[#7A200D] text-white text-xs font-bold uppercase tracking-wider rounded-t">
        TMs ({tmNumbers.length})
        <ChevronRight size={13} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border border-[#d4a96a]/60 border-t-0 rounded-b bg-[#FDF1DC] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#f5e6c8]">
              <tr className="text-[#7A200D] font-semibold text-[10px] uppercase">
                <th className="py-1 px-2 text-left">TM</th>
                <th className="py-1 px-2 text-left">Nombre</th>
                <th className="py-1 px-2 text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              {tmNumbers.map(n => {
                const tm = tmsMap[n]
                return (
                  <tr key={n} className="border-b border-[#d4a96a]/30 hover:bg-amber-50/50">
                    <td className="py-1 px-2 font-bold text-[#7A200D]">TM{String(n).padStart(2,'0')}</td>
                    <td className="py-1 px-2 text-gray-800">{tm ? slugToTitle(tm.tm_name_id) : '—'}</td>
                    <td className="py-1 px-2 text-gray-500 text-right tabular-nums">
                      {tm?.tm_cost ? `${tm.tm_cost.toLocaleString()} po` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── main component ── */
export default function PokemonDetailPanel({ id, onClose }) {
  const navigate  = useNavigate()
  const [pk,       setPk]      = useState(null)
  const [evols,    setEvols]   = useState([])
  const [abilities,setAbils]   = useState({})
  const [movesMap, setMoves]   = useState({})
  const [tmsMap,   setTms]     = useState({})
  const [shiny,    setShiny]   = useState(false)
  const [loading,  setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true); setShiny(false)
    Promise.all([
      apiFetch(`/pokemon/${id}`).then(r => r.json()),
      apiFetch(`/evolution/pokemon/${id}`).then(r => r.json()),
      apiFetch('/moves?limit=1000').then(r => r.json()),
      apiFetch('/tm?limit=200').then(r => r.json()),
    ]).then(([pkData, evolData, movData, tmData]) => {
      setPk(pkData)
      setEvols(evolData.value ?? [])
      const mm = {}
      for (const m of (movData.data ?? [])) mm[m.moves_move_name.toLowerCase()] = m
      setMoves(mm)
      const tm = {}
      for (const t of (tmData.data ?? [])) tm[t.tm_number] = t
      setTms(tm)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!pk) return
    const ids = [pk.pokemon_ability_1, pk.pokemon_ability_2, pk.pokemon_ability_3, pk.pokemon_ability_4].filter(Boolean)
    if (!ids.length) return
    Promise.all(ids.map(aid => apiFetch(`/abilities/${aid}`).then(r => r.json())))
      .then(res => { const m = {}; res.forEach(a => { m[a.ability_id] = a }); setAbils(m) })
      .catch(() => {})
  }, [pk])

  if (loading) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm animate-pulse">Cargando...</div>
    </div>
  )

  if (!pk || pk.error) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <span className="text-sm text-gray-500">No encontrado</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
      </div>
    </div>
  )

  const speeds = [
    pk.pokemon_speed_1_name && `${pk.pokemon_speed_1_value} ${pk.pokemon_speed_1_name}`,
    pk.pokemon_speed_2_name && `${pk.pokemon_speed_2_value} ${pk.pokemon_speed_2_name}`,
  ].filter(Boolean).join(' · ')

  const vulns = splitList(pk.pokemon_vulnerabilities)
  const resis = splitList(pk.pokemon_resistances)
  const immun = splitList(pk.pokemon_immunities)
  const tmNumbers = splitList(pk.pokemon_moves_tm).map(Number).filter(n => !isNaN(n))
  const abilityEntries = [
    pk.pokemon_ability_1 && { id: pk.pokemon_ability_1, hidden: !!pk.pokemon_ability_1_is_hidden },
    pk.pokemon_ability_2 && { id: pk.pokemon_ability_2, hidden: !!pk.pokemon_ability_2_is_hidden },
    pk.pokemon_ability_3 && { id: pk.pokemon_ability_3, hidden: !!pk.pokemon_ability_3_is_hidden },
    pk.pokemon_ability_4 && { id: pk.pokemon_ability_4, hidden: !!pk.pokemon_ability_4_is_hidden },
  ].filter(Boolean)

  const mainImg = shiny ? pk.pokemon_media_main_shiny : pk.pokemon_media_main

  return (
    <div className="flex flex-col h-full">
      {/* ── sticky header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-gray-900 truncate">{pk.pokemon_name}</span>
          <span className="text-xs text-gray-400 font-mono shrink-0">
            #{String(pk.pokemon_number).padStart(4,'0')}
          </span>
          {pk.pokemon_type_1 && <TypeBadge type={pk.pokemon_type_1} />}
          {pk.pokemon_type_2 && <TypeBadge type={pk.pokemon_type_2} />}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={() => navigate(`/pokemon/${id}`)}
            className="text-gray-400 hover:text-red-600 p-1 transition-colors" title="Ver página completa">
            <ExternalLink size={16} />
          </button>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 transition-colors" title="Cerrar">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Image + shiny */}
        <div className="flex flex-col items-center gap-2 py-4 bg-gray-50 border-b border-gray-100">
          <img src={mainImg} alt={pk.pokemon_name}
            className="w-32 h-32 object-contain"
            onError={e => { e.target.style.opacity = '0.2' }} />
          {pk.pokemon_media_main_shiny && (
            <button onClick={() => setShiny(s => !s)}
              className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition-all ${
                shiny ? 'bg-yellow-400 border-yellow-500 text-yellow-900 font-semibold'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-400'}`}>
              <Sparkles size={11} /> Shiny
            </button>
          )}
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            {[
              ['Talla',      pk.pokemon_size],
              ['SR',         pk.pokemon_sr],
              ['Nivel mín.', pk.pokemon_min_level],
              ['Grupo huevo',pk.pokemon_egg_group],
              ['Género',     genderLabel(pk.pokemon_gender)],
              ['Bioma',      pk.pokemon_habitat_biomes],
            ].filter(([,v]) => v).map(([l, v]) => (
              <div key={l} className="flex justify-between py-0.5 border-b border-gray-100 col-span-1">
                <span className="text-[#7A200D] font-semibold uppercase tracking-wide text-[10px]">{l}</span>
                <span className="text-gray-700 text-right">{v}</span>
              </div>
            ))}
          </div>

          {/* Flavor text */}
          {pk.pokemon_description && (
            <p className="text-xs text-gray-500 italic leading-relaxed border-l-2 border-amber-300 pl-3">
              "{pk.pokemon_description}"
            </p>
          )}

          {/* D&D Stat block */}
          <div className="rounded-lg overflow-hidden"
            style={{ borderTop: '5px solid #9C6E1B', borderBottom: '5px solid #9C6E1B', backgroundColor: '#FDF1DC' }}>
            <div className="px-4 pt-3 pb-1">
              <h2 className="text-lg font-black text-[#7A200D]">{pk.pokemon_name}</h2>
              <p className="text-xs text-gray-600">{pk.pokemon_size} Pokémon</p>
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-1.5 space-y-0.5 text-xs">
              <p><span className="font-bold text-[#7A200D]">Clase de Armadura</span> {pk.pokemon_armor_class}</p>
              <p><span className="font-bold text-[#7A200D]">Puntos de Golpe</span> {pk.pokemon_hit_points} ({pk.pokemon_hit_dice})</p>
              <p><span className="font-bold text-[#7A200D]">Velocidad</span> {speeds || '—'}</p>
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-2 flex justify-around">
              {[['STR',pk.pokemon_str],['DEX',pk.pokemon_dex],['CON',pk.pokemon_con],
                ['INT',pk.pokemon_int],['WIS',pk.pokemon_wis],['CHA',pk.pokemon_cha]]
                .map(([l,v]) => <StatBox key={l} label={l} val={v} />)}
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-1.5 space-y-0.5 text-xs">
              {pk.pokemon_saving_throws && (
                <p><span className="font-bold text-[#7A200D]">Tiradas de Salvación</span> {pk.pokemon_saving_throws}</p>
              )}
              {pk.pokemon_proficient_skills && (
                <p><span className="font-bold text-[#7A200D]">Competencias</span> {pk.pokemon_proficient_skills}</p>
              )}
              {pk.pokemon_sense_1_name && (
                <p><span className="font-bold text-[#7A200D]">Sentidos</span> {pk.pokemon_sense_1_name} {pk.pokemon_sense_1_value}</p>
              )}
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-1.5 space-y-1">
              {vulns.length > 0 && <TypeRow label="Vulnerabilidades" types={vulns} />}
              {resis.length > 0 && <TypeRow label="Resistencias"     types={resis} />}
              {immun.length > 0 && <TypeRow label="Inmunidades"      types={immun} />}
            </div>
          </div>

          {/* Abilities */}
          {abilityEntries.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Habilidades</h3>
              <div className="space-y-2">
                {abilityEntries.map(({ id: aid, hidden }) => {
                  const ab = abilities[aid]
                  return (
                    <div key={aid} className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-gray-800">{ab ? ab.ability_name : `#${aid}`}</span>
                        {hidden && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">Oculta</span>}
                      </div>
                      {ab?.ability_description && <p className="text-xs text-gray-500 leading-relaxed">{ab.ability_description}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Evolutions */}
          {evols.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Evolución</h3>
              <div className="flex flex-wrap gap-3">
                {evols.map(ev => (
                  <div key={ev.evolution_id} className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl px-3 py-2">
                    <div className="flex flex-col items-center">
                      <img src={ev.from_sprite} alt={ev.from_name} className="w-8 h-8 object-contain" />
                      <span className="text-[10px] text-gray-500">{ev.from_name}</span>
                    </div>
                    <div className="flex flex-col items-center px-1 text-[10px] text-gray-400">
                      <ChevronRight size={12} className="text-[#7A200D]" />
                      <span className="capitalize">{ev.evolution_condition_1_type}</span>
                      <span className="font-semibold text-gray-600">{ev.evolution_condition_1_value}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <img src={ev.to_sprite} alt={ev.to_name} className="w-8 h-8 object-contain" />
                      <span className="text-[10px] text-gray-500">{ev.to_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moves */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Movimientos</h3>
            <MovesSection title="Inicio"   moveNames={splitList(pk.pokemon_moves_start)}   movesMap={movesMap} />
            <MovesSection title="Nivel 2"  moveNames={splitList(pk.pokemon_moves_level2)}  movesMap={movesMap} />
            <MovesSection title="Nivel 6"  moveNames={splitList(pk.pokemon_moves_level6)}  movesMap={movesMap} />
            <MovesSection title="Nivel 10" moveNames={splitList(pk.pokemon_moves_level10)} movesMap={movesMap} />
            <MovesSection title="Nivel 14" moveNames={splitList(pk.pokemon_moves_level14)} movesMap={movesMap} />
            <MovesSection title="Nivel 18" moveNames={splitList(pk.pokemon_moves_level18)} movesMap={movesMap} />
            <MovesSection title="Huevo"    moveNames={splitList(pk.pokemon_moves_egg)}     movesMap={movesMap} />
            <TmSection tmNumbers={tmNumbers} tmsMap={tmsMap} />
          </div>
        </div>
      </div>
    </div>
  )
}

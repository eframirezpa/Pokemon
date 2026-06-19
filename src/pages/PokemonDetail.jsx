import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, ChevronRight } from 'lucide-react'
import { apiFetch } from '../api'

/* ─────────────────── helpers ─────────────────── */
const TYPE_COLORS = {
  Normal:   { bg: '#A8A878', dark: false },
  Fire:     { bg: '#F08030', dark: false },
  Water:    { bg: '#6890F0', dark: false },
  Grass:    { bg: '#78C850', dark: false },
  Electric: { bg: '#F8D030', dark: true  },
  Ice:      { bg: '#98D8D8', dark: true  },
  Fighting: { bg: '#C03028', dark: false },
  Poison:   { bg: '#A040A0', dark: false },
  Ground:   { bg: '#E0C068', dark: true  },
  Flying:   { bg: '#A890F0', dark: false },
  Psychic:  { bg: '#F85888', dark: false },
  Bug:      { bg: '#A8B820', dark: false },
  Rock:     { bg: '#B8A038', dark: false },
  Ghost:    { bg: '#705898', dark: false },
  Dragon:   { bg: '#7038F8', dark: false },
  Dark:     { bg: '#705848', dark: false },
  Steel:    { bg: '#B8B8D0', dark: true  },
  Fairy:    { bg: '#EE99AC', dark: true  },
}

function typeBg(type) {
  return TYPE_COLORS[type] ?? { bg: '#888', dark: false }
}

function TypeBadge({ type }) {
  const c = typeBg(type)
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide"
      style={{ backgroundColor: c.bg, color: c.dark ? '#374151' : '#fff' }}
    >
      {type}
    </span>
  )
}

function statMod(val) {
  const m = Math.floor((val - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function splitList(str) {
  if (!str) return []
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

function genderLabel(ratio) {
  if (!ratio) return 'Desconocido'
  const [f, m] = ratio.split(':').map(Number)
  if (!m) return 'Sin género'
  const femPct = Math.round((f / (f + m)) * 100)
  return `♀ ${femPct}%  ♂ ${100 - femPct}%`
}

/* ─────────────────── sub-components ─────────────────── */
function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-1 border-b border-[#d4a96a]/40 last:border-0">
      <span className="text-xs font-semibold text-[#7A200D] uppercase tracking-wide">{label}</span>
      <span className="text-xs text-gray-700 text-right">{value}</span>
    </div>
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
  if (!types || types.length === 0) return null
  return (
    <div className="flex flex-wrap items-start gap-x-2 gap-y-1 py-0.5">
      <span className="text-xs font-semibold text-[#7A200D] uppercase tracking-wide min-w-[6rem] shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {types.map(t => <TypeBadge key={t} type={t} />)}
      </div>
    </div>
  )
}

function MoveRow({ move }) {
  if (!move) return null
  const c = typeBg(move.move_type)
  return (
    <tr className="border-b border-gray-100 hover:bg-amber-50/50 text-xs">
      <td className="py-1.5 px-3 font-medium text-gray-800">{move.move_name}</td>
      <td className="py-1.5 px-2">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ backgroundColor: c.bg, color: c.dark ? '#374151' : '#fff' }}
        >
          {move.move_type}
        </span>
      </td>
      <td className="py-1.5 px-2 text-gray-500">{move.move_power_1 ?? '—'}</td>
      <td className="py-1.5 px-2 text-gray-500 text-center">{move.move_pp}</td>
      <td className="py-1.5 px-2 text-gray-500">{move.move_time}</td>
      <td className="py-1.5 px-2 text-gray-500">{move.move_range}</td>
    </tr>
  )
}

function MovesSection({ title, moveNames, movesMap }) {
  const [open, setOpen] = useState(false)
  if (!moveNames || moveNames.length === 0) return null
  const moves = moveNames.map(n => movesMap[n.toLowerCase()]).filter(Boolean)

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#7A200D] text-white text-xs font-bold uppercase tracking-wider rounded-t"
      >
        {title}
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border border-[#d4a96a]/60 border-t-0 rounded-b overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#f5e6c8]">
              <tr className="text-[#7A200D] font-semibold text-[10px] uppercase">
                <th className="py-1.5 px-3 text-left">Nombre</th>
                <th className="py-1.5 px-2 text-left">Tipo</th>
                <th className="py-1.5 px-2 text-left">Power</th>
                <th className="py-1.5 px-2 text-center">PP</th>
                <th className="py-1.5 px-2 text-left">Tiempo</th>
                <th className="py-1.5 px-2 text-left">Rango</th>
              </tr>
            </thead>
            <tbody className="bg-[#FDF1DC]">
              {moves.length > 0
                ? moves.map(m => <MoveRow key={m.move_id} move={m} />)
                : moveNames.map(n => (
                  <tr key={n} className="border-b border-gray-100 text-xs">
                    <td className="py-1.5 px-3 text-gray-600 italic">{n}</td>
                    <td colSpan={5} />
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function slugToTitle(slug) {
  if (!slug) return ''
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function TmSection({ tmNumbers, tmsMap }) {
  const [open, setOpen] = useState(false)
  if (!tmNumbers || tmNumbers.length === 0) return null
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#7A200D] text-white text-xs font-bold uppercase tracking-wider rounded-t"
      >
        TMs ({tmNumbers.length})
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border border-[#d4a96a]/60 border-t-0 rounded-b bg-[#FDF1DC] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#f5e6c8]">
              <tr className="text-[#7A200D] font-semibold text-[10px] uppercase">
                <th className="py-1.5 px-3 text-left">TM</th>
                <th className="py-1.5 px-3 text-left">Nombre</th>
                <th className="py-1.5 px-3 text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              {tmNumbers.map(n => {
                const tm = tmsMap[n]
                return (
                  <tr key={n} className="border-b border-[#d4a96a]/30 hover:bg-amber-50/50">
                    <td className="py-1.5 px-3 font-bold text-[#7A200D]">TM{String(n).padStart(2, '0')}</td>
                    <td className="py-1.5 px-3 text-gray-800">
                      {tm ? slugToTitle(tm.tm_name_id) : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-gray-500 text-right tabular-nums">
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

function EvolutionChain({ evolutions, onNavigate }) {
  if (!evolutions || evolutions.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-[10px] font-black uppercase text-[#7A200D] tracking-wider mb-2">Evolución</p>
      <div className="flex flex-col gap-2">
        {evolutions.map(ev => (
          <div key={ev.evolution_id} className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(ev.evolution_from_pokemon_id)}
              className="flex flex-col items-center hover:opacity-80 transition-opacity"
            >
              <img src={ev.from_sprite} alt={ev.from_name} className="w-10 h-10 object-contain" />
              <span className="text-[10px] text-gray-600">{ev.from_name}</span>
            </button>
            <div className="flex flex-col items-center text-[10px] text-gray-500 px-1">
              <ChevronRight size={14} className="text-[#7A200D]" />
              <span className="capitalize">{ev.evolution_condition_1_type}</span>
              <span className="font-semibold">{ev.evolution_condition_1_value}</span>
            </div>
            <button
              onClick={() => onNavigate(ev.evolution_to_pokemon_id)}
              className="flex flex-col items-center hover:opacity-80 transition-opacity"
            >
              <img src={ev.to_sprite} alt={ev.to_name} className="w-10 h-10 object-contain" />
              <span className="text-[10px] text-gray-600">{ev.to_name}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────── main page ─────────────────── */
export default function PokemonDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [pk,    setPk]        = useState(null)
  const [evols, setEvols]     = useState([])
  const [abilities, setAbils] = useState({})
  const [movesMap, setMovesMap] = useState({})
  const [tmsMap,  setTmsMap]  = useState({})
  const [shiny, setShiny]     = useState(false)
  const [loading, setLoading] = useState(true)

  /* scroll al top cada vez que cambia el pokémon */
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [id])

  /* fetch pokemon + evolutions + moves + tms in parallel */
  useEffect(() => {
    setLoading(true)
    setShiny(false)

    Promise.all([
      apiFetch(`/pokemon/${id}`).then(r => r.json()),
      apiFetch(`/evolution/pokemon/${id}`).then(r => r.json()),
      apiFetch('/moves?limit=1000').then(r => r.json()),
      apiFetch('/tm?limit=200').then(r => r.json()),
    ])
      .then(([pkData, evolData, movData, tmData]) => {
        setPk(pkData)
        setEvols(evolData.value ?? [])
        const movMap = {}
        for (const m of (movData.data ?? [])) {
          movMap[m.move_name.toLowerCase()] = m
        }
        setMovesMap(movMap)
        const tmMap = {}
        for (const t of (tmData.data ?? [])) {
          tmMap[t.tm_number] = t
        }
        setTmsMap(tmMap)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  /* fetch ability names when pk changes */
  useEffect(() => {
    if (!pk) return
    const ids = [pk.pokemon_ability_1, pk.pokemon_ability_2, pk.pokemon_ability_3, pk.pokemon_ability_4]
      .filter(Boolean)
    if (ids.length === 0) return
    Promise.all(ids.map(aid => apiFetch(`/abilities/${aid}`).then(r => r.json())))
      .then(results => {
        const map = {}
        for (const a of results) map[a.ability_id] = a
        setAbils(map)
      })
      .catch(() => {})
  }, [pk])

  const goTo = useCallback((newId) => navigate(`/pokemon/${newId}`), [navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400 text-sm">Cargando...</div>
      </div>
    )
  }

  if (!pk || pk.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <span className="text-5xl">❓</span>
        <p className="text-gray-500">Pokémon no encontrado</p>
        <button onClick={() => navigate('/pokemon')} className="text-red-600 text-sm underline">Volver a la lista</button>
      </div>
    )
  }

  const speeds = [
    pk.pokemon_speed_1_name && `${pk.pokemon_speed_1_value} ${pk.pokemon_speed_1_name}`,
    pk.pokemon_speed_2_name && `${pk.pokemon_speed_2_value} ${pk.pokemon_speed_2_name}`,
    pk.pokemon_speed_3_name && `${pk.pokemon_speed_3_value} ${pk.pokemon_speed_3_name}`,
    pk.pokemon_speed_4_name && `${pk.pokemon_speed_4_value} ${pk.pokemon_speed_4_name}`,
  ].filter(Boolean).join('  ·  ')

  const vulns = splitList(pk.pokemon_vulnerabilities)
  const resis = splitList(pk.pokemon_resistances)
  const immun = splitList(pk.pokemon_immunities)

  const mainImg  = shiny ? pk.pokemon_media_main_shiny  : pk.pokemon_media_main
  const abilityEntries = [
    pk.pokemon_ability_1 && { id: pk.pokemon_ability_1, hidden: !!pk.pokemon_ability_1_is_hidden },
    pk.pokemon_ability_2 && { id: pk.pokemon_ability_2, hidden: !!pk.pokemon_ability_2_is_hidden },
    pk.pokemon_ability_3 && { id: pk.pokemon_ability_3, hidden: !!pk.pokemon_ability_3_is_hidden },
    pk.pokemon_ability_4 && { id: pk.pokemon_ability_4, hidden: !!pk.pokemon_ability_4_is_hidden },
  ].filter(Boolean)

  const tmNumbers = splitList(pk.pokemon_moves_tm).map(Number).filter(n => !isNaN(n))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 lg:px-8 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/pokemon')}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-700 transition-colors"
        >
          <ArrowLeft size={16} /> Pokémon
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-800">{pk.pokemon_name}</span>
        <span className="ml-auto text-xs text-gray-400 font-mono">
          #{String(pk.pokemon_number).padStart(4, '0')}
        </span>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">

        {/* ══ Left panel ══ */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-4">

          {/* Image card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {pk.pokemon_type_1 && <TypeBadge type={pk.pokemon_type_1} />}
              {pk.pokemon_type_2 && <TypeBadge type={pk.pokemon_type_2} />}
            </div>
            <div className="relative">
              <img
                src={mainImg}
                alt={pk.pokemon_name}
                className="w-40 h-40 object-contain"
                onError={e => { e.target.style.opacity = '0.2' }}
              />
            </div>
            {(pk.pokemon_media_main_shiny) && (
              <button
                onClick={() => setShiny(s => !s)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  shiny
                    ? 'bg-yellow-400 border-yellow-500 text-yellow-900 font-semibold'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-400'
                }`}
              >
                <Sparkles size={12} /> Shiny
              </button>
            )}
          </div>

          {/* Info card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <InfoRow label="N.°"        value={`#${String(pk.pokemon_number).padStart(4, '0')}`} />
            <InfoRow label="Talla"      value={pk.pokemon_size} />
            <InfoRow label="SR"         value={pk.pokemon_sr} />
            <InfoRow label="Nivel mín." value={pk.pokemon_min_level} />
            <InfoRow label="Huevo"      value={pk.pokemon_egg_group} />
            <InfoRow label="Género"     value={genderLabel(pk.pokemon_gender)} />
            <InfoRow label="Bioma"      value={pk.pokemon_habitat_biomes} />
          </div>

          {/* Description */}
          {pk.pokemon_description && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-600 italic leading-relaxed">
                "{pk.pokemon_description}"
              </p>
            </div>
          )}

          {/* Evolution */}
          {evols.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <EvolutionChain evolutions={evols} onNavigate={goTo} />
            </div>
          )}
        </div>

        {/* ══ Right panel ══ */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* ── D&D Stat Block ── */}
          <div
            className="rounded-lg overflow-hidden shadow-md"
            style={{ borderTop: '6px solid #9C6E1B', borderBottom: '6px solid #9C6E1B', backgroundColor: '#FDF1DC' }}
          >
            {/* Name + title */}
            <div className="px-5 pt-4 pb-2">
              <h1 className="text-2xl font-black text-[#7A200D] leading-tight">{pk.pokemon_name}</h1>
              <p className="text-xs text-gray-600">
                {pk.pokemon_size} Pokémon
                {pk.pokemon_special_ability_text && ` · ${pk.pokemon_special_ability_text}`}
              </p>
            </div>

            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />

            {/* AC / HP / Speed */}
            <div className="px-5 py-2 space-y-0.5">
              <p className="text-xs text-gray-800">
                <span className="font-bold text-[#7A200D]">Clase de Armadura</span>{' '}
                {pk.pokemon_armor_class}
              </p>
              <p className="text-xs text-gray-800">
                <span className="font-bold text-[#7A200D]">Puntos de Golpe</span>{' '}
                {pk.pokemon_hit_points} ({pk.pokemon_hit_dice})
              </p>
              <p className="text-xs text-gray-800">
                <span className="font-bold text-[#7A200D]">Velocidad</span>{' '}
                {speeds || '—'}
              </p>
            </div>

            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />

            {/* Ability scores */}
            <div className="px-5 py-3 flex justify-around">
              {[
                ['STR', pk.pokemon_str],
                ['DEX', pk.pokemon_dex],
                ['CON', pk.pokemon_con],
                ['INT', pk.pokemon_int],
                ['WIS', pk.pokemon_wis],
                ['CHA', pk.pokemon_cha],
              ].map(([label, val]) => (
                <StatBox key={label} label={label} val={val} />
              ))}
            </div>

            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />

            {/* Saves / Skills / Senses */}
            <div className="px-5 py-2 space-y-0.5">
              {pk.pokemon_saving_throws && (
                <p className="text-xs text-gray-800">
                  <span className="font-bold text-[#7A200D]">Tiradas de Salvación</span>{' '}
                  {pk.pokemon_saving_throws}
                </p>
              )}
              {pk.pokemon_proficient_skills && (
                <p className="text-xs text-gray-800">
                  <span className="font-bold text-[#7A200D]">Competencias</span>{' '}
                  {pk.pokemon_proficient_skills}
                </p>
              )}
              {pk.pokemon_sense_1_name && (
                <p className="text-xs text-gray-800">
                  <span className="font-bold text-[#7A200D]">Sentidos</span>{' '}
                  {pk.pokemon_sense_1_name} {pk.pokemon_sense_1_value}
                  {pk.pokemon_sense_2_name && `, ${pk.pokemon_sense_2_name} ${pk.pokemon_sense_2_value}`}
                </p>
              )}
            </div>

            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />

            {/* Vulnerabilities / Resistances / Immunities */}
            <div className="px-5 py-2 space-y-1.5">
              {vulns.length > 0 && <TypeRow label="Vulnerabilidades" types={vulns} />}
              {resis.length > 0 && <TypeRow label="Resistencias"     types={resis} />}
              {immun.length > 0 && <TypeRow label="Inmunidades"      types={immun} />}
            </div>
          </div>

          {/* ── Abilities ── */}
          {abilityEntries.length > 0 && (
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-2">
                Habilidades
              </h2>
              <div className="flex flex-wrap gap-3">
                {abilityEntries.map(({ id: aid, hidden }) => {
                  const ab = abilities[aid]
                  return (
                    <div
                      key={aid}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm max-w-xs"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-800">
                          {ab ? ab.ability_name : `Habilidad #${aid}`}
                        </span>
                        {hidden && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">
                            Oculta
                          </span>
                        )}
                      </div>
                      {ab?.ability_description && (
                        <p className="text-xs text-gray-500 leading-relaxed">{ab.ability_description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Moves ── */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-3">
              Movimientos
            </h2>
            <MovesSection title="Inicio"   moveNames={splitList(pk.pokemon_moves_start)}   movesMap={movesMap} />
            <MovesSection title="Nivel 2"  moveNames={splitList(pk.pokemon_moves_level2)}  movesMap={movesMap} />
            <MovesSection title="Nivel 6"  moveNames={splitList(pk.pokemon_moves_level6)}  movesMap={movesMap} />
            <MovesSection title="Nivel 10" moveNames={splitList(pk.pokemon_moves_level10)} movesMap={movesMap} />
            <MovesSection title="Nivel 14" moveNames={splitList(pk.pokemon_moves_level14)} movesMap={movesMap} />
            <MovesSection title="Nivel 18" moveNames={splitList(pk.pokemon_moves_level18)} movesMap={movesMap} />
            <MovesSection title="Huevo"    moveNames={splitList(pk.pokemon_moves_egg)}     movesMap={movesMap} />
            <TmSection tmNumbers={tmNumbers} tmsMap={tmsMap} />
          </div>

          {/* Notes */}
          {pk.pokemon_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Notas</p>
              <p className="text-xs text-amber-900 leading-relaxed">{pk.pokemon_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

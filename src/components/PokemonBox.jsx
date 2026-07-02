import { useState, useEffect } from 'react'
import { X, ChevronLeft, Sparkles, Venus, Mars, Check } from 'lucide-react'
import { apiFetch } from '../api'

const TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
}
const fmtSign = v => (Number(v) >= 0 ? `+${v}` : `${v}`)
const fmtMod  = m => (m >= 0 ? `+${m}` : `${m}`)
const natureHasEffect = n => n && n.nature_effect_increase && n.nature_effect_increase !== '-'

function TypeBadge({ type }) {
  if (!type) return null
  return (
    <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5"
      style={{ backgroundColor: TYPE_COLORS[type] || '#9CA3AF' }}>{type}</span>
  )
}

function NatureBadges({ n }) {
  if (!natureHasEffect(n)) return <span className="text-[10px] text-gray-400">Neutral</span>
  return (
    <>
      <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">
        {n.nature_effect_increase} {fmtSign(n.nature_effect_increase_value)}
      </span>
      <span className="text-[10px] font-bold text-red-700 bg-red-100 rounded px-1.5 py-0.5">
        {n.nature_effect_decrease} {fmtSign(n.nature_effect_decrease_value)}
      </span>
    </>
  )
}

function ReadCheck({ checked }) {
  return (
    <span className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 ${
      checked ? 'bg-red-600 border-red-600' : 'border-red-400 bg-white'}`}>
      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
    </span>
  )
}

function MoveRow({ m }) {
  return (
    <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-green-100 border-green-300">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-sm text-gray-800 truncate">{m.move_name}</span>
        <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0"
          style={{ backgroundColor: TYPE_COLORS[m.move_type] || '#9CA3AF' }}>{m.move_type}</span>
      </div>
      <span className="text-[10px] text-gray-500 shrink-0 text-right">
        PP {m.move_pp} · {m.move_time} · {m.move_range}
      </span>
    </div>
  )
}

// ── Detalle de un Pokémon del personaje (tipo pokédex, datos persistidos) ──
function Detail({ personajeId, idpp, onBack, actionLabel, onAction }) {
  const [d, setD] = useState(null)
  const [shiny, setShiny] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setD(null)
    apiFetch(`/personaje/${personajeId}/pokemon/${idpp}`)
      .then(r => r.json())
      .then(setD)
      .catch(() => {})
  }, [personajeId, idpp])

  if (!d) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando…</div>

  const stats = d.stats || {}
  const statVal = k => (Number(stats[`pokemon_${k}`]) || 0) + (Number(stats[`pokemon_${k}_bonus`]) || 0)
  const modOf = k => Math.floor((statVal(k) - 10) / 2)
  const prof = Number(d.pokemon_proficient) || 2
  const stab = d.personaje_pokemon_stab != null ? d.personaje_pokemon_stab : 2
  const nature = d.nature_name ? {
    nature_name: d.nature_name,
    nature_effect_increase: d.nature_effect_increase, nature_effect_increase_value: d.nature_effect_increase_value,
    nature_effect_decrease: d.nature_effect_decrease, nature_effect_decrease_value: d.nature_effect_decrease_value,
  } : null
  const genero = d.personaje_pokemon_genero
  const mainImg = (shiny && d.pokemon_media_main_shiny) ? d.pokemon_media_main_shiny
    : (d.pokemon_media_main || d.pokemon_media_sprite)
  const speeds = [1, 2, 3, 4]
    .map(i => d[`personaje_pokemon_speed${i}_name`] && `${d[`personaje_pokemon_speed${i}_value`]} ${d[`personaje_pokemon_speed${i}_name`]}`)
    .filter(Boolean).join(' · ')

  const skills = d.skills || []
  const half = Math.ceil(skills.length / 2)
  const skillCols = [skills.slice(0, half), skills.slice(half)]
  const skillValue = s => {
    const m = modOf((s.skill_related_ability || '').toLowerCase())
    return m + (s.pokemon_skill_pref ? prof : 0) + (s.pokemon_skill_expert ? prof : 0)
  }

  const doAction = async () => {
    if (busy) return
    setBusy(true); setError('')
    const err = await onAction(idpp)
    if (err) { setError(err); setBusy(false) }   // en éxito el padre cierra la ventana
  }

  return (
    <div className="flex flex-col h-full text-gray-800">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-gray-900 truncate">{d.pokemon_apodo}</span>
          {d.pokemon_type_1 && <TypeBadge type={d.pokemon_type_1} />}
          {d.pokemon_type_2 && <TypeBadge type={d.pokemon_type_2} />}
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-4">
          {/* Encabezado */}
          <div className="flex flex-col items-center gap-1">
            {mainImg && <img src={mainImg} alt={d.pokemon_apodo} className="w-[168px] h-[168px] object-contain"
              onError={e => { e.target.style.opacity = '0.2' }} />}
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-gray-900">{d.pokemon_apodo}</span>
              {genero === 'Female' && <Venus size={18} className="text-pink-500" strokeWidth={2.5} />}
              {genero === 'Male' && <Mars size={18} className="text-blue-500" strokeWidth={2.5} />}
            </div>
            <span className="text-xs text-gray-400">{d.pokemon_name}</span>
            <div className="flex gap-1 mt-1">
              <TypeBadge type={d.pokemon_type_1} />
              <TypeBadge type={d.pokemon_type_2} />
            </div>
            {nature && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-semibold text-gray-600">{nature.nature_name}</span>
                <NatureBadges n={nature} />
              </div>
            )}
            {/* Shiny + acción */}
            <div className="flex items-center gap-2 mt-2">
              {d.pokemon_media_main_shiny && (
                <button onClick={() => setShiny(s => !s)}
                  className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition-all ${
                    shiny ? 'bg-yellow-400 border-yellow-500 text-yellow-900 font-semibold'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-400'}`}>
                  <Sparkles size={11} /> Shiny
                </button>
              )}
              <button onClick={doAction} disabled={busy}
                className="text-xs px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold transition-colors">
                {busy ? 'Guardando…' : actionLabel}
              </button>
            </div>
            {error && <span className="text-xs text-red-600 font-medium mt-1">{error}</span>}
          </div>

          {/* Stat block */}
          <div className="rounded-lg overflow-hidden"
            style={{ borderTop: '5px solid #9C6E1B', borderBottom: '5px solid #9C6E1B', backgroundColor: '#FDF1DC' }}>
            <div className="px-4 py-1.5 space-y-0.5 text-xs text-gray-800">
              <p><span className="font-bold text-[#7A200D]">Clase de Armadura</span> {d.personaje_pokemon_ac}</p>
              <p><span className="font-bold text-[#7A200D]">Puntos de Golpe</span> {d.pokemon_current_hp}/{d.pokemon_hp} ({d.pokemon_hit_dice})</p>
              {speeds && <p><span className="font-bold text-[#7A200D]">Velocidad</span> {speeds}</p>}
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-2 flex justify-around">
              {[['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'], ['INT', 'int'], ['WIS', 'wis'], ['CHA', 'cha']].map(([lbl, k]) => (
                <div key={k} className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-[#7A200D]">{lbl}</span>
                  <span className="text-base font-bold text-gray-900 leading-tight">{statVal(k)}</span>
                  <span className="text-xs text-gray-600">{fmtSign(modOf(k))}</span>
                </div>
              ))}
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-2 flex justify-around">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#7A200D]">STAB</span>
                <span className="text-base font-bold text-gray-900 leading-tight">{fmtSign(stab)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#7A200D]">PROF</span>
                <span className="text-base font-bold text-gray-900 leading-tight">{fmtSign(prof)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#7A200D]">AC</span>
                <span className="text-base font-bold text-gray-900 leading-tight">{d.personaje_pokemon_ac}</span>
              </div>
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-1.5 space-y-0.5 text-xs text-gray-800">
              {d.pokemon_saving_throw_prof && <p><span className="font-bold text-[#7A200D]">Tiradas de Salvación</span> {d.pokemon_saving_throw_prof}</p>}
            </div>
          </div>

          {/* Habilidades */}
          {skills.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-1.5">Habilidades</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                {skillCols.map((col, ci) => (
                  <div key={ci}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-3.5 text-center text-[9px] font-bold text-gray-500">E</span>
                      <span className="w-3.5 text-center text-[9px] font-bold text-gray-500">P</span>
                    </div>
                    <div className="space-y-1.5">
                      {col.map((s, i) => {
                        const v = skillValue(s)
                        return (
                          <div key={i} className="flex items-center gap-1.5">
                            <ReadCheck checked={!!s.pokemon_skill_expert} />
                            <ReadCheck checked={!!s.pokemon_skill_pref} />
                            <span className={`w-7 text-center text-[11px] font-bold border-b border-gray-400 leading-tight ${
                              v < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {fmtMod(v)}
                            </span>
                            <span className="text-[11px] leading-tight truncate">
                              <span className="font-semibold text-gray-800">{s.skill_name}</span>
                              <span className="text-gray-400"> ({s.skill_related_ability})</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movimientos */}
          {(d.moves || []).length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Movimientos</p>
              <div className="space-y-1.5">
                {d.moves.map(m => <MoveRow key={m.move_id} m={m} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PokemonBox({ personajeId, mode, onClose }) {
  const isBelt = mode === 'belt'
  const title    = isBelt ? 'Cinturón' : 'Femputadora'
  const subtitle = isBelt ? 'Pokémones en tu equipo' : 'Pokémones almacenados'
  const actionLabel = isBelt ? 'Enviar al computador' : 'Agregar al cinturón'
  const targetEnEquipo = !isBelt   // belt → false (al PC); pc → true (al cinturón)

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/personaje/${personajeId}/pokemon?en_equipo=${isBelt ? 'true' : 'false'}`)
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [personajeId, isBelt])

  const handleAction = async (idpp) => {
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/en-equipo`, {
        method: 'PATCH',
        body: JSON.stringify({ en_equipo: targetEnEquipo }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        return j.error || 'No se pudo actualizar el Pokémon'
      }
      onClose()   // cierra la ventana completamente
      return null
    } catch {
      return 'No se pudo actualizar el Pokémon'
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl">
        <button onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
          <X size={18} />
        </button>

        {selected ? (
          <Detail personajeId={personajeId} idpp={selected} onBack={() => setSelected(null)}
            actionLabel={actionLabel} onAction={handleAction} />
        ) : (
          <>
            <div className="px-5 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-black text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <p className="text-center text-gray-400 text-sm py-10">Cargando…</p>
              ) : list.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">
                  {isBelt ? 'No tienes Pokémon en el cinturón.' : 'No tienes Pokémon almacenados.'}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {list.map(p => (
                    <button key={p.id_personaje_pokemon} onClick={() => setSelected(p.id_personaje_pokemon)}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:border-red-400 hover:shadow transition-all bg-white">
                      <img src={p.pokemon_media_sprite || p.pokemon_media_main} alt={p.pokemon_apodo}
                        className="w-16 h-16 object-contain" onError={e => { e.target.style.opacity = '0.2' }} />
                      <span className="text-sm font-semibold text-gray-800 truncate max-w-full">{p.pokemon_apodo}</span>
                      <span className="text-[11px] text-gray-400 truncate max-w-full">{p.pokemon_name} · Nv {p.pokemon_level}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

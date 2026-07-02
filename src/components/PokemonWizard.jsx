import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronDown, Venus, Mars, Check } from 'lucide-react'
import PokemonList from '../pages/PokemonList'
import { apiFetch } from '../api'

const STEPS = ['Básicos', 'Stats', 'Iniciales', 'Movimientos', 'Confirmación']
const STRUGGLE_ID = 705
const MAX_MOVES = 4

const TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
}
const splitList = s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : []

function TypeBadge({ type }) {
  if (!type) return null
  return (
    <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5"
      style={{ backgroundColor: TYPE_COLORS[type] || '#9CA3AF' }}>{type}</span>
  )
}

function MoveRow({ m, selected, disabled, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors text-left ${
        selected ? 'bg-green-100 border-green-300' : 'border-gray-200 hover:border-gray-300 bg-white'} ${
        disabled ? 'cursor-default' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-sm text-gray-800 truncate">{m.move_name}</span>
        <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0"
          style={{ backgroundColor: TYPE_COLORS[m.move_type] || '#9CA3AF' }}>{m.move_type}</span>
      </div>
      <span className="text-[10px] text-gray-500 shrink-0 text-right">
        PP {m.move_pp} · {m.move_time} · {m.move_range}
      </span>
    </button>
  )
}

const fmtSign = v => (Number(v) >= 0 ? `+${v}` : `${v}`)
const natureHasEffect = n => n && n.nature_effect_increase && n.nature_effect_increase !== '-'

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

function NatureSelect({ natures, value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-xl bg-white text-left focus:outline-none focus:ring-2 focus:ring-red-400">
        {value ? (
          <span className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="text-sm font-semibold text-gray-800">{value.nature_name}</span>
            <NatureBadges n={value} />
          </span>
        ) : (
          <span className="text-sm text-gray-400">Selecciona una naturaleza...</span>
        )}
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {natures.map(n => (
            <button key={n.nature_id} type="button" onClick={() => { onChange(n); setOpen(false) }}
              className="w-full flex items-center gap-1.5 flex-wrap px-3 py-2 hover:bg-red-50 text-left border-b border-gray-50 last:border-0">
              <span className="text-sm font-semibold text-gray-800">{n.nature_name}</span>
              <NatureBadges n={n} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function IniRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
      <span className="text-xs font-bold text-red-700 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{(value ?? '') === '' ? '—' : value}</span>
    </div>
  )
}

const STAT_FIELDS = [
  { key: 'dex', label: 'DEX', name: 'Dexterity',    desc: 'Agilidad, reflejos, equilibrio, sigilo, precisión, coordinación y reacción ante peligro.' },
  { key: 'str', label: 'STR', name: 'Strength',     desc: 'Fuerza física, cargar peso, empujar, trepar con fuerza, sujetar, romper objetos y usar fuerza bruta.' },
  { key: 'con', label: 'CON', name: 'Constitution', desc: 'Salud, resistencia física, aguante, veneno, cansancio, clima extremo y Hit Points.' },
  { key: 'int', label: 'INT', name: 'Intelligence', desc: 'Memoria, lógica, estudio, análisis, tecnología, investigación y conocimiento técnico.' },
  { key: 'wis', label: 'WIS', name: 'Wisdom',       desc: 'Percepción, intuición, instinto, supervivencia, lectura de intenciones y conexión con el entorno.' },
  { key: 'cha', label: 'CHA', name: 'Charisma',     desc: 'Presencia, liderazgo, encanto, confianza, intimidación, persuasión, actuación y vínculos sociales.' },
]
const fmtMod = m => (m >= 0 ? `+${m}` : `${m}`)
const PROF = 2 // bono de competencia del Pokémon (nivel 1)

function ReadCheck({ checked }) {
  return (
    <span className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 ${
      checked ? 'bg-red-600 border-red-600' : 'border-red-400 bg-white'}`}>
      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
    </span>
  )
}

export default function PokemonWizard({ personajeId, onClose, onCreated }) {
  const [pokemon, setPokemon] = useState(null)
  const [apodo, setApodo] = useState('')
  const [genero, setGenero] = useState('N')
  const [nature, setNature] = useState(null)
  const [natures, setNatures] = useState([])
  const [movesMap, setMovesMap] = useState({}) // name → move
  const [struggle, setStruggle] = useState(null)
  const [selectedMoves, setSelectedMoves] = useState([]) // ids (aparte de Struggle)
  const [skillsList, setSkillsList] = useState([])
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isLast = step === STEPS.length - 1

  const handleSubmit = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const move_ids = [struggle?.move_id, ...selectedMoves].filter(Boolean)
      const res = await apiFetch(`/personaje/${personajeId}/pokemon`, {
        method: 'POST',
        body: JSON.stringify({
          id_pokemon: pokemon.pokemon_id,
          apodo: apodo || pokemon.pokemon_name,
          genero,
          id_nature: nature?.nature_id ?? null,
          id_bond: 4,
          move_ids,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'No se pudo agregar el Pokémon')
      }
      onCreated?.()
    } catch (e) {
      setError(e.message || 'No se pudo agregar el Pokémon')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    apiFetch('/natures?limit=100')
      .then(r => r.json())
      .then(d => setNatures(Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : [])))
      .catch(() => {})
    apiFetch('/moves?limit=1000')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d.data) ? d.data : []
        const map = {}
        for (const m of list) map[m.move_name.toLowerCase()] = m
        setMovesMap(map)
        setStruggle(list.find(m => m.move_id === STRUGGLE_ID) || null)
      })
      .catch(() => {})
    apiFetch('/skills')
      .then(r => r.json())
      .then(d => setSkillsList(Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : [])))
      .catch(() => {})
  }, [])

  const toggleMove = (m) => {
    setSelectedMoves(prev => {
      if (prev.includes(m.move_id)) return prev.filter(x => x !== m.move_id)
      if (prev.length >= MAX_MOVES) return prev
      return [...prev, m.move_id]
    })
  }

  // Antes de nada: seleccionar el Pokémon desde la pokédex (starters)
  if (!pokemon) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
          <button onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
            <X size={18} />
          </button>
          <PokemonList title="Elige tu Pokémon" starter onChoose={(pk) => {
            setPokemon(pk)
            setApodo(pk.pokemon_name || '')
            const [f, m] = (pk.pokemon_gender || '0:0').split(':').map(Number)
            setGenero(f > 0 ? 'F' : (m > 0 ? 'M' : 'N'))
          }} />
        </div>
      </div>
    )
  }

  const sprite = pokemon.pokemon_media_sprite || pokemon.pokemon_media_main

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header + progreso */}
        <div className="px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-bold text-gray-900 shrink-0">Agregar Pokémon</h2>
              {sprite && <img src={sprite} alt={pokemon.pokemon_name} className="w-8 h-8 object-contain shrink-0" />}
              <span className="text-sm font-semibold text-gray-600 truncate">
                {step === 0 ? (
                  pokemon.pokemon_name
                ) : (
                  <>{apodo || pokemon.pokemon_name} <span className="text-gray-400 font-normal">({pokemon.pokemon_name})</span></>
                )}
              </span>
              {nature && (
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-gray-500">{nature.nature_name}</span>
                  <NatureBadges n={nature} />
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={18} /></button>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-red-500' : 'bg-gray-200'}`} />
                <p className={`text-[10px] mt-1 font-medium ${i === step ? 'text-red-600' : 'text-gray-400'}`}>
                  {i + 1}. {label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Paso {step + 1} de {STEPS.length}</p>
        </div>

        {/* Contenido del paso */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {step === 0 && (() => {
            const [f, m] = (pokemon.pokemon_gender || '0:0').split(':').map(Number)
            const genderOptions = []
            if (f > 0) genderOptions.push({ value: 'F', label: 'Hembra', Icon: Venus, on: 'bg-pink-500 border-pink-500', off: 'text-pink-500' })
            if (m > 0) genderOptions.push({ value: 'M', label: 'Macho', Icon: Mars, on: 'bg-blue-500 border-blue-500', off: 'text-blue-500' })
            return (
              <div className="py-6 max-w-md mx-auto">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Pokémon</label>
                <p className="text-xs text-gray-500 mb-2">Este es el nombre con el cual aparecerá tu Pokémon en la partida.</p>
                <input
                  value={apodo}
                  onChange={e => setApodo(e.target.value)}
                  placeholder={pokemon.pokemon_name}
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50
                             focus:outline-none focus:ring-2 focus:ring-red-400"
                />

                <label className="block text-sm font-semibold text-gray-700 mb-2 mt-5">Género</label>
                {genderOptions.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Sin género</p>
                ) : (
                  <div className="flex gap-3">
                    {genderOptions.map(o => {
                      const sel = genero === o.value
                      return (
                        <button key={o.value} onClick={() => setGenero(o.value)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                            sel ? `${o.on} text-white` : `border-gray-200 ${o.off} hover:border-gray-300 bg-white`}`}>
                          <o.Icon size={22} strokeWidth={2.5} />
                          {o.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                <label className="block text-sm font-semibold text-gray-700 mb-2 mt-5">Naturaleza</label>
                <NatureSelect natures={natures} value={nature} onChange={setNature} />
              </div>
            )
          })()}
          {step === 1 && (
            <div className="max-w-md mx-auto py-2">
              <p className="text-xs text-gray-500 text-center mb-4">Los stats se cargan según la información del Pokémon.</p>
              <div className="space-y-2">
                {STAT_FIELDS.map(f => {
                  const val = pokemon[`pokemon_${f.key}`] ?? 10
                  const mod = Math.floor((val - 10) / 2)
                  return (
                    <div key={f.key} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-bold text-gray-800">{f.label}</span>
                          <span className="text-sm font-semibold text-gray-600">{f.name}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{f.desc}</p>
                      </div>
                      <div className="flex flex-col items-center shrink-0 w-12">
                        <span className="text-lg font-black text-gray-900 leading-none">{val}</span>
                        <span className={`text-[11px] font-bold ${mod < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMod(mod)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {step === 2 && (() => {
            const competencias = (pokemon.pokemon_proficient_skills || '')
              .split(',').map(s => s.trim()).filter(Boolean)
            return (
              <div className="max-w-md mx-auto py-2 space-y-2">
                <IniRow label="Nivel"         value={pokemon.pokemon_min_level ?? 1} />
                <IniRow label="Hit Dice"      value={pokemon.pokemon_hit_dice} />
                <IniRow label="Hit Points"    value={pokemon.pokemon_hit_points} />
                <IniRow label="Armor Class"   value={pokemon.pokemon_armor_class} />
                <IniRow label="Saving Throws" value={pokemon.pokemon_saving_throws} />

                <div className="pt-2">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Competencias</p>
                  <p className="text-[11px] text-gray-400 mb-2">Habilidades del Pokémon según la Pokédex (informativo).</p>
                  {competencias.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {competencias.map((s, i) => (
                        <span key={i} className="text-[11px] font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">{s}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin competencias.</p>
                  )}
                </div>
              </div>
            )
          })()}
          {step === 3 && (() => {
            const nombres = splitList(pokemon.pokemon_moves_start)
            const seen = new Set()
            const moves = nombres
              .map(n => movesMap[n.toLowerCase()])
              .filter(m => m && m.move_id !== STRUGGLE_ID && !seen.has(m.move_id) && seen.add(m.move_id))
            return (
              <div className="max-w-lg mx-auto py-2">
                <p className="text-xs text-gray-500 text-center mb-3">
                  Elige hasta {MAX_MOVES} movimientos. <span className="font-semibold text-gray-700">{selectedMoves.length}/{MAX_MOVES}</span>
                </p>
                <div className="space-y-1.5">
                  {struggle && <MoveRow m={struggle} selected disabled />}
                  {moves.map(m => (
                    <MoveRow key={m.move_id} m={m}
                      selected={selectedMoves.includes(m.move_id)}
                      onClick={() => toggleMove(m)} />
                  ))}
                  {moves.length === 0 && <p className="text-sm text-gray-400 italic text-center py-6">Sin movimientos disponibles.</p>}
                </div>
              </div>
            )
          })()}
          {step === 4 && (() => {
            const startMoves = splitList(pokemon.pokemon_moves_start).map(n => movesMap[n.toLowerCase()]).filter(Boolean)
            const chosen = [struggle, ...startMoves.filter(m => selectedMoves.includes(m.move_id))].filter(Boolean)
            const speeds = [1, 2, 3, 4]
              .map(i => pokemon[`pokemon_speed_${i}_name`] && `${pokemon[`pokemon_speed_${i}_value`]} ${pokemon[`pokemon_speed_${i}_name`]}`)
              .filter(Boolean).join(' · ')
            // Bonos de naturaleza sumados a los stats
            const natureAdj = {}
            if (natureHasEffect(nature)) {
              natureAdj[nature.nature_effect_increase] = (natureAdj[nature.nature_effect_increase] || 0) + Number(nature.nature_effect_increase_value)
              natureAdj[nature.nature_effect_decrease] = (natureAdj[nature.nature_effect_decrease] || 0) + Number(nature.nature_effect_decrease_value)
            }
            return (
              <div className="max-w-md mx-auto py-2 space-y-4">
                {/* Encabezado */}
                <div className="flex flex-col items-center gap-1">
                  {(pokemon.pokemon_media_main || sprite) && <img src={pokemon.pokemon_media_main || sprite} alt={pokemon.pokemon_name} className="w-[168px] h-[168px] object-contain" />}
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">{apodo || pokemon.pokemon_name}</span>
                    {genero === 'F' && <Venus size={18} className="text-pink-500" strokeWidth={2.5} />}
                    {genero === 'M' && <Mars size={18} className="text-blue-500" strokeWidth={2.5} />}
                  </div>
                  <span className="text-xs text-gray-400">{pokemon.pokemon_name}</span>
                  <div className="flex gap-1 mt-1">
                    <TypeBadge type={pokemon.pokemon_type_1} />
                    <TypeBadge type={pokemon.pokemon_type_2} />
                  </div>
                  {nature && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-semibold text-gray-600">{nature.nature_name}</span>
                      <NatureBadges n={nature} />
                    </div>
                  )}
                </div>

                {/* Stat block */}
                <div className="rounded-lg overflow-hidden"
                  style={{ borderTop: '5px solid #9C6E1B', borderBottom: '5px solid #9C6E1B', backgroundColor: '#FDF1DC' }}>
                  <div className="px-4 py-1.5 space-y-0.5 text-xs text-gray-800">
                    <p><span className="font-bold text-[#7A200D]">Clase de Armadura</span> {pokemon.pokemon_armor_class}</p>
                    <p><span className="font-bold text-[#7A200D]">Puntos de Golpe</span> {pokemon.pokemon_hit_points} ({pokemon.pokemon_hit_dice})</p>
                    {speeds && <p><span className="font-bold text-[#7A200D]">Velocidad</span> {speeds}</p>}
                  </div>
                  <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
                  <div className="px-4 py-2 flex justify-around">
                    {[['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'], ['INT', 'int'], ['WIS', 'wis'], ['CHA', 'cha']].map(([lbl, k]) => {
                      const v = (pokemon[`pokemon_${k}`] ?? 10) + (natureAdj[lbl] || 0)
                      const mod = Math.floor((v - 10) / 2)
                      return (
                        <div key={k} className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-[#7A200D]">{lbl}</span>
                          <span className="text-base font-bold text-gray-900 leading-tight">{v}</span>
                          <span className="text-xs text-gray-600">{fmtSign(mod)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
                  <div className="px-4 py-2 flex justify-around">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-[#7A200D]">STAB</span>
                      <span className="text-base font-bold text-gray-900 leading-tight">+2</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-[#7A200D]">PROF</span>
                      <span className="text-base font-bold text-gray-900 leading-tight">+2</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-[#7A200D]">AC</span>
                      <span className="text-base font-bold text-gray-900 leading-tight">{pokemon.pokemon_armor_class}</span>
                    </div>
                  </div>
                  <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
                  <div className="px-4 py-1.5 space-y-0.5 text-xs text-gray-800">
                    {pokemon.pokemon_saving_throws && <p><span className="font-bold text-[#7A200D]">Tiradas de Salvación</span> {pokemon.pokemon_saving_throws}</p>}
                  </div>
                </div>

                {/* Habilidades */}
                {skillsList.length > 0 && (() => {
                  const profSet = new Set(splitList(pokemon.pokemon_proficient_skills).map(s => s.toLowerCase()))
                  const abMod = (ab) => {
                    const k = (ab || '').toLowerCase()
                    const base = pokemon[`pokemon_${k}`]
                    if (base == null) return null
                    return Math.floor((Number(base) + (natureAdj[(ab || '').toUpperCase()] || 0) - 10) / 2)
                  }
                  const half = Math.ceil(skillsList.length / 2)
                  const cols = [skillsList.slice(0, half), skillsList.slice(half)]
                  return (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-1.5">Habilidades</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                        {cols.map((col, ci) => (
                          <div key={ci}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-3.5 text-center text-[9px] font-bold text-gray-500">E</span>
                              <span className="w-3.5 text-center text-[9px] font-bold text-gray-500">P</span>
                            </div>
                            <div className="space-y-1.5">
                              {col.map((s, i) => {
                                const prof = profSet.has((s.skill_name || '').toLowerCase())
                                const m = abMod(s.skill_related_ability)
                                const v = m == null ? null : m + (prof ? PROF : 0)
                                return (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <ReadCheck checked={false} />
                                    <ReadCheck checked={prof} />
                                    <span className={`w-7 text-center text-[11px] font-bold border-b border-gray-400 leading-tight ${
                                      v != null && v < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                      {v == null ? '' : fmtMod(v)}
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
                  )
                })()}

                {/* Movimientos */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Movimientos</p>
                  <div className="space-y-1.5">
                    {chosen.map(m => <MoveRow key={m.move_id} m={m} selected disabled />)}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 shrink-0 flex items-center justify-between">
          <button
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors"
          >
            <ChevronLeft size={15} /> {step === 0 ? 'Cancelar' : 'Atrás'}
          </button>

          {isLast ? (
            <div className="flex items-center gap-3">
              {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
              >
                {saving ? 'Agregando…' : 'Agregar Pokémon'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="bg-gray-900 hover:bg-red-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

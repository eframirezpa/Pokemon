import { useState, useEffect } from 'react'
import { X, Loader2, Search, Venus, Mars, Plus, Trash2, ChevronDown } from 'lucide-react'
import PokemonList from '../pages/PokemonList'
import { apiFetch } from '../api'
import TypeEffectivenessView from './TypeEffectivenessView'

const STRUGGLE_ID = 705
const MAX_MOVES = 4          // movimientos aparte de Struggle
const DEFAULT_BOND = 4       // Neutral
const PROF = 2               // bono de competencia del Pokémon (nivel 1)

const STAT_FIELDS = [['dex','DEX'], ['str','STR'], ['con','CON'], ['int','INT'], ['wis','WIS'], ['cha','CHA']]
const splitList = s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : []
const fmtMod = m => (m >= 0 ? `+${m}` : `${m}`)
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// Habilidades pasivas visibles (no ocultas) del Pokémon → ids
const nonHiddenAbilities = (pk) => !pk ? [] : [
  !pk.pokemon_ability_1_is_hidden && pk.pokemon_ability_1,
  !pk.pokemon_ability_2_is_hidden && pk.pokemon_ability_2,
  !pk.pokemon_ability_3_is_hidden && pk.pokemon_ability_3,
  !pk.pokemon_ability_4_is_hidden && pk.pokemon_ability_4,
].filter(Boolean)

const natureAdjOf = (n) => {
  const adj = {}
  if (n && n.nature_effect_increase && n.nature_effect_increase !== '-') {
    adj[n.nature_effect_increase.toLowerCase()] = (adj[n.nature_effect_increase.toLowerCase()] || 0) + (Number(n.nature_effect_increase_value) || 0)
    adj[n.nature_effect_decrease.toLowerCase()] = (adj[n.nature_effect_decrease.toLowerCase()] || 0) + (Number(n.nature_effect_decrease_value) || 0)
  }
  return adj
}

/* Popup de búsqueda genérico (habilidades / movimientos) */
function SearchModal({ title, endpoint, render, onPick, onClose }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      apiFetch(`${endpoint}?limit=50&search=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => setItems(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])))
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q, endpoint])
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="px-5 pt-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="animate-spin mr-2" size={16} /> Cargando...</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">Sin resultados.</p>
          ) : (
            <div className="space-y-1">
              {items.map(it => (
                <button key={render.key(it)} onClick={() => { onPick(it); onClose() }}
                  className="w-full text-left rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 px-3 py-2 transition-colors">
                  {render.row(it)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Select de tipo (nativo, con opción vacía para el tipo 2) */
function TypeSelect({ types, value, onChange, allowEmpty }) {
  return (
    <div className="relative">
      <select value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="appearance-none w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
        {allowEmpty && <option value="">— Sin tipo —</option>}
        {types.map(t => <option key={t.pokemon_types_id} value={t.pokemon_types_id}>{t.pokemon_types_name}</option>)}
      </select>
      <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

const generoCode = (g) => g === 'Male' ? 'M' : g === 'Female' ? 'F' : 'N'

export default function MasterPokemonWizard({ mode = 'create', sourceId = null, onClose, onCreated }) {
  const [pokemon, setPokemon] = useState(null)
  const [loading, setLoading] = useState(mode !== 'create') // edit/clone cargan el detalle
  // catálogos
  const [types, setTypes]     = useState([])
  const [skillsList, setSkillsList] = useState([])
  const [natures, setNatures] = useState([])
  const [movesMap, setMovesMap] = useState({})   // name → move
  const [struggle, setStruggle] = useState(null)
  // estado editable
  const [apodo, setApodo]     = useState('')
  const [genero, setGenero]   = useState('N')
  const [nature, setNature]   = useState(null)
  const [type1, setType1]     = useState(null)   // ids
  const [type2, setType2]     = useState(null)
  const [hp, setHp]           = useState(0)
  const [stats, setStats]     = useState({ dex:0, str:0, con:0, int:0, wis:0, cha:0 })
  const [skills, setSkills]   = useState([])     // [{ id_skill, skill_name, related, pref, expert }]
  const [pasiva, setPasiva]   = useState(null)   // { ability_id, ability_name }
  const [moves, setMoves]     = useState([])     // movimientos aparte de struggle: [{ move_id, move_name, move_type }]
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  // popups
  const [abilityPicker, setAbilityPicker] = useState(false)
  const [movePicker, setMovePicker]       = useState(null) // { index } o { add: true }

  // Catálogos base
  useEffect(() => {
    apiFetch('/types').then(r => r.json()).then(d => setTypes(Array.isArray(d) ? d : [])).catch(() => {})
    apiFetch('/skills').then(r => r.json()).then(d => setSkillsList(Array.isArray(d) ? d : (d.data ?? []))).catch(() => {})
    apiFetch('/natures?limit=100').then(r => r.json()).then(d => setNatures(Array.isArray(d) ? d : (d.data ?? []))).catch(() => {})
    apiFetch('/moves?limit=1000').then(r => r.json()).then(d => {
      const list = Array.isArray(d.data) ? d.data : []
      const map = {}; for (const m of list) map[m.move_name.toLowerCase()] = m
      setMovesMap(map); setStruggle(list.find(m => m.move_id === STRUGGLE_ID) || null)
    }).catch(() => {})
  }, [])

  // Editar / clonar: precargar el estado desde el detalle del Pokémon existente
  useEffect(() => {
    if (mode === 'create' || !sourceId) return
    apiFetch(`/master/pokemon/${sourceId}`).then(r => r.json()).then(d => {
      if (!d || !d.id_master_pokemon) { setLoading(false); return }
      setPokemon({
        pokemon_id: d.id_pokemon, pokemon_name: d.pokemon_name, pokemon_gender: d.pokemon_gender,
        pokemon_media_sprite: d.pokemon_media_sprite, pokemon_media_main: d.pokemon_media_main,
      })
      setApodo((d.pokemon_apodo || d.pokemon_name || '') + (mode === 'clone' ? ' clon' : ''))
      setGenero(generoCode(d.personaje_pokemon_genero))
      setNature(d.personaje_pokemon_nature ? {
        nature_id: d.personaje_pokemon_nature, nature_name: d.nature_name,
        nature_effect_increase: d.nature_effect_increase, nature_effect_increase_value: d.nature_effect_increase_value,
        nature_effect_decrease: d.nature_effect_decrease, nature_effect_decrease_value: d.nature_effect_decrease_value,
      } : null)
      setType1(d.personaje_pokemon_type_1 ?? null); setType2(d.personaje_pokemon_type_2 ?? null)
      setHp(Number(d.pokemon_hp) || 0)
      setStats(Object.fromEntries(STAT_FIELDS.map(([k]) => [k, Number(d.stats?.[`pokemon_${k}`]) || 0])))
      setSkills((d.skills || []).map(s => ({
        id_skill: s.skill_id, skill_name: s.skill_name, related: s.skill_related_ability,
        pref: !!s.pokemon_skill_pref, expert: !!s.pokemon_skill_expert,
      })))
      const p0 = (d.pasivas || [])[0]
      setPasiva(p0 ? { ability_id: p0.ability_id, ability_name: p0.ability_name } : null)
      setMoves((d.moves || []).filter(m => m.move_id !== STRUGGLE_ID)
        .map(m => ({ move_id: m.move_id, move_name: m.move_name, move_type: m.move_type })))
      setLoading(false)
    }).catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sourceId])

  // Al elegir el Pokémon: calcular todos los valores por defecto
  const choose = (pk) => {
    setPokemon(pk)
    setApodo(pk.pokemon_name || '')
    // género al azar entre los posibles de la especie
    const [f, m] = (pk.pokemon_gender || '0:0').split(':').map(Number)
    const opts = [...(f > 0 ? ['F'] : []), ...(m > 0 ? ['M'] : [])]
    setGenero(opts.length ? pick(opts) : 'N')
    // naturaleza al azar
    setNature(natures.length ? pick(natures) : null)
    // tipos por nombre → id
    const tid = (name) => types.find(t => (t.pokemon_types_name || '').toLowerCase() === (name || '').toLowerCase())?.pokemon_types_id ?? null
    setType1(tid(pk.pokemon_type_1)); setType2(tid(pk.pokemon_type_2))
    // hp y stats de la pokédex
    setHp(Number(pk.pokemon_hit_points) || 0)
    setStats(Object.fromEntries(STAT_FIELDS.map(([k]) => [k, Number(pk[`pokemon_${k}`]) || 0])))
    // skills con las proficiencias de la pokédex
    const profSet = new Set(splitList(pk.pokemon_proficient_skills).map(s => s.toLowerCase()))
    setSkills(skillsList.map(s => ({
      id_skill: s.skill_id, skill_name: s.skill_name, related: s.skill_related_ability,
      pref: profSet.has((s.skill_name || '').toLowerCase()), expert: false,
    })))
    // movimientos: hasta 4 al azar del pool inicial (sin struggle)
    const pool = splitList(pk.pokemon_moves_start).map(n => movesMap[n.toLowerCase()])
      .filter(mv => mv && mv.move_id !== STRUGGLE_ID)
    const uniq = [...new Map(pool.map(mv => [mv.move_id, mv])).values()]
    const chosen = uniq.length <= MAX_MOVES ? uniq : [...uniq].sort(() => Math.random() - 0.5).slice(0, MAX_MOVES)
    setMoves(chosen)
    // pasiva al azar (no oculta)
    const abIds = nonHiddenAbilities(pk)
    if (abIds.length) {
      const aid = pick(abIds)
      apiFetch(`/abilities/${aid}`).then(r => r.json())
        .then(a => setPasiva(a && a.ability_id ? { ability_id: a.ability_id, ability_name: a.ability_name } : null))
        .catch(() => setPasiva(null))
    } else setPasiva(null)
  }

  const natureAdj = natureAdjOf(nature)
  const modOf = (k) => Math.floor(((Number(stats[k]) || 0) + (natureAdj[k] || 0) - 10) / 2)
  // Modificador de la skill: mod de su atributo + competencia (prof, y otra vez si es experto)
  const skillMod = (s) => modOf((s.related || '').toLowerCase()) + (s.pref ? PROF : 0) + (s.expert ? PROF : 0)

  const setStat = (k, v) => setStats(s => ({ ...s, [k]: v === '' ? '' : Math.max(0, Number(v) || 0) }))
  const toggleSkill = (id, field) => setSkills(list => list.map(s => {
    if (s.id_skill !== id) return s
    if (field === 'pref')   return { ...s, pref: !s.pref, expert: !s.pref ? s.expert : false }
    // expert requiere pref
    return { ...s, expert: !s.expert, pref: !s.expert ? true : s.pref }
  }))

  const replaceMove = (index, mv) => setMoves(list => {
    if (list.some((x, i) => i !== index && x.move_id === mv.move_id)) return list // evita duplicados
    const next = [...list]; next[index] = mv; return next
  })
  const addMove = (mv) => setMoves(list => (list.length >= MAX_MOVES || list.some(x => x.move_id === mv.move_id)) ? list : [...list, mv])
  const removeMove = (index) => setMoves(list => list.filter((_, i) => i !== index))

  const gOpts = (() => {
    const [f, m] = (pokemon?.pokemon_gender || '0:0').split(':').map(Number)
    return [...(f > 0 ? [{ v:'F', L:'Hembra', Icon:Venus, on:'bg-pink-500 border-pink-500', off:'text-pink-500' }] : []),
            ...(m > 0 ? [{ v:'M', L:'Macho',  Icon:Mars,  on:'bg-blue-500 border-blue-500', off:'text-blue-500' }] : [])]
  })()

  const save = async () => {
    if (saving) return
    setSaving(true); setError('')
    try {
      // Siempre incluye Struggle (id fijo) además de los movimientos elegidos
      const move_ids = [STRUGGLE_ID, ...moves.map(m => m.move_id)]
      const payload = {
        id_pokemon: pokemon.pokemon_id,
        apodo: apodo || pokemon.pokemon_name,
        genero, id_nature: nature?.nature_id ?? null, id_bond: DEFAULT_BOND, is_shiny: false,
        type_1: type1, type_2: type2,
        hp: Number(hp) || 0,
        stats: Object.fromEntries(STAT_FIELDS.map(([k]) => [k, Number(stats[k]) || 0])),
        skills: skills.map(s => ({ id_skill: s.id_skill, pref: s.pref, expert: s.expert })),
        move_ids,
        id_abilitie: pasiva?.ability_id ?? null,
      }
      // Editar = PATCH sobre el existente. Crear y clonar = POST (nuevo Pokémon).
      const res = mode === 'edit'
        ? await apiFetch(`/master/pokemon/${sourceId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await apiFetch('/master/pokemon', { method: 'POST', body: JSON.stringify(payload) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'No se pudo guardar') }
      onCreated?.()
    } catch (e) {
      setError(e.message || 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  // Cargando el detalle (editar / clonar)
  if (loading) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="bg-white rounded-2xl px-8 py-6 shadow-2xl flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={18} /> Cargando...
        </div>
      </div>
    )
  }

  // ── Paso 1: elegir Pokémon (solo al crear; todos, sin filtro inicial) ──
  if (!pokemon) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
          <button onClick={onClose} className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
            <X size={18} />
          </button>
          <PokemonList title="Elige un Pokémon" onChoose={choose} />
        </div>
      </div>
    )
  }

  const sprite = pokemon.pokemon_media_sprite || pokemon.pokemon_media_main
  const heading = mode === 'edit' ? 'Editar Pokémon' : mode === 'clone' ? 'Clonar Pokémon' : 'Nuevo Pokémon'

  // ── Paso 2: confirmación editable ──
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {sprite && <img src={sprite} alt="" className="w-8 h-8 object-contain shrink-0" />}
            <h2 className="font-bold text-gray-900 truncate">{heading} <span className="text-gray-400 font-normal">({pokemon.pokemon_name})</span></h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Nombre</label>
            <input value={apodo} onChange={e => setApodo(e.target.value)} placeholder={pokemon.pokemon_name}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>

          {/* Tipos */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Tipos</label>
            <div className="grid grid-cols-2 gap-2">
              <TypeSelect types={types} value={type1} onChange={setType1} />
              <TypeSelect types={types} value={type2} onChange={setType2} allowEmpty />
            </div>
            <div className="mt-3">
              <TypeEffectivenessView typeId1={type1} typeId2={type2} />
            </div>
          </div>

          {/* Género + HP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Género</label>
              {gOpts.length === 0 ? <p className="text-sm text-gray-400 italic">Sin género</p> : (
                <div className="flex gap-2">
                  {gOpts.map(o => {
                    const sel = genero === o.v
                    return (
                      <button key={o.v} onClick={() => setGenero(o.v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                          sel ? `${o.on} text-white` : `border-gray-200 ${o.off} hover:border-gray-300 bg-white`}`}>
                        <o.Icon size={17} strokeWidth={2.5} /> {o.L}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Hit Points</label>
              <input type="number" min={0} value={hp} onChange={e => setHp(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>

          {/* Naturaleza (solo lectura) */}
          {nature && (
            <p className="text-xs text-gray-500">
              Naturaleza: <span className="font-semibold text-gray-700">{nature.nature_name}</span>
              {nature.nature_effect_increase && nature.nature_effect_increase !== '-' &&
                <> · <span className="text-green-600 font-semibold">{nature.nature_effect_increase} +{nature.nature_effect_increase_value}</span>
                   <span className="text-red-600 font-semibold ml-1">{nature.nature_effect_decrease} {nature.nature_effect_decrease_value}</span></>}
            </p>
          )}

          {/* Stats */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Stats</label>
            <div className="grid grid-cols-3 gap-2">
              {STAT_FIELDS.map(([k, lbl]) => {
                const mod = modOf(k)
                return (
                  <div key={k} className="border border-gray-200 rounded-xl px-2.5 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-700">{lbl}</span>
                      <span className={`text-[11px] font-bold ${mod < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtMod(mod)}</span>
                    </div>
                    <input type="number" min={0} value={stats[k]} onChange={e => setStat(k, e.target.value)}
                      className="w-full mt-0.5 px-1 py-1 text-sm font-bold text-center border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500">Habilidades</label>
              <span className="text-[9px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5">Proficient</span>
              <span className="text-[9px] font-bold text-white bg-blue-700 rounded px-1.5 py-0.5">Expert</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {skills.map(s => (
                <div key={s.id_skill} className="flex items-center gap-2 py-0.5 min-w-0">
                  <button onClick={() => toggleSkill(s.id_skill, 'pref')} title="Proficiente"
                    className={`w-4 h-4 rounded-[3px] border-2 shrink-0 ${s.pref && !s.expert ? 'bg-green-600 border-green-600' : s.expert ? 'bg-green-600 border-green-600 opacity-50' : 'border-gray-300 bg-white'}`} />
                  <button onClick={() => toggleSkill(s.id_skill, 'expert')} title="Experto"
                    className={`w-4 h-4 rounded-[3px] border-2 shrink-0 ${s.expert ? 'bg-blue-700 border-blue-700' : 'border-gray-300 bg-white'}`} />
                  <span className={`w-7 shrink-0 text-center text-[11px] font-bold ${skillMod(s) < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmtMod(skillMod(s))}</span>
                  <span className="text-[12px] text-gray-800 truncate min-w-0">{s.skill_name} <span className="text-gray-400">({s.related})</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Pasiva */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Pasiva</label>
            <button onClick={() => setAbilityPicker(true)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 hover:border-red-300 transition-colors text-left">
              <span className={pasiva ? 'font-semibold text-gray-800' : 'text-gray-400'}>{pasiva ? pasiva.ability_name : 'Selecciona una pasiva...'}</span>
              <Search size={15} className="text-gray-400 shrink-0" />
            </button>
          </div>

          {/* Movimientos */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Movimientos</label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-100">
                <span className="text-sm font-semibold text-gray-700">{struggle?.move_name || 'Struggle'}</span>
                <span className="text-[10px] font-bold text-gray-400">fijo</span>
              </div>
              {moves.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button onClick={() => setMovePicker({ index: i })}
                    className="flex-1 flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 hover:border-red-300 transition-colors text-left">
                    <span className="font-semibold text-gray-800 truncate">{m.move_name}</span>
                    <Search size={15} className="text-gray-400 shrink-0" />
                  </button>
                  <button onClick={() => removeMove(i)} title="Quitar" className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              ))}
              {moves.length < MAX_MOVES && (
                <button onClick={() => setMovePicker({ add: true })}
                  className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-600 text-sm font-semibold rounded-xl transition-colors">
                  <Plus size={15} /> Agregar movimiento
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} disabled={saving} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg disabled:opacity-40">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg transition-colors">
            {saving && <Loader2 size={15} className="animate-spin" />} Guardar
          </button>
        </div>
      </div>

      {/* Popup pasivas */}
      {abilityPicker && (
        <SearchModal title="Elegir pasiva" endpoint="/abilities"
          render={{ key: a => a.ability_id, row: a => (
            <><span className="text-sm font-bold text-gray-800">{a.ability_name}</span>
              {a.ability_description && <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-2">{a.ability_description}</p>}</>
          ) }}
          onPick={a => setPasiva({ ability_id: a.ability_id, ability_name: a.ability_name })}
          onClose={() => setAbilityPicker(false)} />
      )}

      {/* Popup movimientos */}
      {movePicker && (
        <SearchModal title="Elegir movimiento" endpoint="/moves"
          render={{ key: m => m.move_id, row: m => (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800 truncate">{m.move_name}</span>
              <span className="text-[10px] text-gray-500 shrink-0">{m.move_type} · PP {m.move_pp}</span>
            </div>
          ) }}
          onPick={m => { if (movePicker.add) addMove(m); else replaceMove(movePicker.index, m) }}
          onClose={() => setMovePicker(null)} />
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { apiFetch } from '../api'

/* Panel del master (acordeón) para editar jugadores conectados.
   Por ahora solo muestra el listado + un check que representa personaje_is_editable.
   onAfterChange: se llama tras cambiar el flag (para avisar a los trainers vía party_update). */
/* Selector de terreno: "Ninguno" o alguno del catálogo */
function SelectTerreno({ value, terrenos, onChange, disabled }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)} disabled={disabled}
      title="Terreno"
      className="text-[11px] text-gray-100 bg-gray-700 border border-gray-600 rounded-md px-1.5 py-0.5 max-w-[8.5rem]
                 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50">
      <option value="">Sin terreno</option>
      {terrenos.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  )
}

export default function EdicionJugadoresPanel({ partidaId, presentes = [], partyVersion, onAfterChange, invocados = {} }) {
  const [open, setOpen] = useState(false)
  const [editable, setEditable] = useState({}) // personaje_id → bool
  const [inspirado, setInspirado] = useState({}) // personaje_id → bool
  const [nombres, setNombres] = useState({})   // personaje_id → nombre del personaje
  const [saving, setSaving] = useState(null)    // personaje_id que se está guardando
  const [terrenos, setTerrenos] = useState([])  // catálogo de terrenos
  const [party, setParty] = useState({})        // personaje_id → { terreno, pokemons }

  useEffect(() => {
    apiFetch('/partida/terrenos').then(r => r.json()).then(d => setTerrenos(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const reload = useCallback(() => {
    return apiFetch(`/personaje/party?id_partida=${partidaId}`)
      .then(r => r.json())
      .then(list => {
        const map = {}, insp = {}, nom = {}, par = {}
        for (const c of (Array.isArray(list) ? list : [])) {
          map[String(c.id_personaje)] = !!c.personaje_is_editable
          insp[String(c.id_personaje)] = !!c.personaje_inspirado
          nom[String(c.id_personaje)] = c.nombre_personaje
          par[String(c.id_personaje)] = { terreno: c.personaje_terreno ?? null, pokemons: c.pokemons || [] }
        }
        setEditable(map)
        setInspirado(insp)
        setNombres(nom)
        setParty(par)
      })
      .catch(() => {})
  }, [partidaId])

  useEffect(() => { reload() }, [reload, partyVersion])

  // Jugadores conectados con personaje activo (deduplicado por personaje)
  const seen = new Set()
  const jugadores = []
  for (const p of presentes) {
    if (p.role === 'master') continue
    if (p.personaje_id == null) continue
    const key = String(p.personaje_id)
    if (seen.has(key)) continue
    seen.add(key)
    jugadores.push(p)
  }

  const toggle = async (personaje_id) => {
    const key = String(personaje_id)
    const next = !editable[key]
    setEditable(prev => ({ ...prev, [key]: next })) // optimista
    setSaving(`${personaje_id}-editable`)
    try {
      const res = await apiFetch(`/personaje/${personaje_id}/editable`, {
        method: 'PATCH', body: JSON.stringify({ is_editable: next }),
      })
      if (!res.ok) throw new Error()
      onAfterChange?.() // avisa a los trainers para que actualicen su lápiz
    } catch {
      setEditable(prev => ({ ...prev, [key]: !next })) // revierte si falla
    } finally {
      setSaving(null)
    }
  }

  // Igual que toggle, pero para el punto de inspiración. onAfterChange avisa a
  // la party para que el aura aparezca/desaparezca sin que el jugador recargue.
  const toggleInspirado = async (personaje_id) => {
    const key = String(personaje_id)
    const next = !inspirado[key]
    setInspirado(prev => ({ ...prev, [key]: next }))
    setSaving(`${personaje_id}-inspirado`)
    try {
      const res = await apiFetch(`/personaje/${personaje_id}/inspirado`, {
        method: 'PATCH', body: JSON.stringify({ inspirado: next }),
      })
      if (!res.ok) throw new Error()
      onAfterChange?.()
    } catch {
      setInspirado(prev => ({ ...prev, [key]: !next }))
    } finally {
      setSaving(null)
    }
  }

  // Terreno del entrenador o de su Pokémon: optimista, y se revierte si falla.
  const ponerTerreno = async (tipo, personaje_id, idpp, terreno) => {
    const key = String(personaje_id)
    const antes = party
    setParty(prev => {
      const c = prev[key]; if (!c) return prev
      return { ...prev, [key]: tipo === 'personaje'
        ? { ...c, terreno }
        : { ...c, pokemons: c.pokemons.map(p => String(p.id_personaje_pokemon) === String(idpp) ? { ...p, personaje_pokemon_terreno: terreno } : p) } }
    })
    try {
      const ruta = tipo === 'personaje' ? `personaje/${personaje_id}` : `pokemon/${idpp}`
      const res = await apiFetch(`/partida/${partidaId}/terreno/${ruta}`, { method: 'PATCH', body: JSON.stringify({ terreno }) })
      if (!res.ok) throw new Error()
      onAfterChange?.()
    } catch {
      setParty(antes)
    }
  }

  return (
    <div className="shrink-0 px-4 pt-3">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-1.5 py-2 bg-gray-800 hover:bg-gray-700
                   border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-colors">
        <span>Edición de Jugadores (Stats, Feats, Level UP ... ETC)</span>
        <ChevronDown size={15} className={`transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl divide-y divide-gray-700/60 overflow-hidden">
          {jugadores.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic px-3 py-3">No hay jugadores conectados.</p>
          ) : jugadores.map(p => {
            const key = String(p.personaje_id)
            const on = !!editable[key]
            const insp = !!inspirado[key]
            const datos = party[key]
            const invId = key in invocados ? invocados[key] : p.pokemon_invocado
            const pokemon = invId != null
              ? (datos?.pokemons || []).find(x => String(x.id_personaje_pokemon) === String(invId)) : null
            return (
              <div key={key}>
              <div className="flex items-center justify-between gap-x-2 gap-y-1.5 px-3 py-2 flex-wrap">
                {/* Se muestra el nombre del personaje; el del usuario solo como
                    respaldo mientras carga el listado de la partida. */}
                <span className="text-sm text-gray-100 truncate">
                  {nombres[key] || p.user_name || 'Jugador'}
                </span>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <SelectTerreno value={datos?.terreno} terrenos={terrenos} disabled={!datos}
                    onChange={t => ponerTerreno('personaje', p.personaje_id, null, t)} />
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Editable</span>
                    <button onClick={() => toggle(p.personaje_id)} disabled={saving === `${p.personaje_id}-editable`}
                      className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-colors disabled:opacity-50 ${
                        on ? 'bg-green-600 border-green-600' : 'border-gray-500 bg-gray-700'}`}
                      title={on ? 'Edición habilitada' : 'Edición deshabilitada'}>
                      {on && <Check size={13} className="text-white" strokeWidth={3} />}
                    </button>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Inspirado</span>
                    <button onClick={() => toggleInspirado(p.personaje_id)} disabled={saving === `${p.personaje_id}-inspirado`}
                      className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-colors disabled:opacity-50 ${
                        insp ? 'bg-amber-500 border-amber-500' : 'border-gray-500 bg-gray-700'}`}
                      title={insp ? 'Inspirado' : 'No inspirado'}>
                      {insp && <Check size={13} className="text-gray-900" strokeWidth={3} />}
                    </button>
                  </label>
                </div>
              </div>
              {/* El Pokémon invocado, justo debajo de su entrenador */}
              {pokemon && (
                <div className="flex items-center justify-between gap-2 pl-7 pr-3 py-1.5 bg-gray-900/30">
                  <span className="text-xs text-gray-300 truncate">
                    <span className="text-gray-500 mr-1">↳</span>
                    {pokemon.pokemon_apodo} <span className="text-gray-500">({nombres[key] || p.user_name || 'Jugador'})</span>
                  </span>
                  <SelectTerreno value={pokemon.personaje_pokemon_terreno} terrenos={terrenos}
                    onChange={t => ponerTerreno('pokemon', p.personaje_id, pokemon.id_personaje_pokemon, t)} />
                </div>
              )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import Hoja from './ui/Hoja'
import Boton from './ui/Boton'
import MasterPokemonFeats from './MasterPokemonFeats'
import PokeballSpinner from './PokeballSpinner'

const STAT_KEYS = ['dex', 'str', 'con', 'int', 'wis', 'cha']

/**
 * Entrenar un feat a mano a un Pokémon (lápiz de la Femputadora, con la
 * aprobación del DM). Es el mismo selector de la subida de nivel, con los
 * mismos prerrequisitos y elecciones: los repetibles se pueden volver a tomar
 * y los no repetibles que ya tiene no salen. No gasta puntos.
 */
export default function EntrenarFeatPokemon({ personajeId, pokemon, onClose, onEntrenado }) {
  const idpp = pokemon.id_personaje_pokemon
  const [ctx, setCtx] = useState(null)
  const [skillsList, setSkillsList] = useState([])
  const [feats, setFeats] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/feats/contexto`).then(r => (r.ok ? r.json() : null))
      .then(d => { if (vigente) d ? setCtx(d) : setError('No se pudo cargar el Pokémon') }).catch(() => { if (vigente) setError('No se pudo cargar el Pokémon') })
    apiFetch('/skills').then(r => r.json()).then(d => { if (vigente) setSkillsList(Array.isArray(d) ? d : (d.data ?? [])) }).catch(() => {})
    return () => { vigente = false }
  }, [personajeId, idpp])

  // Stats para los prerrequisitos: base + bonus + lo que ya dan sus feats
  const st = ctx?.stats || {}
  const prev = Object.fromEntries(STAT_KEYS.map(k => [k, 0]))
  for (const f of (ctx?.feats || [])) for (const b of (f.bonos || [])) {
    const t = (b.type || '').toLowerCase(), llave = (b.llave || '').toLowerCase()
    if (t === 'stat' && prev[llave] !== undefined) prev[llave] += Number(b.value) || 0
  }
  const statCtx = Object.fromEntries(STAT_KEYS.map(k => [k, (Number(st[`pokemon_${k}`]) || 0) + (Number(st[`pokemon_${k}_bonus`]) || 0) + prev[k]]))
  const skillCtx = (ctx?.skills || []).map(s => ({ skill_name: s.skill_name, pref: s.pokemon_skill_pref, expert: s.pokemon_skill_expert }))
  const elementosPrevios = (ctx?.feats || [])
    .flatMap(f => (f.bonos || []).filter(x => (x.type || '').toLowerCase() === 'element').map(x => x.value)).filter(Boolean)

  const guardar = async () => {
    const f = feats[0]
    if (!f) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/feats`, {
        method: 'POST', body: JSON.stringify({ feat_id: f.feat_id, bonos: f.bonos || [] }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(res.status === 409 ? 'Ese feat no es repetible y el Pokémon ya lo tiene' : (j.error || 'No se pudo entrenar el feat'))
        setBusy(false); return
      }
      onEntrenado?.(f.feat_name || 'un feat')
      onClose()
    } catch { setError('No se pudo entrenar el feat'); setBusy(false) }
  }

  return (
    <Hoja z="z-[96]" ancho="sm:max-w-lg" alto="max-h-[90dvh]" onClose={onClose}
      titulo={`Entrenar feat · ${pokemon.pokemon_apodo}`}
      pie={
        <div className="space-y-2">
          {error && <p className="text-[13px] text-peligro">{error}</p>}
          <div className="flex justify-end gap-2">
            <Boton variante="tintado" onClick={onClose}>Cancelar</Boton>
            <Boton onClick={guardar} disabled={!feats.length || busy}>{busy && <PokeballSpinner size={14} />} Entrenar</Boton>
          </div>
        </div>
      }>
      {!ctx ? (
        <div className="py-10 flex justify-center text-texto-2">{error || <PokeballSpinner size={20} />}</div>
      ) : (
        <MasterPokemonFeats feats={feats} setFeats={setFeats} level={ctx.level}
          stats={statCtx} skills={skillCtx} skillsList={skillsList}
          movePool={ctx.move_pool || []} learnedMoves={ctx.learned_moves || []}
          hiddenAbilities={ctx.hidden_abilities || []} maxMovesActual={ctx.max_moves ?? null}
          ownedFeatIds={ctx.owned_feat_ids || []} elementosExcluidos={elementosPrevios}
          maxFeats={1} />
      )}
    </Hoja>
  )
}

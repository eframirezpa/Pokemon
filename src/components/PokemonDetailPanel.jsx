import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'
import { apiFetch } from '../api'
import MoveInfoModal from './MoveInfoModal'
import { claveMove } from '../lib/moveName'
import { xpAlAtrapar, xpAlDerrotar } from '../lib/xpAtrapar'
import { genderLabel, numeroPokedex } from '../lib/pokedex'
import { ListaAgrupada } from './ui/ListaAgrupada'
import { CabeceraPokemon, Caracteristicas, DatosCombate, FilaDato, Habilidades, Evoluciones, Movimientos, NotasPokemon } from './pokedex/FichaPokemon'

// Detalle de una especie al lado de la lista de la Pokédex (o en la hoja
// inferior en el celular). Mismas piezas que la página completa, en compacto.

/* Botón redondo gris de la barra superior */
function BotonRedondo({ onClick, titulo, children }) {
  return (
    <button type="button" onClick={onClick} title={titulo} aria-label={titulo}
      className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2 hover:text-texto transition-colors">
      {children}
    </button>
  )
}

/* ── main component ── */
// onAmpliar: si se pasa, "ampliar" abre la ficha completa donde diga quien
// monta el panel (la Pokédex de la partida la pone encima de la sala) en vez
// de navegar a la página de consulta.
export default function PokemonDetailPanel({ id, onClose, onSelectId, onChoose, moveDetail = false, invokedLevel = null, onAmpliar = null }) {
  const navigate  = useNavigate()
  const [pk,       setPk]      = useState(null)
  const [evols,    setEvols]   = useState([])
  const [abilities,setAbils]   = useState({})
  const [movesMap, setMoves]   = useState({})
  const [tmsMap,   setTms]     = useState({})
  const [shiny,    setShiny]   = useState(false)
  const [loading,  setLoading] = useState(true)
  const [moveInfo, setMoveInfo] = useState(null)   // detalle del movimiento (popup pokédex)

  // Abre el popup con los datos del listado y completa con el detalle del backend
  const openMoveInfo = useCallback((m) => {
    setMoveInfo(m)
    apiFetch(`/moves/${m.move_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(full => { if (full) setMoveInfo(cur => (cur && cur.move_id === full.move_id) ? full : cur) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true); setShiny(false)
    Promise.all([
      apiFetch(`/pokemon/${id}`).then(r => r.json()),
      apiFetch(`/evolution/pokemon/${id}`).then(r => r.json()),
      apiFetch('/moves?limit=1000').then(r => r.json()),
      // Todos los TM (hoy son 256): con limit=200 se perdían del 201 en adelante
      apiFetch('/tm?limit=1000').then(r => r.json()),
    ]).then(([pkData, evolData, movData, tmData]) => {
      setPk(pkData)
      setEvols(Array.isArray(evolData) ? evolData : (evolData.value ?? []))
      const mm = {}
      for (const m of (movData.data ?? [])) mm[claveMove(m.move_name)] = m
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

  const barra = (titulo, sub = null) => (
    <div className="flex items-center gap-2 px-4 py-3 shrink-0 bg-superficie/90 backdrop-blur border-b border-separador">
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="font-semibold text-[15px] text-texto truncate">{titulo}</span>
        {sub && <span className="text-xs text-texto-2 tabular-nums shrink-0">{sub}</span>}
      </div>
      {pk && !pk.error && (
        <BotonRedondo onClick={() => onAmpliar ? onAmpliar(id) : navigate(`/pokemon/${id}`)} titulo="Ver ficha completa"><ExternalLink size={15} /></BotonRedondo>
      )}
      <BotonRedondo onClick={onClose} titulo="Cerrar"><X size={16} strokeWidth={2.4} /></BotonRedondo>
    </div>
  )

  if (loading) return (
    <div className="flex flex-col h-full min-h-[240px] bg-fondo text-texto">
      {barra(<span className="inline-block h-3.5 w-24 rounded bg-relleno animate-pulse align-middle" />)}
      <div className="p-4 flex flex-col gap-3">
        <div className="h-[150px] rounded-tarjeta bg-relleno animate-pulse" />
        <div className="h-14 rounded-xl bg-relleno animate-pulse" />
      </div>
    </div>
  )

  if (!pk || pk.error) return (
    <div className="flex flex-col h-full bg-fondo text-texto">
      {barra('No encontrado')}
    </div>
  )

  const abilityEntries = [
    pk.pokemon_ability_1 && { id: pk.pokemon_ability_1, hidden: !!pk.pokemon_ability_1_is_hidden },
    pk.pokemon_ability_2 && { id: pk.pokemon_ability_2, hidden: !!pk.pokemon_ability_2_is_hidden },
    pk.pokemon_ability_3 && { id: pk.pokemon_ability_3, hidden: !!pk.pokemon_ability_3_is_hidden },
    pk.pokemon_ability_4 && { id: pk.pokemon_ability_4, hidden: !!pk.pokemon_ability_4_is_hidden },
  ].filter(Boolean)

  // Al navegar (ej. a una evolución) esto sigue mostrando la especie que se
  // está viendo, no la del Pokémon invocado: invokedLevel solo aplica
  // mientras el detalle abierto es el suyo (lo filtra quien lo pasa,
  // PokemonList).
  const nivel = invokedLevel ?? pk.pokemon_min_level
  const xp = xpAlAtrapar(nivel, pk.pokemon_sr)
  const info = [
    ['XP al derrotar', xpAlDerrotar(nivel ?? pk.pokemon_min_level, pk.pokemon_sr)?.toLocaleString()],
    ['XP al atrapar', xp?.toLocaleString()],
    ['Talla', pk.pokemon_size],
    ['SR', pk.pokemon_sr],
    [invokedLevel != null ? 'Nivel' : 'Nivel mín.', nivel],
    ['Grupo huevo', pk.pokemon_egg_group],
    ['Género', genderLabel(pk.pokemon_gender)],
    ['Bioma', pk.pokemon_habitat_biomes],
  ].filter(([, v]) => v != null && v !== '')

  // En modo selección (onChoose) no se permite navegar a evoluciones
  const irA = onChoose ? null : (eid) => onSelectId?.(eid)
  const alMove = moveDetail ? openMoveInfo : undefined

  return (
    <div className="flex flex-col h-full bg-fondo text-texto">
      {barra(pk.pokemon_name, numeroPokedex(pk.pokemon_number))}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 [&>*]:shrink-0">
        <CabeceraPokemon pk={pk} shiny={shiny} onShiny={() => setShiny(s => !s)} onChoose={onChoose} compacta />
        <Caracteristicas pk={pk} />
        <ListaAgrupada titulo="Información">
          {info.map(([l, v]) => <FilaDato key={l} etiqueta={l}>{v}</FilaDato>)}
        </ListaAgrupada>
        {pk.pokemon_description && (
          <p className="text-[13px] italic leading-relaxed text-texto-2 px-1">“{pk.pokemon_description}”</p>
        )}
        <div>
          <h3 className="text-[13px] font-semibold text-texto-2 uppercase tracking-[.03em] px-4 pb-1.5">Combate</h3>
          <DatosCombate pk={pk} />
        </div>
        <Habilidades entradas={abilityEntries} abilities={abilities} compacta />
        <Evoluciones evoluciones={evols} onNavigate={irA} />
        <Movimientos pk={pk} movesMap={movesMap} tmsMap={tmsMap} onMoveClick={alMove} />
        <NotasPokemon texto={pk.pokemon_notes} />
      </div>

      {/* Detalle del movimiento (estilo pokédex) */}
      {moveInfo && <MoveInfoModal m={moveInfo} theme="pokedex" onClose={() => setMoveInfo(null)} />}
    </div>
  )
}

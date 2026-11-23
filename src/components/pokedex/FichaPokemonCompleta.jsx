import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft } from 'lucide-react'
import { apiFetch } from '../../api'
import { claveMove } from '../../lib/moveName'
import { xpAlAtrapar, xpAlDerrotar } from '../../lib/xpAtrapar'
import { genderLabel, numeroPokedex } from '../../lib/pokedex'
import MoveInfoModal from '../MoveInfoModal'
import { Pagina, Vacio } from '../ui/Pagina'
import { ListaAgrupada } from '../ui/ListaAgrupada'
import { CabeceraPokemon, Caracteristicas, DatosCombate, FilaDato, Habilidades, Evoluciones, Movimientos, NotasPokemon } from './FichaPokemon'

// Ficha completa de una especie. La usan la página /pokemon/:id y la Pokédex
// de la partida, que la abre encima de la sala al ampliar un Pokémon (antes
// navegaba a la página y sacaba al jugador de la partida).
//
//   id             — especie a mostrar
//   onVolver       — el enlace de arriba ("‹ Pokédex")
//   etiquetaVolver — su texto
//   onIrA(id)      — abrir otra especie (las evoluciones)
//   nivel          — nivel real (Pokémon invocado por el master): la XP al
//                    atraparlo se calcula con él en vez del nivel mínimo
export default function FichaPokemonCompleta({ id, onVolver, etiquetaVolver = 'Pokédex', onIrA, nivel = null }) {
  const [pk,    setPk]        = useState(null)
  const [evols, setEvols]     = useState([])
  const [abilities, setAbils] = useState({})
  const [movesMap, setMovesMap] = useState({})
  const [moveInfo, setMoveInfo] = useState(null)   // detalle del movimiento (popup pokédex)

  // Abre el popup con los datos del listado y completa con el detalle del backend
  const openMoveInfo = useCallback((m) => {
    setMoveInfo(m)
    apiFetch(`/moves/${m.move_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(full => { if (full) setMoveInfo(cur => (cur && cur.move_id === full.move_id) ? full : cur) })
      .catch(() => {})
  }, [])
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
      // Todos los TM (hoy son 256): con limit=200 se perdían del 201 en adelante
      apiFetch('/tm?limit=1000').then(r => r.json()),
    ])
      .then(([pkData, evolData, movData, tmData]) => {
        setPk(pkData)
        setEvols(Array.isArray(evolData) ? evolData : (evolData.value ?? []))
        const movMap = {}
        for (const m of (movData.data ?? [])) {
          movMap[claveMove(m.move_name)] = m
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

  const goTo = onIrA

  const volver = (
    <button type="button" onClick={onVolver}
      className="self-start inline-flex items-center gap-0.5 -ml-1.5 text-[15px] text-tinte hover:opacity-75">
      <ChevronLeft size={20} aria-hidden /> {etiquetaVolver}
    </button>
  )

  if (loading) {
    return (
      <Pagina>
        {volver}
        <div className="h-[180px] rounded-tarjeta bg-relleno animate-pulse" />
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-relleno animate-pulse" />)}
        </div>
      </Pagina>
    )
  }

  if (!pk || pk.error) {
    return (
      <Pagina>
        {volver}
        <Vacio titulo="Pokémon no encontrado" detalle="Puede que el enlace esté mal o que la especie ya no exista." />
      </Pagina>
    )
  }

  const abilityEntries = [
    pk.pokemon_ability_1 && { id: pk.pokemon_ability_1, hidden: !!pk.pokemon_ability_1_is_hidden },
    pk.pokemon_ability_2 && { id: pk.pokemon_ability_2, hidden: !!pk.pokemon_ability_2_is_hidden },
    pk.pokemon_ability_3 && { id: pk.pokemon_ability_3, hidden: !!pk.pokemon_ability_3_is_hidden },
    pk.pokemon_ability_4 && { id: pk.pokemon_ability_4, hidden: !!pk.pokemon_ability_4_is_hidden },
  ].filter(Boolean)

  const xp = xpAlAtrapar(nivel ?? pk.pokemon_min_level, pk.pokemon_sr)
  const info = [
    ['N.°', numeroPokedex(pk.pokemon_number)],
    ['XP al derrotar', xpAlDerrotar(nivel ?? pk.pokemon_min_level, pk.pokemon_sr)?.toLocaleString()],
    ['XP al atrapar', xp?.toLocaleString()],
    ['Talla', pk.pokemon_size],
    ['SR', pk.pokemon_sr],
    [nivel != null ? 'Nivel' : 'Nivel mín.', nivel ?? pk.pokemon_min_level],
    ['Grupo huevo', pk.pokemon_egg_group],
    ['Género', genderLabel(pk.pokemon_gender)],
    ['Bioma', pk.pokemon_habitat_biomes],
  ].filter(([, v]) => v != null && v !== '')

  return (
    <Pagina>
      {volver}
      <CabeceraPokemon pk={pk} shiny={shiny} onShiny={() => setShiny(s => !s)} />
      <Caracteristicas pk={pk} />

      {pk.pokemon_special_ability_text && (
        <p className="text-[15px] text-texto-2 px-1">{pk.pokemon_special_ability_text}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <ListaAgrupada titulo="Información">
          {info.map(([l, v]) => <FilaDato key={l} etiqueta={l}>{v}</FilaDato>)}
        </ListaAgrupada>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-[13px] font-semibold text-texto-2 uppercase tracking-[.03em] px-4 pb-1.5">Combate</h3>
            <DatosCombate pk={pk} />
          </div>
          {pk.pokemon_description && (
            <ListaAgrupada titulo="Descripción">
              <p className="px-4 py-3 text-[14px] italic leading-relaxed text-texto-2">“{pk.pokemon_description}”</p>
            </ListaAgrupada>
          )}
        </div>
      </div>

      <Habilidades entradas={abilityEntries} abilities={abilities} />
      <Evoluciones evoluciones={evols} onNavigate={goTo} />
      <Movimientos pk={pk} movesMap={movesMap} tmsMap={tmsMap} onMoveClick={openMoveInfo} />
      <NotasPokemon texto={pk.pokemon_notes} />

      {moveInfo && <MoveInfoModal m={moveInfo} theme="pokedex" onClose={() => setMoveInfo(null)} />}
    </Pagina>
  )
}

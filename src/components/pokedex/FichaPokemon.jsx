import { useState } from 'react'
import { Sparkles, Check, ChevronRight } from 'lucide-react'
import { TYPE_COLORS } from '../../lib/partidaShared'
import { claveMove } from '../../lib/moveName'
import { TypeBadge } from '../partida/TypeBadge'
import { ListaAgrupada, CeldaDesplegable } from '../ui/ListaAgrupada'
import Ficha from '../ui/Ficha'
import { splitList, slugToTitle, statMod, numeroPokedex } from '../../lib/pokedex'

// Piezas de la ficha de un Pokémon de la Pokédex. Las usan la página completa
// (PokemonDetail) y el panel lateral de la lista (PokemonDetailPanel), así las
// dos se ven igual. `compacta` es para el panel (≈ 400 px de ancho).

/* Tarjeta de cabecera teñida con el color del primer tipo, con la pokébola
   de fondo. Lleva el sprite, nombre, tipos, botones y las tres fichas de
   combate (CA, PG, velocidad). */
export function CabeceraPokemon({ pk, shiny, onShiny, onChoose = null, compacta = false }) {
  const bg = TYPE_COLORS[pk.pokemon_type_1]?.bg ?? '#A8A878'
  const img = shiny ? pk.pokemon_media_main_shiny : pk.pokemon_media_main

  return (
    <section className={`relative overflow-hidden rounded-tarjeta text-[#1C1C1E] ${compacta ? 'p-4' : 'p-4 sm:px-5'}`}
      style={{ backgroundColor: `color-mix(in srgb, ${bg} 55%, white)` }}>
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 w-[300px] h-[300px] rounded-full border-[30px] border-white/40" />
      <span aria-hidden className="pointer-events-none absolute -right-16 top-[55px] w-[300px] h-[30px] bg-white/40" />

      <div className="relative flex items-center gap-4 sm:gap-5">
        <img src={img} alt={pk.pokemon_name}
          className={`object-contain shrink-0 ${compacta ? 'w-24 h-24' : 'w-24 h-24 sm:w-[132px] sm:h-[132px]'}`}
          onError={e => { e.currentTarget.style.opacity = '0.2' }} />
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          <Titulo pk={pk} compacta={compacta} />
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge type={pk.pokemon_type_1} tamano="md" />
            <TypeBadge type={pk.pokemon_type_2} tamano="md" />
            <span className="flex-1" />
            {pk.pokemon_media_main_shiny && (
              <button type="button" onClick={onShiny} aria-pressed={shiny}
                className={`h-[30px] px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${
                  shiny ? 'bg-[#1C1C1E] text-[#FFD60A]' : 'bg-white/75 text-[#7F00B2] hover:bg-white'}`}>
                <Sparkles size={14} aria-hidden /> Shiny
              </button>
            )}
            {onChoose && (
              <button type="button" onClick={() => onChoose(pk)}
                className="h-[30px] px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[#7F00B2] text-white hover:bg-[#6A0096]">
                <Check size={14} aria-hidden /> Seleccionar
              </button>
            )}
          </div>
          {/* Escritorio: las fichas de combate van en la columna del nombre */}
          <FichasCombate pk={pk} compacta={compacta} className={`${compacta ? 'hidden' : 'hidden sm:grid'}`} />
        </div>
      </div>
      {/* Celular y panel: debajo, a todo el ancho */}
      <FichasCombate pk={pk} compacta={compacta} className={`relative mt-3 ${compacta ? 'grid' : 'grid sm:hidden'}`} />
    </section>
  )
}

/* CA, PG y velocidad en tres fichas sobre la tarjeta de color */
function FichasCombate({ pk, compacta, className }) {
  // Nombres cortos donde no caben los largos (panel lateral y celular)
  const corto = (c, l) => compacta ? c : <><span className="sm:hidden">{c}</span><span className="hidden sm:inline">{l}</span></>
  const extraSpeeds = [2, 3, 4].map(i => pk[`pokemon_speed_${i}_name`] && `${pk[`pokemon_speed_${i}_value`]} ${pk[`pokemon_speed_${i}_name`]}`).filter(Boolean)
  return (
    <div className={`grid-cols-3 gap-2 ${className}`}>
      <Ficha sobreColor etiqueta={corto('CA', 'Clase de Armadura')} valor={pk.pokemon_armor_class ?? '—'} />
      <Ficha sobreColor etiqueta={corto('PG', 'Puntos de Golpe')} valor={pk.pokemon_hit_points ?? '—'} sub={pk.pokemon_hit_dice} />
      <Ficha sobreColor etiqueta="Velocidad" valor={pk.pokemon_speed_1_value ?? '—'}
        sub={[pk.pokemon_speed_1_name, ...extraSpeeds].filter(Boolean).join(' · ')} />
    </div>
  )
}

function Titulo({ pk, compacta }) {
  return (
    <div className="min-w-0">
      <h1 className={`${compacta ? 'text-[22px]' : 'text-[26px] sm:text-[34px]'} leading-[1.05] font-bold tracking-[-.022em] break-words`}>{pk.pokemon_name}</h1>
      <p className="text-[13px] text-[#4A4A50] mt-0.5">
        {pk.pokemon_size} Pokémon · {numeroPokedex(pk.pokemon_number)} · SR {pk.pokemon_sr}
      </p>
    </div>
  )
}

/* Las seis características con su modificador */
export function Caracteristicas({ pk }) {
  const stats = [['STR', pk.pokemon_str], ['DEX', pk.pokemon_dex], ['CON', pk.pokemon_con],
                 ['INT', pk.pokemon_int], ['WIS', pk.pokemon_wis], ['CHA', pk.pokemon_cha]]
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
      {stats.map(([l, v]) => <Ficha key={l} etiqueta={l} valor={v ?? '—'} sub={v != null ? statMod(v) : null} />)}
    </div>
  )
}

/* Fila "etiqueta …… valor" de una lista agrupada */
export function FilaDato({ etiqueta, children }) {
  return (
    <div className="min-h-11 px-4 py-2 flex items-start gap-3 text-[15px]">
      <span className="text-texto shrink-0 pt-px">{etiqueta}</span>
      <span className="ml-auto text-right text-texto-2 min-w-0 flex flex-wrap justify-end gap-1">{children}</span>
    </div>
  )
}

const Tipos = ({ tipos }) => tipos.map(t => <TypeBadge key={t} type={t} tamano="sm" />)

/* Tiradas, competencias, sentidos y relación con los tipos */
export function DatosCombate({ pk }) {
  const vulns = splitList(pk.pokemon_vulnerabilities)
  const resis = splitList(pk.pokemon_resistances)
  const immun = splitList(pk.pokemon_immunities)
  const sentidos = [pk.pokemon_sense_1_name && `${pk.pokemon_sense_1_name} ${pk.pokemon_sense_1_value ?? ''}`.trim(),
                    pk.pokemon_sense_2_name && `${pk.pokemon_sense_2_name} ${pk.pokemon_sense_2_value ?? ''}`.trim()].filter(Boolean)
  const filas = [
    pk.pokemon_saving_throws     && <FilaDato key="st" etiqueta="Tiradas de Salvación">{pk.pokemon_saving_throws}</FilaDato>,
    pk.pokemon_proficient_skills && <FilaDato key="pr" etiqueta="Competencias">{pk.pokemon_proficient_skills}</FilaDato>,
    sentidos.length > 0          && <FilaDato key="se" etiqueta="Sentidos">{sentidos.join(', ')}</FilaDato>,
    vulns.length > 0             && <FilaDato key="vu" etiqueta="Vulnerabilidades"><Tipos tipos={vulns} /></FilaDato>,
    resis.length > 0             && <FilaDato key="re" etiqueta="Resistencias"><Tipos tipos={resis} /></FilaDato>,
    immun.length > 0             && <FilaDato key="in" etiqueta="Inmunidades"><Tipos tipos={immun} /></FilaDato>,
  ].filter(Boolean)
  if (!filas.length) return null
  return <ListaAgrupada>{filas}</ListaAgrupada>
}

/* Habilidades (normales y ocultas) */
export function Habilidades({ entradas, abilities, compacta = false }) {
  if (!entradas.length) return null
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-texto-2 uppercase tracking-[.03em] px-4 pb-1.5">Habilidades</h3>
      <div className={`grid gap-2.5 ${compacta ? '' : 'sm:grid-cols-2'}`}>
        {entradas.map(({ id: aid, hidden }) => {
          const ab = abilities[aid]
          return (
            <div key={aid} className="bg-superficie rounded-grupo px-4 py-2.5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-texto">
                {ab ? ab.ability_name : `Habilidad #${aid}`}
                {hidden && <span className="text-[11px] font-semibold px-1.5 py-px rounded-md bg-relleno text-texto-2">Oculta</span>}
              </p>
              {ab?.ability_description && <p className="text-[13px] text-texto-2 leading-snug mt-0.5">{ab.ability_description}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Especie({ id, sprite, nombre, onNavigate }) {
  const cuerpo = (
    <>
      <img src={sprite} alt="" className="w-11 h-11 object-contain [image-rendering:pixelated]" />
      <span className="text-xs font-medium text-texto truncate max-w-[84px]">{nombre}</span>
    </>
  )
  return onNavigate
    ? <button type="button" onClick={() => onNavigate(id)} title={`Ver ${nombre}`}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl hover:bg-relleno transition-colors">{cuerpo}</button>
    : <span className="flex flex-col items-center gap-0.5 px-2 py-1">{cuerpo}</span>
}

/* Cadena de evolución: cada paso es tocable si hay onNavigate */
export function Evoluciones({ evoluciones, onNavigate = null }) {
  if (!evoluciones?.length) return null
  return (
    <ListaAgrupada titulo="Evolución">
      {evoluciones.map(ev => (
        <div key={ev.evolution_id} className="px-2 py-2 flex items-center justify-center gap-1">
          <Especie onNavigate={onNavigate} id={ev.evolution_from_pokemon_id} sprite={ev.from_sprite} nombre={ev.from_name} />
          <span className="flex flex-col items-center text-[11px] text-texto-2 px-1 min-w-0">
            <ChevronRight size={16} className="text-tinte" aria-hidden />
            <span className="capitalize">{ev.evolution_condition_1_type}</span>
            <span className="font-semibold text-texto">{ev.evolution_condition_1_value}</span>
          </span>
          <Especie onNavigate={onNavigate} id={ev.evolution_to_pokemon_id} sprite={ev.to_sprite} nombre={ev.to_name} />
        </div>
      ))}
    </ListaAgrupada>
  )
}

// Nombre de un movimiento: con onMoveClick abre su detalle
function NombreMove({ move, nombre, onMoveClick }) {
  if (!onMoveClick || !move) return <span className="font-medium text-texto">{nombre}</span>
  return (
    <button type="button" onClick={() => onMoveClick(move)} title="Ver detalle del movimiento"
      className="text-left font-medium text-tinte hover:underline underline-offset-2">
      {nombre}
    </button>
  )
}

/* Una fila de movimiento: nombre y tipo arriba, datos en gris debajo */
function FilaMove({ move, onMoveClick }) {
  const datos = [move.move_power_1 && move.move_power_1 !== 'None' && `Poder ${move.move_power_1}`, move.move_pp != null && `PP ${move.move_pp}`,
                 move.move_time, move.move_range].filter(Boolean)
  return (
    <div className="py-1.5 flex flex-col gap-0.5">
      <div className="flex items-center gap-2 text-[14px]">
        <NombreMove move={move} nombre={move.move_name} onMoveClick={onMoveClick} />
        <TypeBadge type={move.move_type} tamano="sm" />
      </div>
      {datos.length > 0 && <p className="text-xs text-texto-2">{datos.join(' · ')}</p>}
    </div>
  )
}

/* Movimientos por nivel + TMs, cada grupo desplegable dentro de una lista */
export function Movimientos({ pk, movesMap, tmsMap, onMoveClick = null }) {
  const [abierto, setAbierto] = useState(null)
  const grupos = [
    ['Inicio', pk.pokemon_moves_start], ['Nivel 2', pk.pokemon_moves_level2], ['Nivel 6', pk.pokemon_moves_level6],
    ['Nivel 10', pk.pokemon_moves_level10], ['Nivel 14', pk.pokemon_moves_level14], ['Nivel 18', pk.pokemon_moves_level18],
    ['Huevo', pk.pokemon_moves_egg],
  ].map(([titulo, txt]) => [titulo, splitList(txt)]).filter(([, n]) => n.length)
  const tmNumbers = splitList(pk.pokemon_moves_tm).map(Number).filter(n => !isNaN(n))
  if (!grupos.length && !tmNumbers.length) return null
  const alternar = (t) => setAbierto(a => a === t ? null : t)

  return (
    <ListaAgrupada titulo="Movimientos">
      {grupos.map(([titulo, nombres]) => {
        const moves = nombres.map(n => movesMap[claveMove(n)]).filter(Boolean)
        return (
          <CeldaDesplegable key={titulo} titulo={titulo} valor={nombres.length}
            abierta={abierto === titulo} onToggle={() => alternar(titulo)}>
            <div className="divide-y divide-separador">
              {moves.length > 0
                ? moves.map(m => <FilaMove key={m.move_id} move={m} onMoveClick={onMoveClick} />)
                : nombres.map(n => <p key={n} className="py-1.5 italic">{n}</p>)}
            </div>
          </CeldaDesplegable>
        )
      })}
      {tmNumbers.length > 0 && (
        <CeldaDesplegable titulo="TMs" valor={tmNumbers.length} abierta={abierto === 'tm'} onToggle={() => alternar('tm')}>
          <div className="divide-y divide-separador">
            {tmNumbers.map(n => {
              const tm = tmsMap[n]
              // El TM enseña el movimiento del mismo nombre (TM.tm_name_id = moves.move_name_id)
              const move = tm ? movesMap[claveMove(tm.tm_name_id)] : null
              return (
                <div key={n} className="py-1.5 flex items-center gap-3 text-[14px]">
                  <span className="font-semibold text-tinte tabular-nums w-11 shrink-0">TM{String(n).padStart(2, '0')}</span>
                  <span className="flex-1 min-w-0">
                    {tm ? <NombreMove move={move} nombre={slugToTitle(tm.tm_name_id)} onMoveClick={onMoveClick} /> : '—'}
                  </span>
                  <span className="text-xs text-texto-2 tabular-nums shrink-0">
                    {tm?.tm_cost ? `${tm.tm_cost.toLocaleString()} po` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </CeldaDesplegable>
      )}
    </ListaAgrupada>
  )
}

/* Notas del Pokémon (aviso en ámbar suave) */
export function NotasPokemon({ texto }) {
  if (!texto) return null
  return (
    <ListaAgrupada titulo="Notas">
      <p className="px-4 py-3 text-[14px] leading-relaxed text-texto">{texto}</p>
    </ListaAgrupada>
  )
}

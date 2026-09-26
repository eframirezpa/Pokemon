import { useState, useEffect, useRef } from 'react'
import { Backpack, ChevronDown, ChevronUp, Minus, Pencil, Plus, Sword, ArrowRight, X } from 'lucide-react'
import PokeballIcon from '../PokeballIcon'
import FeatInfoModal from '../FeatInfoModal'
import MoveInfoModal from '../MoveInfoModal'
import TypeEffectivenessView from '../TypeEffectivenessView'
import ItemsPanel from '../ItemsPanel'
import WeaponPanel from '../WeaponPanel'
import { InspiradoInfoButton } from '../InspiradoAura'
import { EstadoTrigger } from '../EstadosControl'
import { ICONO_REDONDO } from '../../lib/trainerCombatShared'

const hpColorPct = pct => (pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444')

const MOVE_TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
}

// El color de tipo ya existe para los movimientos (mayúscula inicial); las
// especialidades traen el nombre del tipo en minúscula, así que se normaliza
// antes de buscarlo.
const colorDeTipoPokemon = (nombre) => {
  const n = String(nombre || '').trim()
  if (!n) return null
  const clave = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
  return MOVE_TYPE_COLORS[clave] || '#9CA3AF'
}

// Especialidades del entrenador, en un acordeón como el de Trainer Path: cada
// una aplica a un tipo de Pokémon (la insignia de color) y trae su propio
// bono, ya sea de característica o de proficiencia en una skill.
function AcordeonEspecialidades({ especialidades, className = '' }) {
  const [abierto, setAbierto] = useState(null)
  if (!especialidades.length) return null
  return (
    <div className={className}>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Especialidades</p>
      <div className="space-y-1">
        {especialidades.map(sp => {
          const id = sp.specialization_id
          const open = abierto === id
          const tipo = sp.specialization_pokemon_type_name
          const colorTipo = colorDeTipoPokemon(tipo)
          const tieneStat = !!sp.specialization_ability_score_increase
          const tieneSkill = !!sp.specialization_skill_proficiency
          return (
            <div key={id} className="bg-gray-700/50 rounded-lg overflow-hidden">
              <button onClick={() => setAbierto(open ? null : id)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-gray-700 transition-colors">
                <ChevronDown size={13}
                  className={`shrink-0 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                {tipo && (
                  <span className="text-[9px] font-bold text-white rounded px-1.5 py-0.5 shrink-0"
                    style={{ backgroundColor: colorTipo }}>
                    {tipo}
                  </span>
                )}
                <span className="text-xs font-bold text-white truncate min-w-0">{sp.specialization_name}</span>
              </button>
              {open && (
                <div className="px-2 pb-2 pl-[1.9rem]">
                  {sp.specialization_description && (
                    <p className="text-[11px] text-gray-400 leading-relaxed">{sp.specialization_description}</p>
                  )}
                  {(tieneStat || tieneSkill) && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {tieneStat && (
                        <span className="text-[10px] font-bold text-gray-200 bg-gray-700/60 border border-gray-600 rounded px-1.5 py-0.5">
                          {String(sp.specialization_ability_score_increase).toUpperCase()}{' '}
                          <span className="text-green-300">+{sp.specialization_ability_score_increase_value ?? 1}</span>
                        </span>
                      )}
                      {tieneSkill && (
                        <span className="text-[10px] font-bold text-gray-200 bg-gray-700/60 border border-gray-600 rounded px-1.5 py-0.5">
                          {sp.specialization_skill_proficiency}
                          {Number(sp.specialization_grants_expertise_if_proficient) === 1 && (
                            <span className="text-blue-300"> · exp. si ya eres prof</span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                  {!sp.specialization_description && !tieneStat && !tieneSkill && (
                    <p className="text-[11px] text-gray-500 italic">Sin detalle.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Panel de control (HP + exhaust/dsts/dstf + movimientos). Persiste cada cambio vía onPersist.
// Un recurso gastable: lápiz para ajustar lo que queda y flecha roja para
// gastar de a uno. El máximo se deriva del personaje y no se edita a mano.
//
// Lo usan los Extra Points de la ruta, los del Pokémon (bond) y los que dan los
// feats ("Lucky Points"): son la misma fila con distinto origen, así que vive
// aquí en vez de repetida en cada pestaña.
function FilaRecurso({ r, onManage, onSpend, onFeat }) {
  const vacio = r.actual <= 0
  // Los de un feat llevan su ficha detrás del nombre; los de ruta no tienen
  // nada que abrir y se quedan como texto.
  const deFeat = !!r.feat
  return (
    <div className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
      {deFeat ? (
        <button onClick={() => onFeat?.(r.feat)} title={`Ver ${r.feat.feat_name}`}
          className="min-w-0 text-left text-white text-xs font-medium truncate hover:text-amber-300 transition-colors">
          {r.nombre}
        </button>
      ) : (
        <span className="text-white text-xs font-medium truncate">{r.nombre}</span>
      )}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => onManage?.(r)} title="Ajustar puntos"
            className="shrink-0 text-gray-400 hover:text-amber-300 transition-colors">
            <Pencil size={13} />
          </button>
          {/* Los de terreno se identifican por el terreno elegido, no por su
              nombre repetido: el nombre del feat ya va a la izquierda. */}
          <span className={`text-[10px] font-black tabular-nums ${vacio ? 'text-red-400' : 'text-gray-300'}`}>
            {(r.etiqueta || r.nombre).toUpperCase()} {r.actual}/{r.maximo}
          </span>
        </div>
        <button onClick={() => onSpend?.(r)} disabled={vacio} title="Gastar un punto"
          className="flex items-center justify-center text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md transition-colors">
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// Rasgos de la ruta, plegados en un acordeón.
//
// Antes iban todos desplegados y en un entrenador de nivel alto la pestaña se
// volvía un muro de texto. Cada solapa dice de un vistazo qué se ganó y cuándo
// ("Nv 2 · Hobbyist"), y el detalle solo aparece si se pide.
//
// La lista llega ya filtrada por el backend: solo los niveles alcanzados, así
// que aquí no hay nada que decidir sobre eso.
function AcordeonPath({ rasgos, className = '' }) {
  const [abierto, setAbierto] = useState(null)
  if (!rasgos.length) return null
  return (
    <div className={className}>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Trainer Path</p>
      <div className="space-y-1">
        {rasgos.map(f => {
          const open = abierto === f.nivel
          return (
            <div key={f.nivel} className="bg-gray-700/50 rounded-lg overflow-hidden">
              <button onClick={() => setAbierto(open ? null : f.nivel)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-gray-700 transition-colors">
                <ChevronDown size={13}
                  className={`shrink-0 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                <span className="text-[9px] font-bold text-white bg-gray-600 rounded px-1.5 py-0.5 shrink-0">
                  Nv {f.nivel}
                </span>
                <span className="text-xs font-bold text-white truncate min-w-0">{f.nombre}</span>
              </button>
              {open && (
                <div className="px-2 pb-2 pl-[1.9rem]">
                  {f.descripcion && (
                    <p className="text-[11px] text-gray-400 leading-relaxed">{f.descripcion}</p>
                  )}
                  {/* Bonos del catálogo de ese nivel: "key : value", o solo la
                      llave cuando el valor viene vacío. Attack +N es la
                      excepción: el daño no tiene dónde sumarse solo, así que
                      se muestra aparte como recordatorio, aunque solo el
                      ataque se aplique de verdad. */}
                  {(f.bonos || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {f.bonos.map(b => (
                        String(b.type || '').toLowerCase() === 'attack_bonus'
                          ? (
                            <span key={b.id} className="contents">
                              <span className="text-[10px] font-bold text-gray-200 bg-gray-700/60 border border-gray-600 rounded px-1.5 py-0.5">
                                Attack <span className="text-green-300">{b.value}</span>
                              </span>
                              <span className="text-[10px] font-bold text-gray-200 bg-gray-700/60 border border-gray-600 rounded px-1.5 py-0.5">
                                Damage <span className="text-green-300">{b.value}</span>
                              </span>
                            </span>
                          )
                          : (
                            <span key={b.id}
                              className="text-[10px] font-bold text-gray-200 bg-gray-700/60 border border-gray-600 rounded px-1.5 py-0.5">
                              {b.key}{b.value ? <> : <span className="text-green-300">{b.value}</span></> : null}
                            </span>
                          )
                      ))}
                    </div>
                  )}
                  {!f.descripcion && (f.bonos || []).length === 0 && (
                    <p className="text-[11px] text-gray-500 italic">Sin detalle.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CombatePanel({ title, switchSprite = null, switchLabel = '', onSwitch, onHeldItems = null, onAtaque = null, recursosFeat = [],
                       elementos = [], weaponProfs = null, attackBonos = [], bonoRuta = { total: 0, detalle: [] }, recursosTrainer = [], initial, moves, pasivas = [], skills = [], onCastRequest, onManagePP, castDisabled = false, onPersist, onReturn, onClose, recursos = null, recursosTitulo = '', recursosRasgos = [], especialidades = [], onSpendRecurso, onManageRecurso, hitDice = null, onSpendHitDice, onManageHitDice, personajeId = null, recursosPokemon = null, onSpendBond, onManageBond, inspirado = false, onInspiradoInfo = null, onEstados = null, estadosTitle = 'Estados', partidaId = null, onCurado = null, getPresentes = null }) {
  const [tabPanel, setTabPanel] = useState('moves')
  const [v, setV] = useState(initial)
  useEffect(() => { setV(initial) }, [initial])
  const [moveInfo, setMoveInfo] = useState(null) // movimiento cuyo detalle se muestra
  const [abilityInfo, setAbilityInfo] = useState(null) // pasiva cuyo detalle se muestra
  // La fórmula guarda la altura del borde superior del panel: se abre alineada
  // con él en vez de centrada, para que las habilidades sigan viéndose debajo.
  const [verFormula, setVerFormula] = useState(null)   // null = cerrada, número = top en px
  const [featInfo, setFeatInfo] = useState(null)      // feat cuyo beneficio se muestra
  const panelRef = useRef(null)
  // Calculadora del ataque (solo entrenador). El dado se guarda como texto para
  // poder distinguir "vacío" de 0 y que el placeholder siga a la vista.
  const [dado, setDado] = useState('')
  // El modificador de la fórmula sale de un STAT (crudo, sin proficiencia de
  // skill), no de una habilidad: la lista y el cálculo salen de v.stats, la
  // misma fuente que pinta la pestaña Stats.
  const [statSel, setStatSel] = useState(null)
  const [conProf, setConProf] = useState(false)
  // Bonus: arranca en lo que dé la ruta y se puede tocar. Es texto para poder
  // distinguir "vacío" de 0 mientras se escribe.
  const [bonus, setBonus] = useState('')
  const [eligiendoStat, setEligiendoStat] = useState(false)


  if (!v) return null

  const setHp = (hp) => {
    const nhp = Math.max(0, Math.min(v.hpMax ?? 0, hp))
    setV(cur => ({ ...cur, hp: nhp })); onPersist({ hp: nhp })
  }
  const step = (field, delta) => {
    const nval = Math.max(0, (v[field] ?? 0) + delta)
    setV(cur => ({ ...cur, [field]: nval })); onPersist({ [field]: nval })
  }
  const pct = v.hpMax ? Math.max(0, Math.min(100, Math.round((v.hp / v.hpMax) * 100))) : 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {/* max-h + scroll: en pantallas bajas el panel se recortaba por abajo */}
      <div ref={panelRef} className={`bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-2xl max-h-[90vh] overflow-y-auto ${(moves && moves.length > 0) || recursos ? 'w-[26rem] max-w-[95vw]' : 'w-72'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-sm truncate">{title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {onReturn && (
              <button onClick={onReturn} title="Regresar a la pokébola" className="text-gray-300 hover:text-red-400 transition-colors">
                <PokeballIcon size={18} />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        {/* Dados de golpe a la izquierda y el atajo al otro panel a la derecha */}
        {(hitDice || switchSprite || onHeldItems || (recursos && skills.length > 0)) && (
          <div className="flex items-center gap-2 mb-3">
            {/* Dados de golpe: mismo control que los Extra Points de la ruta */}
            {hitDice && (
              <div className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  {/* El lápiz solo ajusta lo que queda: el total sale del nivel. */}
                  <button onClick={() => onManageHitDice?.()} title="Ajustar dados de golpe"
                    className="shrink-0 text-gray-400 hover:text-amber-300 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <span className={`text-[10px] font-black tabular-nums truncate ${hitDice.actual <= 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    HIT DICE {hitDice.actual}/{hitDice.maximo}
                  </span>
                </div>
                <button onClick={() => onSpendHitDice?.()} disabled={hitDice.actual <= 0} title="Gastar un dado"
                  className="flex items-center justify-center text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md transition-colors">
                  <ArrowRight size={13} />
                </button>
              </div>
            )}

            {/* Recordatorio de cómo se tira un ataque con stat. Lleva a la
                pestaña Stats porque el modificador que pide la fórmula está
                justo ahí: se abre la pestaña y encima el detalle. */}
            {recursos && (v.stats || []).length > 0 && (
              <button onClick={() => {
                  setTabPanel('stats')
                  setDado(''); setStatSel(null); setConProf(false); setEligiendoStat(false)
                  setBonus(String(bonoRuta.total || 0))
                  // El panel está centrado y su altura depende del contenido, así
                  // que el borde solo se sabe midiendo en el momento de abrir.
                  setVerFormula(Math.max(0, Math.round(panelRef.current?.getBoundingClientRect().top ?? 0)))
                }}
                title="Fórmula de ataque"
                className="shrink-0 flex items-center gap-1 bg-gray-700/50 hover:bg-gray-600
                           text-gray-300 hover:text-white rounded-lg px-2 py-1.5 transition-colors">
                <Sword size={13} />
                {/* Medido en Chromium: por debajo de 360px la fila queda justa y
                    el botón le come 21px al contador de dados, que perdería el
                    último dígito de "12/12". Ahí se queda solo la espada. */}
                <span className="text-[10px] font-black tracking-wide max-[359px]:hidden">F(x)</span>
              </button>
            )}

            {/* Punto de inspiración: junto al botón de fórmula, no flotando
                sobre el avatar -de ahí solo queda el aura-. */}
            {inspirado && onInspiradoInfo && (
              <InspiradoInfoButton size={26} overlay={false} onClick={onInspiradoInfo} />
            )}

            {/* Estados alterados: a la derecha del botón de fórmula */}
            {onEstados && <EstadoTrigger size={26} onClick={onEstados} title={estadosTitle} />}

            {/* Grupo pegado al borde derecho, bajo la X de cerrar: los objetos
                equipados y, a su derecha, el salto al otro panel. ml-auto va en
                el grupo para que los dos se muevan juntos haya o no dados de
                golpe a su izquierda. */}
            <div className="ml-auto flex items-center gap-2">
              {onHeldItems && (
                /* Misma estética que el icono lateral de mochila. A 36px y no a
                   40 para que case con el sprite que lleva al lado. */
                <button onClick={onHeldItems} title="Held items"
                  className={`${ICONO_REDONDO} w-9 h-9`}>
                  <Backpack size={17} />
                </button>
              )}
              {/* En el panel del entrenador se ve al Pokémon invocado y en el del
                  Pokémon al entrenador. Sin Pokémon invocado no hay a dónde
                  saltar y el botón no se pinta. */}
              {switchSprite && (
                <button onClick={() => onSwitch?.()} title={switchLabel}
                  className="shrink-0 w-9 h-9 rounded-lg bg-gray-700/50 hover:bg-gray-600 flex items-center justify-center transition-colors">
                  <img src={switchSprite} alt={switchLabel} className="w-7 h-7 object-contain"
                    onError={e => { e.target.style.opacity = '0.2' }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* HP (estilo del control del master) */}
        <div className="flex items-center gap-2">
          <button onClick={() => setHp(v.hp - 1)}
            className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors"><Minus size={15} /></button>
          <div className="flex-1">
            {/* Barra de solo lectura: la vida solo se mueve de a un punto con los botones */}
            <div className="w-full h-2.5 rounded-full bg-gray-700 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: hpColorPct(pct) }} />
            </div>
            <p className="text-center text-[11px] font-bold text-white mt-1">HP {v.hp}/{v.hpMax}</p>
          </div>
          <button onClick={() => setHp(v.hp + 1)}
            className="w-8 h-8 shrink-0 rounded-lg bg-gray-700 hover:bg-green-600 flex items-center justify-center text-white transition-colors"><Plus size={15} /></button>
        </div>

        {/* Dos columnas sin separador visible: a la izquierda los valores fijos
            del Pokémon, a la derecha los contadores editables. */}
        <div className="mt-3 border-t border-gray-700 pt-3 grid grid-cols-[3fr_2fr] gap-x-5">
          {/* Valores fijos del ser vivo, los que no se editan desde aquí */}
          <div className="content-start">
            {/* Tres por renglón: arriba PROF/AC/SR, que los tienen ambos, y
                abajo INIT y —solo en el Pokémon— STAB. El entrenador no tiene
                STAB, así que el orden del array basta para que a cada uno le
                caigan sus valores en su sitio. */}
            <div className="grid grid-cols-3 gap-x-2 gap-y-2">
              {[
                ['PROF', v.prof != null ? `+${v.prof}` : null],
                ['AC',   v.ac],
                // SR no es un bono sino el rango: el del Pokémon llega como
                // "1/2" o "13", y el del entrenador es el tope que puede llevar.
                ['SR',   v.sr],
                // Iniciativa: el modificador de DEX, igual que en el creador de
                // personajes. Puede ser negativo, así que lleva su propio signo.
                ['INIT', v.init != null ? (v.init >= 0 ? `+${v.init}` : `${v.init}`) : null],
                ['STAB', v.stab != null ? `+${v.stab}` : null],
              ].filter(([, val]) => val !== null && val !== undefined && val !== '').map(([label, val]) => (
                <div key={label} className="flex items-center justify-between gap-1 h-7 min-w-0">
                  <span className="text-[10px] font-black text-gray-400 uppercase shrink-0">{label}</span>
                  <span className="font-black text-white text-sm truncate">{val}</span>
                </div>
              ))}
            </div>

            {/* Velocidad: cierra esta columna, donde antes iban los dados de
                golpe. El Pokémon puede traer varias (andar, volar, nadar...) y
                el entrenador una sola, así que va una por línea: en un renglón
                único los nombres no caben sin recortarse. */}
            {(v.speeds || []).length > 0 && (
              <div className="mt-2 space-y-1">
                {v.speeds.map(([nombre, valor]) => (
                  <div key={nombre} className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1 min-w-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase truncate">{nombre}</span>
                    <span className="text-[10px] font-black text-white shrink-0">{valor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EXH / DSTS / DSTF: valor con subir/bajar a los lados */}
          <div className="space-y-2">
            {[['EXH', 'exhaust'], ['DSTS', 'dsts'], ['DSTF', 'dstf']].map(([label, key]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase">{label}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => step(key, -1)}
                    className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-red-600 flex items-center justify-center text-white transition-colors"><ChevronDown size={15} /></button>
                  <span className="w-6 text-center font-black text-white">{v[key]}</span>
                  <button onClick={() => step(key, 1)}
                    className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-green-600 flex items-center justify-center text-white transition-colors"><ChevronUp size={15} /></button>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Movimientos (mismo comportamiento que el panel del master).
            Las pasivas van al final: sin PP ni Lanzar, solo su detalle. */}
        {((moves && moves.length > 0) || pasivas.length > 0 || skills.length > 0) && (
          <div className="mt-3 border-t border-gray-700 pt-2">
            {/* Sin habilidades (control del entrenador) se muestra solo el título */}
            {skills.length === 0 ? (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {recursos ? <>Bonus <span className="text-gray-500 normal-case">· {recursosTitulo}</span></> : 'Moves'}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-[2px] mb-1.5">
                {/* Seis pestañas por panel. Medido en Chromium con la tipografía
                    real: con tracking-widest la fila del entrenador ocupa 322px
                    y en un móvil de 360 solo hay 308, así que por debajo de
                    400px se aprieta el espaciado de las letras. Y flex-wrap por
                    si aun así no entra (pantallas de 320): parte en dos líneas
                    en vez de desbordarse. */}
                {[
                  // El entrenador no tiene movimientos: su primera pestaña ES la
                  // de los bonos, así que cambia de nombre según quién sea.
                  ['moves', recursos ? 'Bonus' : 'Moves'],
                  // Siempre que el entrenador tenga ruta: aunque no le dé puntos a
                  // este Pokémon, sus rasgos pueden traer algo que le aplique.
                  // Se llama Bonus y no Path porque ya no son solo los de la
                  // ruta: también viven aquí los que dan los feats.
                  ...(recursosPokemon ? [['path', 'Bonus']] : []),
                  ['skills', 'Skills'],
                  ...(v.stats?.length ? [['stats', 'Stats'], ['saves', 'Saves']] : []),
                  // Los items son del entrenador, pero se consultan igual desde
                  // el panel del Pokémon: en mesa se usan sobre cualquiera.
                  ...(personajeId ? [['items', 'Items']] : []),
                  // El arma sí es solo del entrenador: el Pokémon no equipa.
                  // En plural porque se pueden llevar hasta dos equipadas.
                  ...(recursos ? [['weapon', 'Weapons']] : []),
                ].map(([k, label]) => (
                  <button key={k} onClick={() => setTabPanel(k)}
                    className={`px-1.5 py-1 text-[10px] font-bold uppercase rounded-md transition-colors
                      tracking-widest max-[400px]:tracking-wide ${
                      tabPanel === k ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Habilidades: nombre, atributo asociado y modificador ya calculado */}
            {tabPanel === 'skills' && skills.length > 0 && (
              <div className="grid grid-cols-2 gap-1">
                {skills.map(s => (
                  <div key={s.name} className="flex items-center justify-between gap-1.5 bg-gray-700/50 rounded-lg px-2 py-1.5 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-white text-xs font-medium truncate">{s.name}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">({s.ability})</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.expert
                        ? <span className="text-[9px] font-bold text-white bg-blue-700 rounded px-1 py-0.5">Ex</span>
                        : s.pref
                          ? <span className="text-[9px] font-bold text-white bg-green-600 rounded px-1 py-0.5">Pr</span>
                          : null}
                      <span className={`text-xs font-black tabular-nums w-7 text-right ${s.mod < 0 ? 'text-red-400' : 'text-white'}`}>
                        {s.mod >= 0 ? `+${s.mod}` : s.mod}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats: valor final con sus bonos ya aplicados, y el modificador */}
            {tabPanel === 'stats' && (v.stats || []).length > 0 && (
              <div className="grid grid-cols-3 gap-1">
                {/* Sin marcar la proficiencia: aquí solo van la característica y su
                    modificador. Quien la tenga se ve en Saves, que además aplica el bono. */}
                {v.stats.map(st => (
                  <div key={st.key}
                    className="flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 min-w-0 border bg-gray-700/50 border-transparent">
                    <span className="text-[10px] font-black uppercase shrink-0 text-gray-400">{st.key}</span>
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-white text-xs font-bold tabular-nums">{st.valor}</span>
                      <span className={`text-[10px] font-black tabular-nums ${st.mod < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                        ({st.mod >= 0 ? `+${st.mod}` : st.mod})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tiradas de salvación: el modificador de la característica más el
                bono de proficiencia, y solo en las que se es proficiente. Es un
                bono APARTE: no toca el modificador con el que se calculan las
                habilidades, que sigue siendo el de la característica a secas. */}
            {tabPanel === 'saves' && (v.stats || []).length > 0 && (
              <div className="grid grid-cols-3 gap-1">
                {v.stats.map(st => {
                  const salv = st.mod + (st.prof ? (Number(v.prof) || 0) : 0)
                  return (
                    <div key={st.key}
                      title={st.prof ? `Proficiente: ${st.mod >= 0 ? `+${st.mod}` : st.mod} de ${st.key} y +${Number(v.prof) || 0} de proficiencia` : undefined}
                      className={`flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 min-w-0 border ${
                        st.prof ? 'bg-green-900/40 border-green-600' : 'bg-gray-700/50 border-transparent'}`}>
                      <span className={`text-[10px] font-black uppercase shrink-0 ${st.prof ? 'text-green-300' : 'text-gray-400'}`}>{st.key}</span>
                      <span className={`text-xs font-black tabular-nums shrink-0 ${salv < 0 ? 'text-red-400' : 'text-white'}`}>
                        {salv >= 0 ? `+${salv}` : salv}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Ruta, en el panel del Pokémon: los recursos con target 'pokemon',
                que son los de ESTE Pokémon. Los del entrenador viven en su
                propia pestaña con los de target 'trainer'. */}
            {tabPanel === 'path' && recursosPokemon && (
              <div className="space-y-1">
                {recursosPokemon.length === 0 && recursosTrainer.length === 0 && recursosFeat.length === 0 && elementos.length === 0 && attackBonos.length === 0 && recursosRasgos.length === 0 && (
                  <p className="text-[11px] text-gray-500 italic">Tu ruta no le da nada a este Pokémon.</p>
                )}

                {/* Los puntos del entrenador se ven también desde aquí y se
                    gastan igual: son los mismos, no una copia. Al revés no:
                    lo que es solo del Pokémon no aparece en el panel del
                    entrenador. */}
                {recursosTrainer.map(r => (
                  <FilaRecurso key={`t-${r.id}`} r={r} onManage={onManageRecurso} onSpend={onSpendRecurso}
                    onFeat={setFeatInfo} />
                ))}
                {/* Los que dan los feats del entrenador (Lucky Points): son
                    suyos igual que los de ruta, así que van con ellos. */}
                {recursosFeat.map(r => (
                  <FilaRecurso key={`ft-${r.id}`} r={r} onManage={onManageRecurso} onSpend={onSpendRecurso}
                    onFeat={setFeatInfo} />
                ))}

                {/* Bonos de ataque por terreno (Terrain Adept). Van aquí además
                    de junto a cada movimiento: en la pestaña se ven de un
                    vistazo, sin abrir el detalle de un movimiento. */}
                {attackBonos.map(a => (
                  <div key={`atk-${a.pf_id}`} className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
                    <button onClick={() => a.feat && setFeatInfo(a.feat)} title={`Ver ${a.feat_name}`}
                      className="min-w-0 text-left text-white text-xs font-medium truncate hover:text-amber-300 transition-colors">
                      {a.feat_name}
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {a.terreno && (
                        <span className="text-[10px] font-black uppercase tracking-wide text-gray-300
                                         bg-gray-800 border border-gray-600 rounded-md px-1.5 py-1">
                          {a.terreno}
                        </span>
                      )}
                      <span className="text-[10px] font-black tabular-nums text-emerald-300
                                       bg-emerald-500/10 border border-emerald-500/40 rounded-md px-1.5 py-1">
                        Atk+{a.valor}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Bonos de elemento: solo lectura. El tipo se cambia volviendo
                    a tomar el feat, que es repetible; poder editarlo aquí sería
                    un segundo camino para lo mismo. */}
                {elementos.map(el => (
                  <div key={`el-${el.id}`} className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
                    <button onClick={() => setFeatInfo(el.feat)} title={`Ver ${el.nombre}`}
                      className="min-w-0 text-left text-white text-xs font-medium truncate hover:text-amber-300 transition-colors">
                      {el.nombre}
                    </button>
                    <span className={`shrink-0 text-[10px] font-black uppercase tracking-wide rounded-md px-1.5 py-1
                                      bg-gray-800 border ${
                      el.valor ? 'border-gray-600 text-gray-200' : 'border-dashed border-red-500/60 text-red-400'}`}>
                      {el.valor || 'Sin elegir'}
                    </span>
                  </div>
                ))}
                {/* Mismo control que los Extra Points del entrenador: lápiz para
                    ajustar y flecha roja para gastar de a uno. */}
                {recursosPokemon.map(r => (
                  <FilaRecurso key={r.id} r={r} onManage={onManageBond} onSpend={onSpendBond} />
                ))}

                {/* Los rasgos de la ruta, los mismos que ve el entrenador. Se
                    muestran sea cual sea la ruta: pueden traer algo que aplique
                    al Pokémon aunque no otorgue puntos. */}
                <AcordeonPath rasgos={recursosRasgos} className="mt-2 border-t border-gray-700 pt-2" />
              </div>
            )}

            {/* Items del entrenador: equipo y medicinas, para gastarlos en mesa */}
            {tabPanel === 'items' && personajeId && (
              <ItemsPanel personajeId={personajeId} partidaId={partidaId} getPresentes={getPresentes}
                onCurado={(r, obj) => {
                  // Si se curó a sí mismo, este panel aún tiene el HP anterior
                  if (obj.tipo === 'personaje' && String(obj.id_personaje) === String(personajeId)) {
                    setV(cur => ({ ...cur, hp: r.hp }))
                  }
                  onCurado?.(r, obj)
                }} />
            )}

            {/* Arma equipada del entrenador */}
            {tabPanel === 'weapon' && personajeId && (
              <WeaponPanel personajeId={personajeId} profs={weaponProfs} />
            )}

            {/* Pestaña Path del entrenador: los Extra Points de su ruta */}
            {recursos && (
              <div className={`${tabPanel !== 'moves' ? 'hidden' : ''}`}>
            {recursos.length === 0 && recursosFeat.length === 0 && recursosRasgos.length === 0 && especialidades.length === 0 ? (
              <p className="text-[11px] text-gray-500 italic">Sin nada por ahora.</p>
            ) : (
              <div className="space-y-1">
                {recursos.map(r => (
                  <FilaRecurso key={r.id} r={r} onManage={onManageRecurso} onSpend={onSpendRecurso}
                    onFeat={setFeatInfo} />
                ))}
                {/* Los que dan sus feats, junto a los de la ruta */}
                {recursosFeat.map(r => (
                  <FilaRecurso key={`f-${r.id}`} r={r} onManage={onManageRecurso} onSpend={onSpendRecurso}
                    onFeat={setFeatInfo} />
                ))}
              </div>
            )}

            {/* Rasgos de la ruta ya alcanzados, debajo de los botones */}
            <AcordeonPath rasgos={recursosRasgos}
              className={recursos.length > 0 || recursosFeat.length > 0 ? 'mt-2 border-t border-gray-700 pt-2' : ''} />

            {/* Especialidades del entrenador, mismo formato que Trainer Path */}
            <AcordeonEspecialidades especialidades={especialidades}
              className={recursos.length > 0 || recursosFeat.length > 0 || recursosRasgos.length > 0
                ? 'mt-2 border-t border-gray-700 pt-2' : ''} />

              </div>
            )}

            {/* Sin scroll: como mucho son 6 movimientos más las pasivas, caben todos */}
            <div className={`space-y-1 ${tabPanel !== 'moves' || recursos ? 'hidden' : ''}`}>
              {(moves || []).map((m, i) => {
                // Los PP viven en personaje_pokemon_moves; max 0 = ilimitado (Struggle)
                const maxPP = Number(m.personaje_pokemon_moves_max_pp) || 0
                const unlimited = maxPP === 0
                const pp = Number(m.personaje_pokemon_moves_current_pp) || 0
                const disabled = !unlimited && pp <= 0
                return (
                  <div key={i} className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <button onClick={() => setMoveInfo(m)} title="Ver detalle del movimiento"
                        className="text-white text-xs font-medium truncate underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-amber-300 transition-colors">
                        {m.move_name}
                      </button>
                      {/* Recordatorio de que este movimiento tiene un bono
                          condicional: no desaparece al mirarlo, porque la
                          condición hay que comprobarla en cada tirada. El
                          detalle dice cuál es. */}
                      {attackBonos.length > 0 && (
                        <span title={attackBonos.map(a => `${a.feat_name}: Atk+${a.valor}${a.terreno ? ` (${a.terreno})` : ''}`).join(' · ')}
                          className="shrink-0 w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/30" />
                      )}
                      <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0"
                        style={{ backgroundColor: MOVE_TYPE_COLORS[m.move_type] || '#9CA3AF' }}>{m.move_type}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Lápiz pegado a los PP. Struggle no lo lleva: sus PP son ilimitados */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!unlimited && (
                          <button onClick={() => onManagePP?.(m)} title="Gestión de PP"
                            className="shrink-0 text-gray-400 hover:text-amber-300 transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                        <span className={`text-[10px] font-black tabular-nums ${disabled ? 'text-red-400' : 'text-gray-300'}`}>
                          PP {unlimited ? '∞' : `${pp}/${maxPP}`}
                        </span>
                      </div>
                      <button onClick={() => onCastRequest?.(m)} disabled={disabled || castDisabled} title="Lanzar"
                        className="flex items-center justify-center text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md transition-colors">
                        <ArrowRight size={14} strokeWidth={3} />
                      </button>
                      {/* Rango y duración del movimiento */}
                      <div className="w-24 text-left leading-tight">
                        <p className="text-[9px] text-gray-400 truncate" title={m.move_range || ''}>{m.move_range || '—'}</p>
                        <p className="text-[9px] text-gray-400 truncate" title={m.move_duration || ''}>{m.move_duration || '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Pasivas: no se lanzan ni gastan PP, solo muestran su detalle */}
              {pasivas.map(p => (
                <div key={`pasiva-${p.ability_id}`} className="flex items-center justify-between gap-2 bg-purple-900/30 border border-purple-700/40 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => setAbilityInfo(p)} title="Ver detalle de la pasiva"
                      className="text-white text-xs font-medium truncate underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-amber-300 transition-colors">
                      {p.ability_name}
                    </button>
                    <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0"
                      style={{ backgroundColor: '#7C3AED' }}>pasiva</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Efectividad de tipo (solo para el Pokémon) */}
        {v.typeId1 != null && (
          <div className="mt-3 border-t border-gray-700 pt-3">
            <TypeEffectivenessView typeId1={v.typeId1} typeId2={v.typeId2} dark showTypes />
          </div>
        )}
      </div>

      {/* Beneficio del feat que otorga el recurso, abierto desde su nombre */}
      {featInfo && <FeatInfoModal feat={featInfo} theme="dark" onClose={() => setFeatInfo(null)} />}

      {/* Detalle del movimiento seleccionado */}
      {moveInfo && <MoveInfoModal m={moveInfo} attackBonos={attackBonos} onClose={() => setMoveInfo(null)} />}

      {/* Fórmula del ataque con habilidad. Cada término va en su propia ficha y
          con su color para poder leerla de un vistazo en mesa; el de la
          proficiencia lleva borde punteado porque es el único condicional. */}
      {verFormula !== null && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', paddingTop: verFormula }}
          onClick={e => { if (e.target === e.currentTarget) setVerFormula(null) }}>
          <div className={`bg-gray-800 border border-gray-700 rounded-2xl w-full shadow-2xl overflow-hidden ${
            recursos ? 'max-w-md' : 'max-w-sm'}`}>
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2 min-w-0">
                <Sword size={15} className="text-amber-400 shrink-0" /> Formula
              </h4>
              <button onClick={() => setVerFormula(null)} className="text-gray-400 hover:text-white shrink-0"><X size={16} /></button>
            </div>
            <div className="px-4 py-4">
              <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 font-black">
                <span className="text-gray-300 text-sm">Attack</span>
                <span className="text-gray-500 text-sm">=</span>
                <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-md px-2 py-1">
                  1d20
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/40 rounded-md px-2 py-1">
                  Stat Mod
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-dashed border-emerald-500/50 rounded-md px-2 py-1">
                  +2 If weapon prof
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-violet-300 bg-violet-500/10 border border-violet-500/40 rounded-md px-2 py-1">
                  Bonus
                </span>
              </div>
              {/* Move DC: la misma fórmula que Attack, solo que el 1d20 se
                  reemplaza por un 8 fijo. Reutiliza el mismo Stat/prof/Bonus ya
                  elegidos arriba, no son controles aparte. */}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 font-black">
                <span className="text-gray-300 text-sm">Move DC</span>
                <span className="text-gray-500 text-sm">=</span>
                <span className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/40 rounded-md px-2 py-1">
                  8
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/40 rounded-md px-2 py-1">
                  Stat Mod
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-dashed border-emerald-500/50 rounded-md px-2 py-1">
                  +2 If weapon prof
                </span>
                <span className="text-gray-500 text-sm">+</span>
                <span className="text-[11px] text-violet-300 bg-violet-500/10 border border-violet-500/40 rounded-md px-2 py-1">
                  Bonus
                </span>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 text-center leading-relaxed">
                El modificador sale del stat que elijas, en la pestaña Stats.
              </p>

              {/* Calculadora, solo en el panel del entrenador: es quien ataca con
                  habilidad. El total se recalcula solo; no hay botón de calcular
                  porque no hay nada que confirmar. */}
              {recursos && (v.stats || []).length > 0 && (() => {
                const n20 = dado === '' ? 0 : Number(dado)
                const modStat = statSel ? Number(statSel.mod) || 0 : 0
                const bonoProf = conProf ? 2 : 0
                const extra = bonus === '' ? 0 : Number(bonus)
                // Un modificador negativo resta, así que el total puede bajar del dado.
                const total = n20 + modStat + bonoProf + extra
                // Move DC: no se tira, el término del d20 es un 8 fijo. Usa el
                // mismo Stat, la misma proficiencia y el mismo Bonus de arriba.
                const totalDC = 8 + modStat + bonoProf + extra
                const critico = n20 === 20
                const signo = m => (m >= 0 ? `+${m}` : `${m}`)
                return (
                  <div className="mt-4 border-t border-gray-700 pt-4">
                    {/* El lado derecho va en su propio grupo: si no cabe, la fila
                        se parte después del '=' y no por la mitad de la suma. */}
                    <div className="flex items-center justify-center gap-0.5 flex-wrap">
                      {/* Total. En un 20 natural se enciende y late. */}
                      <div className="relative shrink-0">
                        {critico && (
                          <span className="absolute inset-0 rounded-xl bg-amber-400/40 animate-ping pointer-events-none" />
                        )}
                        <div className={`relative w-11 h-9 rounded-xl border-2 flex items-center justify-center
                                         font-black text-base tabular-nums transition-all ${
                          critico
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.7)]'
                            : 'bg-gray-900/60 border-gray-600 text-white'}`}>
                          {total}
                        </div>
                      </div>

                      <span className="text-gray-500 font-black shrink-0 text-xs">=</span>

                      <div className="flex items-center gap-0.5 flex-wrap justify-center">
                      {/* El dado. El texto gris de fondo es el placeholder: se va
                          en cuanto se escribe. */}
                      <input type="number" min={1} max={20} value={dado}
                        onChange={e => {
                          const t = e.target.value
                          if (t === '') return setDado('')
                          const n = Math.trunc(Number(t))
                          if (!Number.isFinite(n)) return
                          setDado(String(Math.max(1, Math.min(20, n))))
                        }}
                        placeholder="1d20"
                        className={`shrink-0 w-11 h-9 text-center rounded-xl border-2 bg-gray-900/60 font-black tabular-nums
                                    text-white placeholder:text-gray-500 placeholder:font-bold placeholder:text-xs
                                    focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-colors ${
                          critico ? 'border-amber-400' : 'border-gray-600'}`} />

                      <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

                      {/* Sin elegir dice Stat; elegido, muestra su modificador y
                          sigue abriendo la lista para poder cambiarlo. */}
                      <button onClick={() => setEligiendoStat(v => !v)}
                        title={statSel ? statSel.key : 'Elegir stat'}
                        className={`shrink-0 h-9 min-w-[2rem] px-0.5 rounded-xl border-2 font-black tabular-nums
                                    transition-colors ${
                          statSel
                            ? `bg-sky-500/15 border-sky-500/60 ${modStat < 0 ? 'text-red-300' : 'text-sky-200'}`
                            : 'bg-gray-900/60 border-gray-600 border-dashed text-gray-300 hover:border-gray-500 text-xs'}`}>
                        {statSel ? signo(modStat) : 'Stat'}
                      </button>

                      <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

                      <select value={conProf ? 'si' : 'no'} onChange={e => setConProf(e.target.value === 'si')}
                        className={`shrink-0 h-9 px-0.5 rounded-xl border-2 bg-gray-900/60 text-[9px] font-black
                                    focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-colors ${
                          conProf ? 'border-emerald-500/60 text-emerald-200' : 'border-gray-600 text-gray-300'}`}>
                        <option value="no">No prof</option>
                        <option value="si">Prof +2</option>
                      </select>

                      <span className="text-gray-500 font-black shrink-0 text-xs">+</span>

                      {/* Bonus: lo que da la ruta, editable para ajustarlo en
                          mesa. Los bonos condicionales de feats NO entran aquí:
                          dependen de dónde se pelee y los suma el jugador. */}
                      <input type="number" value={bonus}
                        onChange={e => setBonus(e.target.value)}
                        title={bonoRuta.detalle.length
                          ? bonoRuta.detalle.map(d => `Nv ${d.nivel} ${d.nombre}: ${d.valor >= 0 ? '+' : ''}${d.valor}`).join(' · ')
                          : 'Bonus adicional'}
                        className={`shrink-0 w-11 h-9 text-center rounded-xl border-2 bg-gray-900/60 font-black tabular-nums
                                    text-white focus:outline-none focus:ring-2 focus:ring-violet-400/60 transition-colors ${
                          bonoRuta.total ? 'border-violet-500/60' : 'border-gray-600'}`} />
                      </div>
                    </div>

                    {/* Fila de Move DC: mismo layout que Attack, pero de solo
                        lectura -Stat, prof y Bonus ya se eligieron arriba-,
                        con el 8 fijo en vez del dado. */}
                    <div className="mt-2 flex items-center justify-center gap-0.5 flex-wrap">
                      <div className="w-11 h-9 rounded-xl border-2 flex items-center justify-center
                                      font-black text-base tabular-nums bg-gray-900/60 border-gray-600 text-white">
                        {totalDC}
                      </div>
                      <span className="text-gray-500 font-black shrink-0 text-xs">=</span>
                      <div className="flex items-center gap-0.5 flex-wrap justify-center">
                        <span className="shrink-0 w-11 h-9 rounded-xl border-2 border-rose-500/60 bg-rose-500/15
                                         text-rose-200 font-black tabular-nums flex items-center justify-center"
                          title="La Move DC no se tira: es un valor fijo">
                          8
                        </span>
                        <span className="text-gray-500 font-black shrink-0 text-xs">+</span>
                        <span className={`shrink-0 h-9 min-w-[2rem] px-0.5 rounded-xl border-2 font-black tabular-nums
                                          flex items-center justify-center ${
                          statSel
                            ? `bg-sky-500/15 border-sky-500/60 ${modStat < 0 ? 'text-red-300' : 'text-sky-200'}`
                            : 'bg-gray-900/60 border-gray-600 border-dashed text-gray-300 text-xs'}`}>
                          {statSel ? signo(modStat) : '—'}
                        </span>
                        <span className="text-gray-500 font-black shrink-0 text-xs">+</span>
                        <span className={`shrink-0 h-9 px-1 rounded-xl border-2 font-black tabular-nums text-[9px]
                                          flex items-center justify-center ${
                          conProf ? 'border-emerald-500/60 text-emerald-200' : 'border-gray-600 text-gray-300'}`}>
                          {conProf ? '+2' : '+0'}
                        </span>
                        <span className="text-gray-500 font-black shrink-0 text-xs">+</span>
                        <span className={`shrink-0 w-11 h-9 rounded-xl border-2 font-black tabular-nums
                                          flex items-center justify-center ${
                          bonoRuta.total ? 'border-violet-500/60 text-violet-200' : 'border-gray-600 text-gray-300'}`}>
                          {signo(extra)}
                        </span>
                      </div>
                    </div>

                    {critico && (
                      <p className="mt-2 text-center text-[10px] font-black uppercase tracking-widest text-amber-300">
                        ¡Golpe crítico!
                      </p>
                    )}

                    {/* Atacar cierra la fórmula y lo anuncia a la partida. Pide el
                        dado: sin tirada no hay ataque, y un 'poder de 0' en el
                        historial solo puede ser un clic de más. */}
                    {onAtaque && (
                      <button onClick={() => { onAtaque(total); setVerFormula(null) }}
                        disabled={dado === ''}
                        title={dado === '' ? 'Escribe primero el resultado del d20' : 'Anunciar el ataque a la partida'}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 h-10 rounded-xl
                                   text-xs font-black uppercase tracking-widest text-white transition-colors
                                   bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Sword size={14} /> Atacar
                      </button>
                    )}

                    {statSel && !eligiendoStat && (
                      <p className="mt-2 text-center text-[11px] text-gray-400 truncate">
                        {statSel.key}
                      </p>
                    )}

                    {/* Modificador crudo del stat (mismo que la pestaña Stats):
                        sin proficiencia de skill, sin bono de tirada de salvación. */}
                    {eligiendoStat && (
                      <div className="mt-3 grid grid-cols-3 gap-1 pr-0.5">
                        {(v.stats || []).map(st => (
                          <button key={st.key}
                            onClick={() => { setStatSel(st); setEligiendoStat(false) }}
                            className={`flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 min-w-0 text-left
                                        transition-colors ${
                              statSel?.key === st.key
                                ? 'bg-sky-500/20 ring-1 ring-sky-500/60'
                                : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                            <span className="text-white text-xs font-medium truncate">{st.key}</span>
                            <span className={`text-xs font-black tabular-nums w-7 text-right ${
                              st.mod < 0 ? 'text-red-400' : 'text-white'}`}>
                              {signo(Number(st.mod) || 0)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}


      {/* Detalle de una pasiva (tema oscuro, como el panel de combate) */}
      {abilityInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setAbilityInfo(null) }}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{abilityInfo.ability_name}</h4>
                <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0" style={{ backgroundColor: '#7C3AED' }}>pasiva</span>
              </div>
              <button onClick={() => setAbilityInfo(null)} className="text-gray-400 hover:text-white shrink-0"><X size={16} /></button>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-300 leading-relaxed">
                {abilityInfo.ability_description || 'Sin descripción.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

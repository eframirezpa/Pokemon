import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Smartphone, User, Backpack, Shield, Sword, Monitor, X, Minus, Plus, ChevronUp, ChevronDown, Pencil, PencilOff, ArrowRight, BedDouble } from 'lucide-react'
import PartidaRoom from '../components/PartidaRoom'
import PokemonList from './PokemonList'
import CharacterSheet from '../components/CharacterSheet'
import TrainerLevelUpModal from '../components/TrainerLevelUpModal'
import Mochila from '../components/Mochila'
import Equipamiento from '../components/Equipamiento'
import PokemonBox from '../components/PokemonBox'
import FormulaAtaqueModal from '../components/FormulaAtaqueModal'
import FeatInfoModal from '../components/FeatInfoModal'
import PendingImprovementModal from '../components/PendingImprovementModal'
import MoveInfoModal from '../components/MoveInfoModal'
import EditarPersonajeModal from '../components/EditarPersonajeModal'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { hpValues } from '../lib/hp'
import TypeEffectivenessView from '../components/TypeEffectivenessView'
import DescansoModal from '../components/DescansoModal'
import PokeballsIcon from '../components/PokeballsIcon'
import ItemsPanel from '../components/ItemsPanel'
import WeaponPanel from '../components/WeaponPanel'
import HeldItemsModal from '../components/HeldItemsModal'
import { buildProfs } from '../lib/profs'
import PokeballSpinner from '../components/PokeballSpinner'
import PokeballIcon from '../components/PokeballIcon'
import LoadingOverlay from '../components/LoadingOverlay'


/* Habilidades del entrenador para el panel de Jugador (y el modificador de DEX
   ya con bonos, que reusa el AC), con los mismos bonos que
   aplica la ficha: feats, especializaciones y ruta. Se calcula aquí y no se
   importa de CharacterSheet porque allí va entretejido con el render. */
function construirSkillsTrainer(d) {
  const norm = x => (x ?? '').toLowerCase()
  const statAdd = {}, skProf = new Set(), skExpert = new Set(), savingProf = new Set()

  const acumular = (bonos) => {
    for (const b of (bonos || [])) {
      const t = norm(b.type), k = norm(b.llave), v = norm(b.value)
      if (t === 'stat') statAdd[k] = (statAdd[k] || 0) + (Number(b.value) || 0)
      else if (t === 'skill') { if (v === 'expert' || v === 'exp') skExpert.add(k); else if (v === 'prof') skProf.add(k) }
      else if (t === 'saving') savingProf.add(k)
    }
  }
  for (const f of (d.extra_feats || [])) acumular(f.bonos)
  for (const sp of (d.specializations || [])) acumular(sp.bonos)
  // El origen y el background también otorgan salvaciones (p. ej. Frostborn)
  for (const f of [d.origin_feat, d.background_feat]) acumular(f?.bonos)
  // Los bonos de ruta con target all_pokemon son para los Pokémon, no para él
  acumular((d.path_bonos || []).filter(b => norm(b.target) === 'trainer'))

  const st = d.stats || {}
  const modOf = k => Math.floor(
    ((Number(st[`personaje_${k}`]) || 0) + (Number(st[`personaje_${k}_bonus`]) || 0) + (statAdd[k] || 0) - 10) / 2)
  const prof = Number(d.personaje_prof) || 2

  const skills = (Array.isArray(d.skills) ? d.skills : []).map(s => {
    const nombre = norm(s.skill_name)
    let pref = !!s.personaje_skill_pref, expert = !!s.personaje_skill_expert
    if (skProf.has(nombre)) pref = true
    if (skExpert.has(nombre)) { if (pref) expert = true; else pref = true }
    return {
      name: s.skill_name,
      ability: s.skill_related_ability,
      pref, expert,
      mod: modOf(norm(s.skill_related_ability)) + (pref ? prof : 0) + (expert ? prof : 0),
    }
  })
  // El modificador de DEX sale de aquí porque ya tiene aplicados los bonos de
  // feats y especialidades; lo necesita el cálculo del AC.
  // Proficiencia en la tirada de salvación: el booleano de personaje_stats más
  // las que otorgan los feats. Misma condición que el check verde de la ficha.
  const stats = ['str','dex','con','int','wis','cha'].map(k => ({
    key: k.toUpperCase(),
    valor: (Number(st[`personaje_${k}`]) || 0) + (Number(st[`personaje_${k}_bonus`]) || 0) + (statAdd[k] || 0),
    mod: modOf(k),
    prof: !!st[`personaje_stats_${k}_prof`] || savingProf.has(k),
  }))
  return { skills, dexMod: modOf('dex'), stats }
}

/* AC del entrenador con la MISMA regla que la ficha: base de la armadura más el
   modificador de DEX, topado por la armadura (Medium Armor Master sube ese tope
   de +2 a +3). Sin armadura, el AC guardado. Replicarlo evita que el panel y la
   ficha muestren números distintos. */
const FEAT_MEDIUM_ARMOR_MASTER = 33
function acDelTrainer(d, dexMod) {
  const a = d.armor
  if (!a) return d.personaje_ac
  let v = a.armor_type_base_ac || 0
  if (a.armor_type_uses_dex_modifier === 1) {
    if (a.armor_type_max_dex_modifier != null) {
      const sube = (d.extra_feats || []).some(f => Number(f.feat_id) === FEAT_MEDIUM_ARMOR_MASTER)
      const cap = sube ? Math.max(a.armor_type_max_dex_modifier, 3) : a.armor_type_max_dex_modifier
      v += Math.min(dexMod, cap)
    } else v += dexMod
  }
  return v
}

// Estética de los iconos laterales: redondo, gris, con borde y sombra. Vive
// aquí y no dentro del componente para que CombatePanel pueda reutilizarla.
const ICONO_REDONDO = 'shrink-0 flex items-center justify-center rounded-full bg-gray-700 ' +
  'hover:bg-gray-600 text-gray-200 shadow-lg border border-gray-600 transition-all'

const hpColorPct = pct => (pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444')

const MOVE_TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
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
                      llave cuando el valor viene vacío. */}
                  {(f.bonos || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {f.bonos.map(b => (
                        <span key={b.id}
                          className="text-[10px] font-bold text-gray-200 bg-gray-700/60 border border-gray-600 rounded px-1.5 py-0.5">
                          {b.key}{b.value ? <> : <span className="text-green-300">{b.value}</span></> : null}
                        </span>
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

function CombatePanel({ title, switchSprite = null, switchLabel = '', onSwitch, onHeldItems = null, onAtaque = null, recursosFeat = [],
                       elementos = [], weaponProfs = null, attackBonos = [], bonoRuta = { total: 0, detalle: [] }, recursosTrainer = [], initial, moves, pasivas = [], skills = [], onCastRequest, onManagePP, castDisabled = false, onPersist, onReturn, onClose, recursos = null, recursosTitulo = '', recursosRasgos = [], onSpendRecurso, onManageRecurso, hitDice = null, onSpendHitDice, onManageHitDice, personajeId = null, recursosPokemon = null, onSpendBond, onManageBond }) {
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
  const [skillSel, setSkillSel] = useState(null)
  const [conProf, setConProf] = useState(false)
  // Bonus: arranca en lo que dé la ruta y se puede tocar. Es texto para poder
  // distinguir "vacío" de 0 mientras se escribe.
  const [bonus, setBonus] = useState('')
  const [eligiendoSkill, setEligiendoSkill] = useState(false)


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

            {/* Recordatorio de cómo se tira un ataque con habilidad. Lleva a
                las habilidades porque el modificador que pide la fórmula está
                justo ahí: se abre la pestaña y encima el detalle. */}
            {recursos && skills.length > 0 && (
              <button onClick={() => {
                  setTabPanel('skills')
                  setDado(''); setSkillSel(null); setConProf(false); setEligiendoSkill(false)
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
                  <FilaRecurso key={`t-${r.id}`} r={r} onManage={onManageRecurso} onSpend={onSpendRecurso} />
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
              <ItemsPanel personajeId={personajeId} />
            )}

            {/* Arma equipada del entrenador */}
            {tabPanel === 'weapon' && personajeId && (
              <WeaponPanel personajeId={personajeId} profs={weaponProfs} />
            )}

            {/* Pestaña Path del entrenador: los Extra Points de su ruta */}
            {recursos && (
              <div className={`${tabPanel !== 'moves' ? 'hidden' : ''}`}>
            {recursos.length === 0 && recursosFeat.length === 0 && recursosRasgos.length === 0 ? (
              <p className="text-[11px] text-gray-500 italic">Sin nada por ahora.</p>
            ) : (
              <div className="space-y-1">
                {recursos.map(r => (
                  <FilaRecurso key={r.id} r={r} onManage={onManageRecurso} onSpend={onSpendRecurso} />
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
                  Skill Mod
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
                El modificador sale de la habilidad que uses, en la pestaña Skills.
              </p>

              {/* Calculadora, solo en el panel del entrenador: es quien ataca con
                  habilidad. El total se recalcula solo; no hay botón de calcular
                  porque no hay nada que confirmar. */}
              {recursos && skills.length > 0 && (() => {
                const n20 = dado === '' ? 0 : Number(dado)
                const modSkill = skillSel ? Number(skillSel.mod) || 0 : 0
                const bonoProf = conProf ? 2 : 0
                const extra = bonus === '' ? 0 : Number(bonus)
                // Un modificador negativo resta, así que el total puede bajar del dado.
                const total = n20 + modSkill + bonoProf + extra
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

                      {/* Sin elegir dice Skill; elegido, muestra su modificador y
                          sigue abriendo la lista para poder cambiarlo. */}
                      <button onClick={() => setEligiendoSkill(v => !v)}
                        title={skillSel ? `${skillSel.name} (${skillSel.ability})` : 'Elegir habilidad'}
                        className={`shrink-0 h-9 min-w-[2rem] px-0.5 rounded-xl border-2 font-black tabular-nums
                                    transition-colors ${
                          skillSel
                            ? `bg-sky-500/15 border-sky-500/60 ${modSkill < 0 ? 'text-red-300' : 'text-sky-200'}`
                            : 'bg-gray-900/60 border-gray-600 border-dashed text-gray-300 hover:border-gray-500 text-xs'}`}>
                        {skillSel ? signo(modSkill) : 'Skill'}
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

                    {skillSel && !eligiendoSkill && (
                      <p className="mt-2 text-center text-[11px] text-gray-400 truncate">
                        {skillSel.name} <span className="text-gray-500">({skillSel.ability})</span>
                      </p>
                    )}

                    {/* Los modificadores ya traen dentro la proficiencia y el
                        experto, así que el número de la lista es el que se suma. */}
                    {eligiendoSkill && (
                      <div className="mt-3 max-h-48 overflow-y-auto grid grid-cols-2 gap-1 pr-0.5">
                        {skills.map(sk => (
                          <button key={sk.name}
                            onClick={() => { setSkillSel(sk); setEligiendoSkill(false) }}
                            className={`flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 min-w-0 text-left
                                        transition-colors ${
                              skillSel?.name === sk.name
                                ? 'bg-sky-500/20 ring-1 ring-sky-500/60'
                                : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-white text-xs font-medium truncate">{sk.name}</span>
                              <span className="text-[10px] text-gray-400 shrink-0">({sk.ability})</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {sk.expert
                                ? <span className="text-[9px] font-bold text-white bg-blue-700 rounded px-1 py-0.5">Ex</span>
                                : sk.pref
                                  ? <span className="text-[9px] font-bold text-white bg-green-600 rounded px-1 py-0.5">Pr</span>
                                  : null}
                              <span className={`text-xs font-black tabular-nums w-7 text-right ${
                                sk.mod < 0 ? 'text-red-400' : 'text-white'}`}>
                                {signo(Number(sk.mod) || 0)}
                              </span>
                            </div>
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

export default function TrainerPartida() {
  const { id }   = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const stateId  = location.state?.personaje?.id_personaje ?? null
  const nombrePartida = location.state?.nombre ?? null

  const [personajeId, setPersonajeId] = useState(stateId)
  const [showPokedex, setShowPokedex] = useState(false)
  const [pokedexListo, setPokedexListo] = useState(false) // primera consulta resuelta
  const [showChar, setShowChar]       = useState(false)
  const [showMochila, setShowMochila] = useState(false)
  const [showEquip, setShowEquip]     = useState(false)
  const [showBelt, setShowBelt]       = useState(false)
  const [showPC, setShowPC]           = useState(false)
  const [showEdit, setShowEdit]       = useState(false)
  const [isEditable, setIsEditable]   = useState(false) // personaje_is_editable (lo controla el master)
  const [pending, setPending]         = useState([])    // mejoras de nivel por confirmar (secuencial)
  const [renames, setRenames]         = useState([])    // Pokémon recibidos pendientes de renombrar
  const [levelUps, setLevelUps]       = useState([])    // niveles de entrenador por confirmar
  const [charSkills, setCharSkills]   = useState([])    // habilidades del entrenador
  const [charNombre, setCharNombre]   = useState('')    // nombre del personaje, no del usuario
  const [recursos, setRecursos]       = useState([])    // Extra Points de la ruta
  const [recursosTitulo, setRecursosTitulo] = useState('Trainer')
  const [recursosRasgos, setRecursosRasgos] = useState([]) // rasgos de la ruta ya alcanzados
  const [recursosFeat, setRecursosFeat] = useState([])   // puntos que dan los feats (Lucky Points)
  const [recursoEdit, setRecursoEdit] = useState(null)  // recurso en el lápiz
  const [recursoVal, setRecursoVal]   = useState(0)
  // Dados de golpe: { actual, maximo }. Van aparte de charData/pokeData porque
  // el panel los muta en vivo y esos objetos se rearman al abrir el control.
  const [hdTrainer, setHdTrainer]     = useState(null)
  const [hdPoke, setHdPoke]           = useState(null)
  const [showDescanso, setShowDescanso] = useState(false)
  const [apodoEdit, setApodoEdit]     = useState({ id: null, value: '' })
  const [ppMove, setPpMove]           = useState(null)  // movimiento cuyo gasto de PP se está confirmando
  const [ppCantidad, setPpCantidad]   = useState(1)
  const [ppBusy, setPpBusy]           = useState(false)
  const [ppError, setPpError]         = useState('')
  const [castCooldown, setCastCooldown] = useState(false)
  const castTimer = useRef(null)
  const [gpMove, setGpMove]     = useState(null)  // movimiento en gestión de PP
  const [gpMax, setGpMax]       = useState(0)
  const [gpCur, setGpCur]       = useState(0)
  const [gpBusy, setGpBusy]     = useState(false)
  const [gpError, setGpError]   = useState('')
  const [renameBusy, setRenameBusy]   = useState(false)
  const [renameError, setRenameError] = useState('')
  const [partyVersion, setPartyVersion] = useState(0)   // cambia cuando el master actualiza la party
  const [pokemonInvocado, setPokemonInvocado] = useState(null) // id_personaje_pokemon
  const [invocadoSprite, setInvocadoSprite]   = useState(null)
  const [openControl, setOpenControl] = useState(null) // 'trainer' | 'pokemon' | null (solo uno a la vez)
  const [cargandoPanel, setCargandoPanel] = useState(null) // panel que se está pidiendo, o null
  const [charProfs, setCharProfs] = useState(null) // proficiencias del entrenador (de /full)
  const [heldOpen, setHeldOpen] = useState(false)   // popup de objetos equipados del Pokémon
  const [charData, setCharData] = useState(null)
  const [pokeData, setPokeData] = useState(null)
  const partidaApiRef = useRef(null) // acciones expuestas por PartidaRoom (p. ej. sendPartyUpdate)
  const [fight, setFight] = useState({ active: false, players: [] }) // modo lucha
  // Monitor (PC/escritorio con mouse) → iconos más grandes
  const [isMonitor, setIsMonitor] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const onChange = () => setIsMonitor(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])


  // Lee si el personaje es editable (lo activa el master). Se re-consulta al recibir party_update.
  useEffect(() => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}`)
      .then(r => r.json())
      .then(d => setIsEditable(!!d?.personaje_is_editable))
      .catch(() => {})
  }, [personajeId, partyVersion])

  // Mejoras pendientes por subida de nivel: se muestran al entrar y tras subir experiencia
  const refreshPending = () => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}/pending-improvements`)
      .then(r => r.json())
      .then(d => setPending(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  // Pokémon recién recibidos que aún hay que renombrar. Se consulta también en
  // cada party_update, que es lo que disparan las dos transferencias.
  const refreshRenames = () => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}/pokemon/pending-rename`)
      .then(r => r.json())
      .then(d => setRenames(Array.isArray(d) ? d : []))
      .catch(() => {})
  }
  // Niveles de entrenador pendientes de confirmar. Se persisten, así que
  // sobreviven a una recarga: subir de nivel ocurre en el servidor y el jugador
  // puede no estar mirando cuando pasa.
  const refreshLevelUps = () => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}/improvements`)
      .then(r => r.json())
      .then(d => setLevelUps(Array.isArray(d) ? d : []))
      .catch(() => {})
  }
  // Ganar experiencia o subir de nivel un Pokémon puede subir también al
  // entrenador, porque su nivel se deriva de los niveles de sus Pokémon. Hay
  // que releer las DOS colas: sin esto la ventana de leveo no aparecía hasta
  // recargar, ya que solo se refrescaba con partyVersion, que únicamente mueve
  // el máster.
  const trasEventoPokemon = () => { refreshPending(); refreshLevelUps() }

  // El descanso toca HP, dados y PP de varios a la vez: al terminar se cierra
  // el control abierto para que no muestre valores viejos.
  const abrirDescanso = () => setShowDescanso(true)
  const trasDescanso = () => { setOpenControl(null); setCharData(null); setPokeData(null); trasEventoPokemon() }

  useEffect(() => { refreshPending() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [personajeId])
  useEffect(() => { refreshRenames() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [personajeId, partyVersion])
  useEffect(() => { refreshLevelUps() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [personajeId, partyVersion])

  // Recupera el personaje del usuario: state → localStorage → backend (para recargas).
  // Un usuario puede tener varios personajes en la misma partida (el lobby los lista
  // para elegir), así que cuando no hay elección guardada NO se puede adivinar: antes
  // se tomaba el primero de la lista y cargaba el personaje equivocado.
  // La clave lleva sufijo v2 para descartar las elecciones que guardó esa versión.
  useEffect(() => {
    const storeKey = `trainer_personaje_v2_${id}`
    if (stateId) { localStorage.setItem(storeKey, String(stateId)); return }

    const stored = localStorage.getItem(storeKey)
    if (stored) { setPersonajeId(Number(stored)); return }

    apiFetch(`/personaje?id_partida=${id}`)
      .then(r => r.json())
      .then(list => {
        const arr = Array.isArray(list) ? list : []
        if (arr.length === 1) {
          // Un solo personaje: no hay ambigüedad posible
          setPersonajeId(arr[0].id_personaje)
          localStorage.setItem(storeKey, String(arr[0].id_personaje))
          return
        }
        // Varios (o ninguno): que lo elija en el lobby en vez de adivinar
        navigate(`/partida-lobby/${id}`, { replace: true, state: { nombre: nombrePartida } })
      })
      .catch(() => {})
  }, [id, stateId, navigate, nombrePartida])

  // Restaura el Pokémon invocado tras una recarga: se persiste en personaje_pokemon_is_in_game
  useEffect(() => {
    if (!personajeId) return
    apiFetch(`/personaje/${personajeId}/pokemon?en_equipo=1`)
      .then(r => r.json())
      .then(list => {
        const inGame = Array.isArray(list) && list.find(p => p.personaje_pokemon_is_in_game)
        if (inGame) {
          const sprite = (inGame.pokemon_is_shiny && inGame.pokemon_media_main_shiny)
            ? inGame.pokemon_media_main_shiny
            : (inGame.pokemon_media_main || inGame.pokemon_media_sprite)
          setPokemonInvocado(inGame.id_personaje_pokemon)
          setInvocadoSprite(sprite)
        }
      })
      .catch(() => {})
  }, [personajeId])

  // Persiste el estado "en juego" del Pokémon invocado (no bloquea la UI)
  const persistEnJuego = (idpp, enJuego) =>
    apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/en-juego`, {
      method: 'PATCH', body: JSON.stringify({ en_juego: enJuego }),
    }).catch(() => {})

  // Abrir control del jugador (personaje) — carga HP/exhaust/dsts/dstf
  // Gastar un punto: optimista y con reconciliación, como los PP
  const gastarRecurso = async (r) => {
    if (r.actual <= 0) return
    // Los puntos de feat viven en otra tabla y tienen su propia ruta, pero el
    // control es el mismo: se distingue por el `tipo` que trae el recurso.
    // Cada bono dice por su `tipo` a qué ruta escribir: los de feat viven en
    // personaje_feat_bonus, el Tracker en una columna del personaje, y el resto
    // son los Extra Points de la ruta.
    const propio = r.tipo === 'feat' || r.tipo === 'feature'
    const setLista = propio ? setRecursosFeat : setRecursos
    const ruta = r.tipo === 'feature' ? `feature/${r.clave}`
      : r.tipo === 'feat' ? `feat-resource/${r.id}` : `path-resource/${r.id}`
    setLista(prev => prev.map(x => x.id === r.id ? { ...x, actual: x.actual - 1 } : x))
    try {
      const res = await apiFetch(`/personaje/${personajeId}/${ruta}`,
        { method: 'PATCH', body: JSON.stringify({ cantidad: 1 }) })
      const j = await res.json()
      if (res.ok) setLista(prev => prev.map(x => x.id === r.id ? { ...x, actual: j.actual } : x))
      else setLista(prev => prev.map(x => x.id === r.id ? { ...x, actual: j.actual ?? r.actual } : x))
    } catch { setLista(prev => prev.map(x => x.id === r.id ? { ...x, actual: r.actual } : x)) }
  }

  const guardarRecurso = async () => {
    if (!recursoEdit) return
    const tipo = recursoEdit.tipo || 'path'
    try {
      if (tipo === 'feature') {
        const res = await apiFetch(`/personaje/${personajeId}/feature/${recursoEdit.clave}`,
          { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) setRecursosFeat(prev => prev.map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x))
      } else if (tipo === 'feat') {
        const res = await apiFetch(`/personaje/${personajeId}/feat-resource/${recursoEdit.id}`,
          { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) setRecursosFeat(prev => prev.map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x))
      } else if (tipo === 'path') {
        const res = await apiFetch(`/personaje/${personajeId}/path-resource/${recursoEdit.id}`,
          { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) setRecursos(prev => prev.map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x))
      } else if (tipo === 'bond') {
        const res = await apiFetch(urlBond(), { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) setPokeData(p => p && ({ ...p, path_recursos: (p.path_recursos || []).map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x) }))
      } else {
        const res = await apiFetch(urlDados(tipo), { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
        const j = await res.json()
        if (res.ok) (tipo === 'hd-trainer' ? setHdTrainer : setHdPoke)({ actual: j.actual, maximo: j.maximo })
      }
    } catch { /* noop */ }
    setRecursoEdit(null)
  }

  // ── Dados de golpe ────────────────────────────────────────────────────────
  const urlDados = tipo => tipo === 'hd-trainer'
    ? `/personaje/${personajeId}/hit-dice`
    : `/personaje/${personajeId}/pokemon/${pokemonInvocado}/hit-dice`

  // Gastar un dado: optimista y con reconciliación, igual que los Extra Points
  const gastarDado = async (tipo) => {
    const set = tipo === 'hd-trainer' ? setHdTrainer : setHdPoke
    const previo = tipo === 'hd-trainer' ? hdTrainer : hdPoke
    if (!previo || previo.actual <= 0) return
    set({ ...previo, actual: previo.actual - 1 })
    try {
      const res = await apiFetch(urlDados(tipo), { method: 'PATCH', body: JSON.stringify({ cantidad: 1 }) })
      const j = await res.json()
      set({ actual: j.actual ?? previo.actual, maximo: j.maximo ?? previo.maximo })
    } catch { set(previo) }
  }

  // Puntos de vínculo del Pokémon invocado: mismo patrón que los Extra Points
  const urlBond = () => `/personaje/${personajeId}/pokemon/${pokemonInvocado}/bond-points`

  const gastarBond = async (r) => {
    if (!r || r.actual <= 0) return
    const previo = pokeData?.path_recursos
    setPokeData(p => p && ({ ...p, path_recursos: (p.path_recursos || []).map(x => x.id === r.id ? { ...x, actual: x.actual - 1 } : x) }))
    try {
      const res = await apiFetch(urlBond(), { method: 'PATCH', body: JSON.stringify({ cantidad: 1 }) })
      const j = await res.json()
      setPokeData(p => p && ({ ...p, path_recursos: (p.path_recursos || []).map(x => x.id === r.id ? { ...x, actual: j.actual ?? x.actual, maximo: j.maximo ?? x.maximo } : x) }))
    } catch { setPokeData(p => p && ({ ...p, path_recursos: previo })) }
  }

  const abrirLapizBond = (r) => {
    setRecursoEdit({ tipo: 'bond', nombre: r.nombre, maximo: r.maximo, id: r.id })
    setRecursoVal(r.actual)
  }

  const abrirLapizDados = (tipo) => {
    const d = tipo === 'hd-trainer' ? hdTrainer : hdPoke
    if (!d) return
    setRecursoEdit({ tipo, nombre: 'Dados de golpe', maximo: d.maximo })
    setRecursoVal(d.actual)
  }

  // Los dos abrir* piden primero y pintan después: mientras llega la respuesta
  // el panel que estuviera abierto sigue en pantalla, con la pokébola girando
  // encima. Antes se cambiaba de panel al empezar y la ventana se quedaba en
  // blanco todo lo que tardara el servidor.
  const openTrainerControl = async () => {
    setCargandoPanel('trainer')
    try {
      // /full trae stats, feats y especialidades: el HP se calcula con sus bonos
      const d = await apiFetch(`/personaje/${personajeId}/full`).then(r => r.json())
      const { max, cur } = hpValues(d)
      // Rasgos de la ruta que ya alcanzó: los de nivel <= su nivel actual
      const nivel = Number(d.personaje_level) || 1
      const rasgos = d.path
        ? [2, 5, 9, 15]
            .filter(n => nivel >= n && (d.path[`path_level_${n}_feature_name`] || d.path[`path_level_${n}_description`]))
            .map(n => ({
              nivel: n,
              nombre: d.path[`path_level_${n}_feature_name`],
              descripcion: d.path[`path_level_${n}_description`],
              bonos: (d.path.bonos_catalogo || []).filter(b => Number(b.level) === n),
            }))
        : []
      const { skills: skillsTrainer, dexMod, stats: statsTrainer } = construirSkillsTrainer(d)
      // Proficiencias de arma: salen de este mismo /full, así que la pestaña
      // Weapon no tiene que volver a pedirlo. Importa el feat que la otorga —
      // si dejó de estar vigente, el arma ya no cuenta como proficiente.
      const profsTrainer = buildProfs(d)

      // Ya está todo calculado: recién aquí se hace el cambio, de una sola vez.
      setCharNombre(d.nombre_personaje || '')
      setCharProfs(profsTrainer)
      setRecursosRasgos(rasgos)
      // Recursos de la ruta y su título: el nombre del path, o "Trainer"
      // mientras no tenga uno (nivel 1).
      setRecursos(Array.isArray(d.path_recursos) ? d.path_recursos : [])
      setRecursosTitulo(d.path?.path_name || 'Trainer')
      setCharSkills(skillsTrainer)
      setCharData({
        stats: statsTrainer,
        hp: cur, hpMax: max,
        level: nivel,
        // Van en la columna izquierda, donde el Pokémon lleva STAB/PROF/AC
        prof: d.personaje_prof,
        ac:   acDelTrainer(d, dexMod),
        sr:   d.personaje_sr,
        init: dexMod,
        speeds: d.personaje_speed != null ? [['Speed', `${d.personaje_speed} ft`]] : [],
        exhaust: d.personaje_exahust_lvl ?? 0, dsts: d.personaje_dsts ?? 0, dstf: d.personaje_dstf ?? 0,
        // Bono de ataque de su ruta, para el campo Bonus de la fórmula
        attack_bonus_path: d.attack_bonus_path || { total: 0, detalle: [] },
      })
      setHdTrainer({ actual: d.personaje_hit_dice_left ?? 0, maximo: d.hit_dice_pool ?? 0 })
      setRecursosFeat(Array.isArray(d.feat_recursos) ? d.feat_recursos : [])
      setPokeData(null)
      setOpenControl('trainer')
    } catch { /* si falla, se queda donde estaba en vez de dejar el hueco */ }
    finally { setCargandoPanel(null) }
  }

  // Abrir control del Pokémon invocado
  const openPokemonControl = async () => {
    if (!pokemonInvocado) return
    setCargandoPanel('pokemon')
    try {
      const d = await apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}`).then(r => r.json())
      const moves = Array.isArray(d.moves) ? d.moves : []

      // Habilidades con su modificador: misma fórmula que el detalle del Pokémon
      // (stat base + bonus + overlay de feats, tope por nivel, más proficiencia).
      const stats = d.stats || {}
      const lvl = Number(d.pokemon_level) || 1
      const capStat = x => Math.min(x, lvl >= 20 ? 22 : 20)
      const conFeats = (d.feats || []).length > 0
      const statAdd = {}, skProf = new Set(), skExpert = new Set()
      if (conFeats) for (const f of (d.feats || [])) for (const b of (f.bonos || [])) {
        const t = (b.type || '').toLowerCase(), llave = (b.llave || '').toLowerCase()
        if (t === 'stat') statAdd[llave] = (statAdd[llave] || 0) + (Number(b.value) || 0)
        else if (t === 'skill') {
          const val = (b.value || '').toLowerCase()
          if (val === 'expert') skExpert.add(llave); else if (val === 'prof') skProf.add(llave)
        }
      }
      const statVal = k => {
        const x = (Number(stats[`pokemon_${k}`]) || 0) + (Number(stats[`pokemon_${k}_bonus`]) || 0) + (statAdd[k] || 0)
        return conFeats ? capStat(x) : x
      }
      const modOf = k => Math.floor((statVal(k) - 10) / 2)
      const profBonus = Number(d.pokemon_proficient) || 2
      const skills = (Array.isArray(d.skills) ? d.skills : []).map(s => {
        const nombre = (s.skill_name || '').toLowerCase()
        let pref = !!s.pokemon_skill_pref, expert = !!s.pokemon_skill_expert
        if (conFeats) {
          if (skProf.has(nombre)) pref = true
          if (skExpert.has(nombre)) { if (pref) expert = true; else pref = true }
        }
        return {
          name: s.skill_name,
          ability: s.skill_related_ability,
          pref, expert,
          // especializacion_extra lo resuelve el backend: ya viene en 0 si la
          // característica asociada no es proficiente o si no coincide el tipo.
          mod: modOf((s.skill_related_ability || '').toLowerCase()) + (pref ? profBonus : 0) + (expert ? profBonus : 0)
             + (Number(s.especializacion_extra) || 0),
        }
      })
      // Proficiencia en la tirada de salvación, igual que en el entrenador: es
      // la que marca en verde el recuadro y la que decide el bono de
      // especialización sobre las habilidades.
      const statsLista = ['str','dex','con','int','wis','cha'].map(k => ({
        key: k.toUpperCase(), valor: statVal(k), mod: modOf(k),
        prof: !!stats[`pokemon_stats_${k}_prof`],
      }))
      // La ruta del entrenador viaja en el propio detalle, así que su pestaña se
      // ve igual aunque no se haya abierto antes el panel del jugador. Antes
      // dependía de eso y se quedaba vacía.
      const nivelT = Number(d.trainer_path_level) || 0
      const rasgosT = d.trainer_path
        ? [2, 5, 9, 15]
            .filter(n => nivelT >= n && (d.trainer_path[`path_level_${n}_feature_name`] || d.trainer_path[`path_level_${n}_description`]))
            .map(n => ({
              nivel: n,
              nombre: d.trainer_path[`path_level_${n}_feature_name`],
              descripcion: d.trainer_path[`path_level_${n}_description`],
              bonos: (d.trainer_path.bonos_catalogo || []).filter(b => Number(b.level) === n),
            }))
        : []

      // Ya está todo calculado: recién aquí se hace el cambio, de una sola vez.
      setRecursos(Array.isArray(d.trainer_path_recursos) ? d.trainer_path_recursos : [])
      setRecursosFeat(Array.isArray(d.trainer_feat_recursos) ? d.trainer_feat_recursos : [])
      setRecursosRasgos(rasgosT)
      setRecursosTitulo(d.trainer_path?.path_name || 'Trainer')
      setHdPoke({ actual: d.pokemon_hit_dice_left ?? 0, maximo: d.hit_dice_pool ?? 0 })
      setPokeData({
        path_recursos: Array.isArray(d.path_recursos) ? d.path_recursos : [],
        stats: statsLista,
        hp: d.pokemon_current_hp ?? d.pokemon_hp ?? 0, hpMax: d.pokemon_hp ?? 0,
        exhaust: d.personaje_pokemon_exahust_lvl ?? 0, dsts: d.personaje_pokemon_dsts ?? 0, dstf: d.personaje_pokemon_dstf ?? 0,
        moves,
        pasivas: Array.isArray(d.pasivas) ? d.pasivas : [],
        skills,
        // El STAB parte de la proficiencia y suma el bono de ruta del entrenador
        stab: (Number(d.pokemon_proficient) || 0) + (Number(d.pokemon_stab_extra) || 0),
        prof: d.pokemon_proficient,
        ac: d.personaje_pokemon_ac,
        sr: d.pokemon_sr,   // de la especie: no cambia con el ejemplar
        // Regla 6: bonos de ataque condicionales que dan sus feats
        attack_bonos: d.feat_efectos?.attack_bonos || [],
        // Bonos de elemento: el tipo elegido, que se cambia desde la pestaña Bonus
        feat_elementos: Array.isArray(d.feat_elementos) ? d.feat_elementos : [],
        // Bono de ataque que le da la ruta de su entrenador
        attack_bonus_path: d.attack_bonus_path || { total: 0, detalle: [] },
        // Iniciativa: el modificador de DEX, igual que el entrenador. Se
        // calcula al leer y no se guarda, así ya viene con la naturaleza, los
        // bonos de feats y el tope por nivel que aplica statVal. La columna
        // pokemon_initiative no se usa: guarda un 3 fijo desde la creación.
        init: modOf('dex'),
        // Las velocidades son del ejemplar, no de la especie: se editan por
        // Pokémon y pueden ser varias (andar, volar, nadar, trepar).
        speeds: [1, 2, 3, 4]
          .filter(i => d[`personaje_pokemon_speed${i}_name`])
          .map(i => [d[`personaje_pokemon_speed${i}_name`], d[`personaje_pokemon_speed${i}_value`]]),
        name: d.pokemon_apodo || 'Pokémon',
        level: d.pokemon_level,
        typeId1: d.personaje_pokemon_type_1, typeId2: d.personaje_pokemon_type_2,
      })
      setCharData(null)
      setOpenControl('pokemon')
    } catch { /* si falla, se queda donde estaba en vez de dejar el hueco */ }
    finally { setCargandoPanel(null) }
  }

  // Movimiento cuya fórmula se está resolviendo, antes de llegar a los PP, y el
  // poder que salió de ella: se anuncia junto con los PP gastados.
  const [formulaMove, setFormulaMove] = useState(null)
  const [poderAtaque, setPoderAtaque] = useState(null)

  // Lanzar movimiento del Pokémon invocado → animación de ataque (como el master)
  // Al pulsar la flecha se abre el popup para elegir cuántos PP gastar
  const abrirPP = (m, poder = null) => {
    // Struggle y demás movimientos de PP ilimitado no gastan nada: se lanzan directo
    if ((Number(m.personaje_pokemon_moves_max_pp) || 0) === 0) { lanzar(m, poder, 0); return }
    setPpMove(m); setPpCantidad(1); setPpError('')
  }

  // Al lanzar, primero la fórmula del ataque y solo después los PP. Cerrarla sin
  // continuar cancela el lanzamiento: no se gasta nada.
  const abrirFormulaAtaque = (m) => setFormulaMove(m)

  // Dispara el ataque y arranca el cooldown
  const lanzar = (m, poder = null, pp = 0) => {
    partidaApiRef.current?.sendAttack?.({
      pokemonName: pokeData?.name || 'Pokémon', moveName: m.move_name, type: m.move_type, hidden: false,
      poder, pp,
    })
    setCastCooldown(true)
    if (castTimer.current) clearTimeout(castTimer.current)
    castTimer.current = setTimeout(() => setCastCooldown(false), 3000)
  }

  // Gestión manual de PP: se edita en local y solo se persiste al confirmar
  const abrirGestionPP = (m) => {
    setGpMove(m)
    setGpMax(Number(m.personaje_pokemon_moves_max_pp) || 0)
    setGpCur(Number(m.personaje_pokemon_moves_current_pp) || 0)
    setGpError('')
  }

  const confirmarGestionPP = async () => {
    const m = gpMove
    if (!m || gpBusy) return
    setGpBusy(true); setGpError('')
    try {
      const res = await apiFetch(
        `/personaje/${personajeId}/pokemon/${pokemonInvocado}/moves/${m.personaje_pokemon_moves_id}/pp`,
        { method: 'PUT', body: JSON.stringify({ current_pp: gpCur, max_pp: gpMax }) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setGpError(j.error || 'No se pudo guardar'); setGpBusy(false); return
      }
      const j = await res.json()
      setPokeData(prev => prev && ({
        ...prev,
        moves: (prev.moves || []).map(x => x.personaje_pokemon_moves_id === m.personaje_pokemon_moves_id
          ? { ...x, personaje_pokemon_moves_current_pp: j.current_pp, personaje_pokemon_moves_max_pp: j.max_pp } : x),
      }))
      setGpMove(null)
    } catch { setGpError('No se pudo guardar') } finally { setGpBusy(false) }
  }

  // Confirma el gasto: lo persiste y solo entonces dispara el ataque
  const confirmarPP = async () => {
    const m = ppMove
    if (!m || ppBusy) return
    const maxPP = Number(m.personaje_pokemon_moves_max_pp) || 0
    setPpBusy(true); setPpError('')
    try {
      if (maxPP > 0) { // max 0 = PP ilimitado: no se descuenta nada
        const res = await apiFetch(
          `/personaje/${personajeId}/pokemon/${pokemonInvocado}/moves/${m.personaje_pokemon_moves_id}/pp`,
          { method: 'PATCH', body: JSON.stringify({ cantidad: ppCantidad }) })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setPpError(j.error || 'No se pudo gastar los PP'); setPpBusy(false); return
        }
        const j = await res.json()
        // Refleja el nuevo saldo sin volver a pedir todo el detalle
        setPokeData(prev => prev && ({
          ...prev,
          moves: (prev.moves || []).map(x => x.personaje_pokemon_moves_id === m.personaje_pokemon_moves_id
            ? { ...x, personaje_pokemon_moves_current_pp: j.current_pp } : x),
        }))
      }
      setPpMove(null)
      lanzar(m, poderAtaque, maxPP > 0 ? ppCantidad : 0)
    } catch { setPpError('No se pudo gastar los PP') } finally { setPpBusy(false) }
  }

  const toBody = (patch) => {
    const b = {}
    if ('hp' in patch) b.current_hp = patch.hp
    if ('exhaust' in patch) b.exhaust_lvl = patch.exhaust
    if ('dsts' in patch) b.dsts = patch.dsts
    if ('dstf' in patch) b.dstf = patch.dstf
    return b
  }
  const pendingPersist = useRef(Promise.resolve())
  // Tras guardar, avisa a los demás para que su panel (party/rival) se actualice de inmediato
  const persistChar = (patch) => {
    const p = apiFetch(`/personaje/${personajeId}/combate`, { method: 'PATCH', body: JSON.stringify(toBody(patch)) })
      .then(() => { partidaApiRef.current?.sendPartyUpdate?.() }).catch(() => {})
    pendingPersist.current = p
    return p
  }
  const persistPoke = (patch) => {
    const p = apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}/combate`, { method: 'PATCH', body: JSON.stringify(toBody(patch)) })
      .then(() => { partidaApiRef.current?.sendPartyUpdate?.() }).catch(() => {})
    pendingPersist.current = p
    return p
  }

  // Avisa a los demás (cuando el último guardado terminó) para que la Party se actualice en vivo
  const notifyParty = () => {
    Promise.resolve(pendingPersist.current).finally(() => partidaApiRef.current?.sendPartyUpdate?.())
  }

  // Cierra el control y avisa a los demás
  const closeControl = () => {
    setOpenControl(null)
    notifyParty()
  }

  const returnPokemon = () => {
    if (pokemonInvocado != null) persistEnJuego(pokemonInvocado, false)
    setPokemonInvocado(null); setInvocadoSprite(null)
    setOpenControl(null); setPokeData(null)
    notifyParty()
  }

  const sideBtn = `${ICONO_REDONDO} w-10 h-10`

  // En modo lucha, los no seleccionados no ven sus iconos inferiores
  const hideBottomIcons = fight.active && !fight.players.some(p => String(p.id_personaje) === String(personajeId))

  return (
    <PartidaRoom roleLabel="Trainer" personajeId={personajeId} apiRef={partidaApiRef} pokemonInvocado={pokemonInvocado} onFight={setFight} onPartyVersion={setPartyVersion}>
      {/* Mejora obligatoria por subida de nivel (una a la vez, no se puede cerrar) */}
      {pending.length > 0 && personajeId && (
        <PendingImprovementModal personajeId={personajeId} pending={pending[0]} onConfirmed={trasEventoPokemon} />
      )}

      {/* Gestión de PP: edita máximo y actual, se persiste solo al confirmar */}
      {gpMove && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget && !gpBusy) setGpMove(null) }}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-[17rem] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm">Gestion de PP</h4>
                <p className="text-[11px] text-gray-400 truncate">{gpMove.move_name}</p>
              </div>
              <button onClick={() => setGpMove(null)} disabled={gpBusy}
                className="text-gray-400 hover:text-white shrink-0 disabled:opacity-40"><X size={16} /></button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {[
                ['PP máximos', gpMax, (n) => { const v = Math.max(0, n); setGpMax(v); if (gpCur > v) setGpCur(v) }],
                ['PP actuales', gpCur, (n) => setGpCur(Math.max(0, Math.min(gpMax, n)))],
              ].map(([label, valor, set]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">{label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => set(valor - 1)} disabled={gpBusy || valor <= 0}
                      className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-red-600 disabled:opacity-30 flex items-center justify-center text-white transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-black text-white tabular-nums">{valor}</span>
                    <button onClick={() => set(valor + 1)} disabled={gpBusy}
                      className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-green-600 disabled:opacity-30 flex items-center justify-center text-white transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setGpCur(gpMax)} disabled={gpBusy || gpCur === gpMax}
                className="w-full text-xs font-bold text-gray-200 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 py-1.5 rounded-lg transition-colors">
                Restore
              </button>
              {gpError && <p className="text-xs text-red-400 font-medium text-center">{gpError}</p>}
            </div>
            <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-center">
              <button onClick={confirmarGestionPP} disabled={gpBusy}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg transition-colors">
                {gpBusy ? <PokeballSpinner size={15} /> : null} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PPs a gastar antes de lanzar el movimiento */}
      {/* Fórmula del ataque: va delante de la ventana de PP */}
      {formulaMove && (
        <FormulaAtaqueModal
          move={formulaMove}
          prof={pokeData?.prof}
          stats={pokeData?.stats || []}
          bonoRuta={pokeData?.attack_bonus_path || { total: 0, detalle: [] }}
          onClose={() => { setFormulaMove(null); setPoderAtaque(null) }}
          onAtacar={(poder) => { const m = formulaMove; setPoderAtaque(poder); setFormulaMove(null); abrirPP(m, poder) }}
        />
      )}

      {ppMove && (() => {
        const maxPP = Number(ppMove.personaje_pokemon_moves_max_pp) || 0
        const actual = Number(ppMove.personaje_pokemon_moves_current_pp) || 0
        const tope = maxPP > 0 ? actual : 99 // max 0 = ilimitado
        const set = (n) => setPpCantidad(Math.max(1, Math.min(tope, n)))
        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={e => { if (e.target === e.currentTarget && !ppBusy) setPpMove(null) }}>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-[15rem] shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-sm">PPs a gastar</h4>
                  <p className="text-[11px] text-gray-400 truncate">{ppMove.move_name}</p>
                </div>
                <button onClick={() => setPpMove(null)} disabled={ppBusy}
                  className="text-gray-400 hover:text-white shrink-0 disabled:opacity-40"><X size={16} /></button>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => set(ppCantidad - 1)} disabled={ppBusy || ppCantidad <= 1}
                    className="w-9 h-9 shrink-0 rounded-lg bg-gray-700 hover:bg-red-600 disabled:opacity-30 flex items-center justify-center text-white transition-colors">
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center text-2xl font-black text-white tabular-nums">{ppCantidad}</span>
                  <button onClick={() => set(ppCantidad + 1)} disabled={ppBusy || ppCantidad >= tope}
                    className="w-9 h-9 shrink-0 rounded-lg bg-gray-700 hover:bg-green-600 disabled:opacity-30 flex items-center justify-center text-white transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-center text-[11px] text-gray-400 mt-2">
                  {maxPP > 0 ? `Disponibles ${actual}/${maxPP}` : 'PP ilimitados'}
                </p>
                {ppError && <p className="text-xs text-red-400 font-medium mt-2 text-center">{ppError}</p>}
              </div>
              <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-center">
                <button onClick={confirmarPP} disabled={ppBusy}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg transition-colors">
                  {ppBusy ? <PokeballSpinner size={15} /> : null} Confirmar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Renombrar Pokémon recibido: obligatorio, no se puede cerrar.
          Va por encima de la mejora de nivel para que el jugador sepa primero
          qué Pokémon acaba de recibir. */}
      {/* Subida de nivel del entrenador: se resuelve un nivel a la vez, del más
          bajo al más alto, y va por delante del renombrado porque puede cambiar
          los pokéslots. */}
      {levelUps.length > 0 && (
        <TrainerLevelUpModal
          key={levelUps[0].id}
          personajeId={personajeId}
          pending={levelUps[0]}
          // Bump de partyVersion: el nivel cambia stats, prof y pokéslots,
          // así que la ficha y el cinturón tienen que releerse.
          onConfirmed={() => { refreshLevelUps(); setPartyVersion(v => v + 1) }}
        />
      )}

      {renames.length > 0 && (() => {
        const r = renames[0]
        const sprite = (r.pokemon_is_shiny && r.pokemon_media_sprite_shiny) ? r.pokemon_media_sprite_shiny : r.pokemon_media_sprite
        // El campo arranca con el apodo actual y solo se sobreescribe cuando el
        // jugador escribe; así no hace falta un efecto que sincronice el estado.
        const nuevoApodo = apodoEdit.id === r.id_personaje_pokemon ? apodoEdit.value : (r.pokemon_apodo ?? '')
        const valido = nuevoApodo.trim().length > 0
        const confirmar = async () => {
          if (!valido || renameBusy) return
          setRenameBusy(true); setRenameError('')
          try {
            const res = await apiFetch(`/personaje/${personajeId}/pokemon/${r.id_personaje_pokemon}/apodo`,
              { method: 'PATCH', body: JSON.stringify({ apodo: nuevoApodo.trim() }) })
            if (!res.ok) { const j = await res.json().catch(() => ({})); setRenameError(j.error || 'No se pudo guardar'); return }
            refreshRenames()
          } catch { setRenameError('No se pudo guardar') } finally { setRenameBusy(false) }
        }
        return (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-black text-gray-900 text-lg leading-tight">Renombrar Pokemon</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{r.pokemon_name} · Nv {r.pokemon_level}</p>
              </div>
              <div className="px-5 py-4">
                {sprite && (
                  <img src={sprite} alt="" className="w-20 h-20 object-contain mx-auto mb-2"
                    onError={e => { e.target.style.opacity = '0.2' }} />
                )}
                <label htmlFor="apodo-nuevo" className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Apodo</label>
                <input id="apodo-nuevo" value={nuevoApodo} autoFocus maxLength={60}
                  onChange={e => { setApodoEdit({ id: r.id_personaje_pokemon, value: e.target.value }); setRenameError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') confirmar() }}
                  className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                {renameError && <p className="text-xs text-red-600 font-medium mt-2">{renameError}</p>}
                {renames.length > 1 && (
                  <p className="text-[11px] text-gray-400 mt-2">Quedan {renames.length - 1} por renombrar.</p>
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end">
                <button onClick={confirmar} disabled={!valido || renameBusy}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 rounded-lg transition-colors">
                  {renameBusy ? <PokeballSpinner size={15} /> : null} Confirmar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      <div className="absolute inset-0">
        {/* Zona inferior: sprite del jugador + sprite del Pokémon invocado */}
        {/* fixed y no absolute: con muchos Pokémon invocados el contenedor crece
            y el bottom-4 quedaba anclado al final del contenido, no al de la
            pantalla, así que al hacer scroll los iconos se iban al medio.
            z-[48] los deja por encima de todo el campo -- las tarjetas de los
            invocados van en z-10 y llegaban a taparlos hasta impedir el clic --
            y por debajo de los modales, que empiezan en z-50. */}
        {!hideBottomIcons && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[48] flex items-end justify-center gap-10">
          {user?.avatar_face_url && (
            <button onClick={openTrainerControl} className="transition-transform hover:scale-105" title="Controlar jugador">
              {/* data-throw-origin: PartidaRoom lo mide para lanzar la pokébola desde aquí */}
              <img src={user.avatar_face_url} alt="Jugador" data-throw-origin="1"
                className={`${isMonitor ? 'w-[66px] h-[66px]' : 'w-11 h-11'} object-contain`} onError={e => { e.target.style.opacity = '0.2' }} />
            </button>
          )}
          {pokemonInvocado && invocadoSprite && (
            <button onClick={openPokemonControl} className="transition-transform hover:scale-105" title="Controlar Pokémon">
              <img src={invocadoSprite} alt="Pokémon invocado"
                className={`${isMonitor ? 'w-[66px] h-[66px]' : 'w-11 h-11'} object-contain`} onError={e => { e.target.style.opacity = '0.2' }} />
            </button>
          )}
        </div>
        )}

        {/* Pokédex — flotante justo debajo del botón de notas de PartidaRoom */}
        <button onClick={() => { setPokedexListo(false); setShowPokedex(true) }} className={`${sideBtn} fixed left-3 top-52 z-40`} title="Abrir Pokédex">
          <Smartphone size={18} />
        </button>

        {/* Botones laterales — columna centrada y scrolleable (para pantallas bajas) */}
        <div className="fixed left-3 top-64 bottom-3 z-30 overflow-y-auto">
          <div className="min-h-full flex flex-col justify-center gap-2 py-1">
            {personajeId && (
              <button onClick={() => setShowChar(true)} className={sideBtn} title="Ver mi personaje">
                <User size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowMochila(true)} className={sideBtn} title="Mochila">
                <Backpack size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowEquip(true)} className={sideBtn} title="Equipamiento">
                <span className="relative inline-flex items-center justify-center">
                  <Shield size={18} />
                  <Sword size={11} className="absolute -bottom-1 -right-1.5" />
                </span>
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowBelt(true)} className={sideBtn} title="Cinturón">
                <PokeballsIcon size={18} />
              </button>
            )}

            {personajeId && (
              <button onClick={() => setShowPC(true)} className={sideBtn} title="Femputadora">
                <Monitor size={18} />
              </button>
            )}

            {personajeId && (
              <button
                onClick={() => { if (isEditable) setShowEdit(true) }}
                disabled={!isEditable}
                className={`${sideBtn} ${isEditable ? '' : 'opacity-40 cursor-not-allowed hover:bg-gray-700'}`}
                title={isEditable ? 'Editar jugador' : 'Editar jugador (deshabilitado por el master)'}
              >
                {isEditable ? <Pencil size={18} /> : <PencilOff size={18} />}
              </button>
            )}

            {/* Descansos: el visto bueno del DM se pide dentro de la ventana */}
            {personajeId && (
              <button onClick={abrirDescanso} className={sideBtn} title="Tomar un descanso">
                <BedDouble size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Descanso largo / corto */}
      {showDescanso && personajeId && (
        <DescansoModal personajeId={personajeId}
          onClose={() => setShowDescanso(false)}
          onDone={trasDescanso} />
      )}

      {/* Modal Pokédex.
          Aquí la ventana es de esta página pero quien consulta es PokemonList,
          así que no se puede montar solo cuando esté lista: sin montarla no
          consulta. Se monta oculta —invisible mantiene el componente vivo, que
          es lo que hace falta— y la pokébola tapa mientras tanto. */}
      {showPokedex && (
        <>
          {!pokedexListo && (
            <LoadingOverlay label="Pokédex" onClose={() => setShowPokedex(false)} z="z-[55]" />
          )}
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
              pokedexListo ? '' : 'invisible pointer-events-none'}`}
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowPokedex(false) }}
          >
            <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
              <button
                onClick={() => setShowPokedex(false)}
                className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center
                           rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                title="Cerrar"
              >
                <X size={18} />
              </button>
              <PokemonList title="Pokédex" moveDetail onReady={() => setPokedexListo(true)} />
            </div>
          </div>
        </>
      )}

      {/* Hoja del personaje */}
      {showChar && personajeId && (
        <CharacterSheet id={personajeId} onClose={() => setShowChar(false)}
          partyVersion={partyVersion}
          onChanged={() => partidaApiRef.current?.sendPartyUpdate?.()} />
      )}

      {/* Mochila */}
      {showMochila && personajeId && (
        <Mochila personajeId={personajeId}
          onClose={() => { setShowMochila(false); partidaApiRef.current?.reloadPokeballs?.() }} />
      )}

      {/* Equipamiento */}
      {showEquip && personajeId && (
        <Equipamiento personajeId={personajeId} onClose={() => setShowEquip(false)} />
      )}

      {/* Cinturón — Pokémon en el equipo */}
      {showBelt && personajeId && (
        <PokemonBox
          personajeId={personajeId}
          mode="belt"
          editable={isEditable}
          onExpAdded={trasEventoPokemon}
          nombrePersonaje={charNombre}
          onAnuncio={(texto, trainer, pokemon) => partidaApiRef.current?.anunciar?.(texto, trainer, pokemon)}
          onClose={() => setShowBelt(false)}
          onSwitchMode={() => { setShowBelt(false); setShowPC(true) }}
          onInvoke={(idpp, sprite) => {
            persistEnJuego(idpp, true)
            setPokemonInvocado(idpp)
            setInvocadoSprite(sprite)
            setShowBelt(false)
          }}
          onMoved={(idpp) => {
            // Si se envió al computador el Pokémon invocado, se limpia el invocado
            if (String(idpp) === String(pokemonInvocado)) {
              persistEnJuego(idpp, false)
              setPokemonInvocado(null)
              setInvocadoSprite(null)
            }
          }}
        />
      )}

      {/* Femputadora — Pokémon almacenados */}
      {showPC && personajeId && (
        <PokemonBox personajeId={personajeId} partidaId={id} getConectados={() => partidaApiRef.current?.getPresentes?.() ?? []} mode="pc" editable={isEditable} onExpAdded={trasEventoPokemon}
          onMoved={() => { refreshRenames(); partidaApiRef.current?.sendPartyUpdate?.() }}
          nombrePersonaje={charNombre}
          onAnuncio={(texto, trainer, pokemon) => partidaApiRef.current?.anunciar?.(texto, trainer, pokemon)}
          onSwitchMode={() => { setShowPC(false); setShowBelt(true) }}
          onClose={() => setShowPC(false)} />
      )}

      {/* Editar jugador (solo si el master lo habilitó) */}
      {showEdit && personajeId && isEditable && (
        <EditarPersonajeModal
          personajeId={personajeId}
          onClose={() => setShowEdit(false)}
          onChanged={() => partidaApiRef.current?.sendPartyUpdate?.()}
        />
      )}

      {/* Pokébola girando mientras se pide el otro panel. El z-[65] la deja por
          encima de los paneles (z-[60]) y por debajo del lápiz de recursos
          (z-[70]). Sin onClose: la espera es corta y no debe poder pedirse el
          cambio dos veces. */}
      {cargandoPanel && (
        <LoadingOverlay label={cargandoPanel === 'trainer' ? 'Entrenador' : 'Pokémon'} />
      )}

      {/* Control del jugador */}
      {openControl === 'trainer' && charData && (
        <CombatePanel
          title={`${charNombre || 'Jugador'}${charData.level != null ? ` (nivel ${charData.level})` : ''}`}
          // Salta al Pokémon invocado; sin uno en campo no hay atajo
          switchSprite={pokemonInvocado ? invocadoSprite : null}
          switchLabel="Ir al Pokémon"
          onSwitch={openPokemonControl}
          onAtaque={(poder) => partidaApiRef.current?.anunciar?.(
            `${charNombre || 'El entrenador'} ha atacado con un poder de ${poder}`)}
          recursosFeat={recursosFeat}
          weaponProfs={charProfs}
          initial={charData}
          skills={charSkills}
          bonoRuta={charData.attack_bonus_path || { total: 0, detalle: [] }}
          recursos={recursos}
          recursosTitulo={recursosTitulo}
          recursosRasgos={recursosRasgos}
          onSpendBond={gastarBond}
          onManageBond={abrirLapizBond}
          onSpendRecurso={gastarRecurso}
          onManageRecurso={r => { setRecursoEdit(r); setRecursoVal(r.actual) }}
          hitDice={hdTrainer}
          onSpendHitDice={() => gastarDado('hd-trainer')}
          onManageHitDice={() => abrirLapizDados('hd-trainer')}
          personajeId={personajeId}
          onPersist={persistChar}
          onClose={closeControl}
        />
      )}

      {/* Lápiz de un Extra Point: solo ajusta lo que queda. El máximo se deriva
          del personaje (nivel, proficiencia...) y no se edita a mano. */}
      {recursoEdit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setRecursoEdit(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 truncate">{recursoEdit.nombre}</h3>
              <p className="text-[11px] text-gray-500">
                Máximo {recursoEdit.maximo} · {recursoEdit.tipo && recursoEdit.tipo !== 'path' ? 'lo fija el nivel' : 'se deriva de tu personaje'}
              </p>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">
                {recursoEdit.tipo && recursoEdit.tipo !== 'path' ? 'Dados restantes' : 'Puntos restantes'}
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setRecursoVal(v => Math.max(0, v - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center"><Minus size={15} /></button>
                <input type="number" min={0} max={recursoEdit.maximo} value={recursoVal}
                  onChange={e => setRecursoVal(Math.min(recursoEdit.maximo, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
                  className="flex-1 px-3 py-2 text-sm text-center text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                <button onClick={() => setRecursoVal(v => Math.min(recursoEdit.maximo, v + 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center"><Plus size={15} /></button>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setRecursoEdit(null)} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
              <button onClick={guardarRecurso}
                className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg transition-colors">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Objetos equipados del Pokémon invocado. En modo combate solo se
          consultan y se usan: quitarlos y devolverlos a la mochila es cosa del
          cinturón, no de la mesa. */}
      {heldOpen && pokemonInvocado && (
        <HeldItemsModal
          personajeId={personajeId}
          idpp={pokemonInvocado}
          modo="combate"
          onClose={() => setHeldOpen(false)}
        />
      )}

      {/* Control del Pokémon invocado */}
      {openControl === 'pokemon' && pokeData && (
        <CombatePanel
          title={`${pokeData.name || 'Pokémon'}${pokeData.level != null ? ` (nivel ${pokeData.level})` : ''}`}
          // De vuelta al entrenador: aquí siempre hay a dónde ir
          switchSprite={user?.avatar_face_url || null}
          switchLabel="Ir al entrenador"
          onSwitch={openTrainerControl}
          onHeldItems={() => setHeldOpen(true)}
          attackBonos={pokeData.attack_bonos || []}
          recursosTrainer={recursos}
          recursosFeat={recursosFeat}
          elementos={pokeData.feat_elementos || []}
          onSpendRecurso={gastarRecurso}
          onManageRecurso={r => { setRecursoEdit(r); setRecursoVal(r.actual) }}
          initial={pokeData}
          moves={pokeData.moves}
          pasivas={pokeData.pasivas}
          skills={pokeData.skills}
          onCastRequest={abrirFormulaAtaque}
          onManagePP={abrirGestionPP}
          castDisabled={castCooldown}
          hitDice={hdPoke}
          recursosPokemon={pokeData.path_recursos || []}
          recursosRasgos={recursosRasgos}
          onSpendBond={gastarBond}
          onManageBond={abrirLapizBond}
          onSpendHitDice={() => gastarDado('hd-poke')}
          onManageHitDice={() => abrirLapizDados('hd-poke')}
          personajeId={personajeId}
          onPersist={persistPoke}
          onReturn={returnPokemon}
          onClose={closeControl}
        />
      )}
    </PartidaRoom>
  )
}

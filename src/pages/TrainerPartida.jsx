import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Smartphone, User, Backpack, Shield, Sword, Monitor, X, Minus, Plus, ChevronUp, ChevronDown, Pencil, PencilOff, Loader2, ArrowRight } from 'lucide-react'
import PartidaRoom from '../components/PartidaRoom'
import PokemonList from './PokemonList'
import CharacterSheet from '../components/CharacterSheet'
import TrainerLevelUpModal from '../components/TrainerLevelUpModal'
import Mochila from '../components/Mochila'
import Equipamiento from '../components/Equipamiento'
import PokemonBox from '../components/PokemonBox'
import PendingImprovementModal from '../components/PendingImprovementModal'
import MoveInfoModal from '../components/MoveInfoModal'
import EditarPersonajeModal from '../components/EditarPersonajeModal'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import { hpValues } from '../lib/hp'
import TypeEffectivenessView from '../components/TypeEffectivenessView'

// Ícono de 3 pokébolas (para el cinturón)
function PokeballsIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round">
      {[5, 12, 19].map(cx => (
        <g key={cx}>
          <circle cx={cx} cy="12" r="3.4" />
          <line x1={cx - 3.4} y1="12" x2={cx + 3.4} y2="12" />
          <circle cx={cx} cy="12" r="0.9" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  )
}

// Ícono de una pokébola (regresar)
function PokeballIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h6M15 12h6" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

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

const hpColorPct = pct => (pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444')
// Experiencia: rojo ≤20%, amarillo 21-80%, verde ≥81%
const expColorPct = pct => (pct >= 81 ? '#22c55e' : pct >= 21 ? '#eab308' : '#ef4444')

const MOVE_TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
}

// Panel de control (HP + exhaust/dsts/dstf + movimientos). Persiste cada cambio vía onPersist.
function CombatePanel({ title, initial, moves, pasivas = [], skills = [], onCastRequest, onManagePP, castDisabled = false, onPersist, onReturn, onClose, recursos = null, recursosTitulo = '', recursosRasgos = [], onSpendRecurso, onManageRecurso }) {
  const [tabPanel, setTabPanel] = useState('moves')
  const [v, setV] = useState(initial)
  useEffect(() => { setV(initial) }, [initial])
  const [moveInfo, setMoveInfo] = useState(null) // movimiento cuyo detalle se muestra
  const [abilityInfo, setAbilityInfo] = useState(null) // pasiva cuyo detalle se muestra


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
      <div className={`bg-gray-800 border border-gray-700 rounded-2xl p-4 shadow-2xl max-h-[90vh] overflow-y-auto ${(moves && moves.length > 0) || recursos ? 'w-[26rem] max-w-[95vw]' : 'w-72'}`}>
        <div className="flex items-center justify-between mb-3">
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

        {/* Experiencia (solo Pokémon) — barra debajo del HP */}
        {v.exp !== undefined && (() => {
          const next = v.expNext
          const pctExp = next ? Math.max(0, Math.min(100, Math.round((v.exp / next) * 100))) : 100
          return (
            <div className="mt-2 px-10">
              <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pctExp}%`, backgroundColor: expColorPct(pctExp) }} />
              </div>
              <p className="text-center text-[10px] font-bold text-gray-300 mt-1">
                EXP {v.exp.toLocaleString()}{next != null ? ` / ${next.toLocaleString()}` : ' · Máx'}
              </p>
            </div>
          )
        })()}

        {/* Dos columnas sin separador visible: a la izquierda los valores fijos
            del Pokémon, a la derecha los contadores editables. */}
        <div className="mt-3 border-t border-gray-700 pt-3 grid grid-cols-2 gap-x-5">
          {/* Valores fijos: solo los tiene el Pokémon, no el entrenador.
              Dos por columna para que ocupen la mitad de alto. */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 content-start">
            {[
              ['STAB', v.stab != null ? `+${v.stab}` : null],
              ['PROF', v.prof != null ? `+${v.prof}` : null],
              ['AC',   v.ac],
              ['SALV', v.saving],
              ['SR',   v.sr],
            ].filter(([, val]) => val !== null && val !== undefined && val !== '').map(([label, val]) => (
              <div key={label} className="flex items-center justify-between gap-1 h-7 min-w-0">
                <span className="text-[10px] font-black text-gray-400 uppercase shrink-0">{label}</span>
                <span className="font-black text-white text-sm truncate">{val}</span>
              </div>
            ))}
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
                {recursos ? <>Clase <span className="text-gray-500 normal-case">· {recursosTitulo}</span></> : 'Movimientos'}
              </p>
            ) : (
              <div className="flex items-center gap-1 mb-1.5">
                {[
                  ['moves',  recursos ? 'Clase' : 'Movimientos'],
                  ['skills', 'Habilidades'],
                  ...(v.stats?.length ? [['stats', 'Stats']] : []),
                ].map(([k, label]) => (
                  <button key={k} onClick={() => setTabPanel(k)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-colors ${
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
                {v.stats.map(st => (
                  <div key={st.key} title={st.prof ? 'Proficiente en su tirada de salvación' : undefined}
                    className={`flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 min-w-0 border ${
                      st.prof ? 'bg-green-900/40 border-green-600' : 'bg-gray-700/50 border-transparent'}`}>
                    <span className={`text-[10px] font-black uppercase shrink-0 ${st.prof ? 'text-green-300' : 'text-gray-400'}`}>{st.key}</span>
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

            {/* Pestaña Clase del entrenador: los Extra Points de su ruta */}
            {recursos && (
              <div className={`${tabPanel !== 'moves' ? 'hidden' : ''}`}>
            {recursos.length === 0 && recursosRasgos.length === 0 ? (
              <p className="text-[11px] text-gray-500 italic">Sin nada por ahora.</p>
            ) : (
              <div className="space-y-1">
                {recursos.map(r => {
                  const vacio = r.actual <= 0
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2 bg-gray-700/50 rounded-lg px-2 py-1.5">
                      <span className="text-white text-xs font-medium truncate">{r.nombre}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          {/* El lápiz solo ajusta lo que queda: el máximo se
                              deriva del personaje y no se edita a mano. */}
                          <button onClick={() => onManageRecurso?.(r)} title="Ajustar puntos"
                            className="shrink-0 text-gray-400 hover:text-amber-300 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <span className={`text-[10px] font-black tabular-nums ${vacio ? 'text-red-400' : 'text-gray-300'}`}>
                            {r.nombre.toUpperCase()} {r.actual}/{r.maximo}
                          </span>
                        </div>
                        <button onClick={() => onSpendRecurso?.(r)} disabled={vacio} title="Gastar un punto"
                          className="flex items-center justify-center text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md transition-colors">
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Rasgos de la ruta ya alcanzados, debajo de los botones */}
            {recursosRasgos.length > 0 && (
              <div className={`space-y-2 ${recursos.length > 0 ? 'mt-2 border-t border-gray-700 pt-2' : ''}`}>
                {recursosRasgos.map(f => (
                  <div key={f.nivel}>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-white bg-gray-600 rounded px-1.5 py-0.5 shrink-0">Nv {f.nivel}</span>
                      <span className="text-xs font-bold text-white">{f.nombre}</span>
                    </div>
                    {f.descripcion && (
                      <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">{f.descripcion}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
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
            <TypeEffectivenessView typeId1={v.typeId1} typeId2={v.typeId2} dark />
          </div>
        )}
      </div>

      {/* Detalle del movimiento seleccionado */}
      {moveInfo && <MoveInfoModal m={moveInfo} onClose={() => setMoveInfo(null)} />}


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
  const [recursoEdit, setRecursoEdit] = useState(null)  // recurso en el lápiz
  const [recursoVal, setRecursoVal]   = useState(0)
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
    setRecursos(prev => prev.map(x => x.id === r.id ? { ...x, actual: x.actual - 1 } : x))
    try {
      const res = await apiFetch(`/personaje/${personajeId}/path-resource/${r.id}`,
        { method: 'PATCH', body: JSON.stringify({ cantidad: 1 }) })
      const j = await res.json()
      if (res.ok) setRecursos(prev => prev.map(x => x.id === r.id ? { ...x, actual: j.actual } : x))
      else setRecursos(prev => prev.map(x => x.id === r.id ? { ...x, actual: j.actual ?? r.actual } : x))
    } catch { setRecursos(prev => prev.map(x => x.id === r.id ? { ...x, actual: r.actual } : x)) }
  }

  const guardarRecurso = async () => {
    if (!recursoEdit) return
    try {
      const res = await apiFetch(`/personaje/${personajeId}/path-resource/${recursoEdit.id}`,
        { method: 'PUT', body: JSON.stringify({ actual: recursoVal }) })
      const j = await res.json()
      if (res.ok) setRecursos(prev => prev.map(x => x.id === recursoEdit.id ? { ...x, actual: j.actual, maximo: j.maximo } : x))
    } catch { /* noop */ }
    setRecursoEdit(null)
  }

  const openTrainerControl = async () => {
    setPokeData(null)
    setOpenControl('trainer')
    try {
      // /full trae stats, feats y especialidades: el HP se calcula con sus bonos
      const d = await apiFetch(`/personaje/${personajeId}/full`).then(r => r.json())
      const { max, cur } = hpValues(d)
      // Recursos de la ruta y su título: el nombre del path, o "Trainer"
      // mientras no tenga uno (nivel 1).
      setCharNombre(d.nombre_personaje || '')
      // Rasgos de la ruta que ya alcanzó: los de nivel <= su nivel actual
      const nivel = Number(d.personaje_level) || 1
      setRecursosRasgos(d.path
        ? [2, 5, 9, 15]
            .filter(n => nivel >= n && (d.path[`path_level_${n}_feature_name`] || d.path[`path_level_${n}_description`]))
            .map(n => ({
              nivel: n,
              nombre: d.path[`path_level_${n}_feature_name`],
              descripcion: d.path[`path_level_${n}_description`],
            }))
        : [])
      setRecursos(Array.isArray(d.path_recursos) ? d.path_recursos : [])
      setRecursosTitulo(d.path?.path_name || 'Trainer')
      const { skills: skillsTrainer, dexMod, stats: statsTrainer } = construirSkillsTrainer(d)
      setCharSkills(skillsTrainer)
      setCharData({
        stats: statsTrainer,
        hp: cur, hpMax: max,
        // Van en la columna izquierda, donde el Pokémon lleva STAB/PROF/AC/SALV
        prof: d.personaje_prof,
        ac:   acDelTrainer(d, dexMod),
        sr:   d.personaje_sr,
        exhaust: d.personaje_exahust_lvl ?? 0, dsts: d.personaje_dsts ?? 0, dstf: d.personaje_dstf ?? 0,
      })
    } catch { /* noop */ }
  }

  // Abrir control del Pokémon invocado
  const openPokemonControl = async () => {
    if (!pokemonInvocado) return
    setCharData(null)
    setOpenControl('pokemon')
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
          mod: modOf((s.skill_related_ability || '').toLowerCase()) + (pref ? profBonus : 0) + (expert ? profBonus : 0),
        }
      })
      const statsLista = ['str','dex','con','int','wis','cha'].map(k => ({
        key: k.toUpperCase(), valor: statVal(k), mod: modOf(k),
      }))
      setPokeData({
        stats: statsLista,
        hp: d.pokemon_current_hp ?? d.pokemon_hp ?? 0, hpMax: d.pokemon_hp ?? 0,
        exhaust: d.personaje_pokemon_exahust_lvl ?? 0, dsts: d.personaje_pokemon_dsts ?? 0, dstf: d.personaje_pokemon_dstf ?? 0,
        moves,
        pasivas: Array.isArray(d.pasivas) ? d.pasivas : [],
        skills,
        // El STAB parte de la proficiencia y suma el bono de ruta del entrenador
        stab: (Number(d.pokemon_proficient) || 0) + (Number(d.pokemon_stab_extra) || 0),
        prof: d.pokemon_proficient,
        ac: d.personaje_pokemon_ac, saving: d.pokemon_saving_throw_prof,
        name: d.pokemon_apodo || 'Pokémon',
        level: d.pokemon_level,
        typeId1: d.personaje_pokemon_type_1, typeId2: d.personaje_pokemon_type_2,
        exp: d.pokemon_experiencia ?? 0, expNext: d.exp_next ?? null,
      })
    } catch { /* noop */ }
  }

  // Lanzar movimiento del Pokémon invocado → animación de ataque (como el master)
  // Al pulsar la flecha se abre el popup para elegir cuántos PP gastar
  const abrirPP = (m) => {
    // Struggle y demás movimientos de PP ilimitado no gastan nada: se lanzan directo
    if ((Number(m.personaje_pokemon_moves_max_pp) || 0) === 0) { lanzar(m); return }
    setPpMove(m); setPpCantidad(1); setPpError('')
  }

  // Dispara el ataque y arranca el cooldown
  const lanzar = (m) => {
    partidaApiRef.current?.sendAttack?.({ pokemonName: pokeData?.name || 'Pokémon', moveName: m.move_name, type: m.move_type, hidden: false })
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
      lanzar(m)
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

  const sideBtn = 'shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-lg border border-gray-600 transition-all'

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
                {gpBusy ? <Loader2 size={15} className="animate-spin" /> : null} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PPs a gastar antes de lanzar el movimiento */}
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
                  {ppBusy ? <Loader2 size={15} className="animate-spin" /> : null} Confirmar
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
                  {renameBusy ? <Loader2 size={15} className="animate-spin" /> : null} Confirmar
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
        <button onClick={() => setShowPokedex(true)} className={`${sideBtn} fixed left-3 top-52 z-40`} title="Abrir Pokédex">
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
          </div>
        </div>
      </div>

      {/* Modal Pokédex */}
      {showPokedex && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            <PokemonList title="Pokédex" moveDetail />
          </div>
        </div>
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
          onClose={() => setShowBelt(false)}
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

      {/* Control del jugador */}
      {openControl === 'trainer' && charData && (
        <CombatePanel
          title={charNombre || 'Jugador'}
          initial={charData}
          skills={charSkills}
          recursos={recursos}
          recursosTitulo={recursosTitulo}
          recursosRasgos={recursosRasgos}
          onSpendRecurso={gastarRecurso}
          onManageRecurso={r => { setRecursoEdit(r); setRecursoVal(r.actual) }}
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
              <p className="text-[11px] text-gray-500">Máximo {recursoEdit.maximo} · se deriva de tu personaje</p>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Puntos restantes</label>
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

      {/* Control del Pokémon invocado */}
      {openControl === 'pokemon' && pokeData && (
        <CombatePanel
          title={`${pokeData.name || 'Pokémon'}${pokeData.level != null ? ` (Nv ${pokeData.level})` : ''}`}
          initial={pokeData}
          moves={pokeData.moves}
          pasivas={pokeData.pasivas}
          skills={pokeData.skills}
          onCastRequest={abrirPP}
          onManagePP={abrirGestionPP}
          castDisabled={castCooldown}
          onPersist={persistPoke}
          onReturn={returnPokemon}
          onClose={closeControl}
        />
      )}
    </PartidaRoom>
  )
}

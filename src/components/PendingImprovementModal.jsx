import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Plus, Minus, Loader2, AlertTriangle } from 'lucide-react'
import { apiFetch } from '../api'
import MasterPokemonFeats from './MasterPokemonFeats'
import MoveInfoModal from './MoveInfoModal'

const STAT_KEYS = ['dex', 'str', 'con', 'int', 'wis', 'cha']
const STAT_LABEL = { dex: 'DEX', str: 'STR', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
const fmtMod = m => (m >= 0 ? `+${m}` : `${m}`)

const TYPE_COLORS = {
  Normal: '#A8A878', Fire: '#F08030', Water: '#6890F0', Grass: '#78C850', Electric: '#F8D030',
  Ice: '#98D8D8', Fighting: '#C03028', Poison: '#A040A0', Ground: '#E0C068', Flying: '#A890F0',
  Psychic: '#F85888', Bug: '#A8B820', Rock: '#B8A038', Ghost: '#705898', Dragon: '#7038F8',
  Dark: '#705848', Steel: '#B8B8D0', Fairy: '#EE99AC', Typeless: '#9CA3AF',
}

const greenText = (type) => {
  const t = (type || '').toLowerCase()
  if (t === 'new moves') return 'Ganaste nuevos movimientos'
  if (t === 'ability score improvement') return 'Ganaste mejoras en status y/o feat'
  return 'Ganaste mejoras en status'
}

/* Alerta de confirmación antes de persistir */
function AlertConfirm({ message, busy, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">{message}</p>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
          <button onClick={onConfirm} disabled={busy}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <Loader2 size={15} className="animate-spin" /> : null} Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Tirada del dado de golpe del nivel: se suma a la vida máxima y actual del Pokémon */
function HpRollField({ dice, max, value, onChange }) {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3">
      <label htmlFor="hp-roll" className="block text-[11px] font-black uppercase tracking-wider text-amber-800 mb-1.5">
        Puntos de golpe ganados
      </label>
      <input
        id="hp-roll" type="number" inputMode="numeric" min={1} max={max || undefined}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={`1 - ${max}`}
        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-lg font-black text-gray-900
                   focus:outline-none focus:ring-2 focus:ring-amber-400" />
      <p className="text-[11px] text-amber-800 mt-1.5">
        Arroja un dado de <b>{dice || '—'}</b> e ingresa el resultado (1 a {max}).
      </p>
    </div>
  )
}

/* Chip de movimiento con botón para moverlo a la otra columna */
function MoveChip({ m, dir, disabled, onMove, onInfo }) {
  return (
    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
      {dir === 'left' && (
        <button onClick={onMove} title="Quitar" className="text-gray-400 hover:text-red-600 shrink-0"><ArrowRight size={14} /></button>
      )}
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[m.move_type] || '#9CA3AF' }} />
      <button onClick={() => onInfo?.(m)} title="Ver detalle del movimiento"
        className="text-xs font-semibold text-gray-800 truncate flex-1 text-left underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-red-700 transition-colors">
        {m.move_name}
      </button>
      {dir === 'right' && (
        <button onClick={onMove} disabled={disabled} title="Aprender"
          className="text-gray-400 hover:text-green-600 disabled:opacity-30 shrink-0"><ArrowLeft size={14} /></button>
      )}
    </div>
  )
}

/* Selector de movimientos por clic (máx 4). Se usa en los dos flujos: los
   movimientos se pueden reacomodar en cualquier subida de nivel. */
function MovesPicker({ learned, available, toAvailable, toLearned, onInfo }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Aprendidos</p>
        <div className="space-y-1.5 min-h-[3rem]">
          {learned.length === 0 && <p className="text-xs text-gray-400 italic">Ninguno</p>}
          {learned.map(m => <MoveChip key={m.move_id} m={m} dir="left" onMove={() => toAvailable(m)} onInfo={onInfo} />)}
        </div>
        <p className={`text-xs font-bold mt-2 ${learned.length > 4 ? 'text-red-600' : 'text-gray-600'}`}>
          Movimientos aprendidos {learned.length} de 4
        </p>
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Disponibles</p>
        <div className="space-y-1.5 min-h-[3rem]">
          {available.length === 0 && <p className="text-xs text-gray-400 italic">Ninguno</p>}
          {available.map(m => <MoveChip key={m.move_id} m={m} dir="right" disabled={learned.length >= 4} onMove={() => toLearned(m)} onInfo={onInfo} />)}
        </div>
      </div>
    </div>
  )
}

/* Hook con el estado de la transferencia de movimientos */
function useMovesState(pending) {
  const byId = new Set((pending.learned_moves || []).map(m => m.move_id))
  const [learned, setLearned] = useState(() => pending.learned_moves || [])
  const [available, setAvailable] = useState(() => (pending.move_pool || []).filter(m => !byId.has(m.move_id)))
  const toAvailable = (m) => {
    setLearned(l => l.filter(x => x.move_id !== m.move_id))
    setAvailable(a => [...a, m].sort((x, y) => x.move_name.localeCompare(y.move_name)))
  }
  const toLearned = (m) => {
    if (learned.length >= 4) return
    setAvailable(a => a.filter(x => x.move_id !== m.move_id))
    setLearned(l => [...l, m])
  }
  const [moveInfo, setMoveInfo] = useState(null) // movimiento cuyo detalle se muestra
  return { learned, available, toAvailable, toLearned, moveInfo, setMoveInfo }
}

/* Flujo de movimientos: transferencia por clic (máx 4 aprendidos) */
function MovesFlow({ personajeId, pending, onConfirmed, hpRoll, hpValid }) {
  const { learned, available, toAvailable, toLearned, moveInfo, setMoveInfo } = useMovesState(pending)
  const [alert, setAlert] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokemon/${pending.id_personaje_pokemon}/improvement/moves`,
        { method: 'POST', body: JSON.stringify({ move_ids: learned.map(m => m.move_id), hp_roll: hpRoll }) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error === 'hproll' ? `La tirada debe estar entre 1 y ${j.max}` : (j.error || 'No se pudo confirmar'))
        setBusy(false); return
      }
      onConfirmed()
    } catch { setError('No se pudo confirmar'); setBusy(false) }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <MovesPicker learned={learned} available={available} toAvailable={toAvailable} toLearned={toLearned} onInfo={setMoveInfo} />
        {error && <p className="text-xs text-red-600 font-medium mt-3">{error}</p>}
        {moveInfo && <MoveInfoModal m={moveInfo} theme="light" onClose={() => setMoveInfo(null)} />}
      </div>
      <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-500">{hpValid ? '' : 'Falta la tirada del dado'}</span>
        <button onClick={() => setAlert(true)} disabled={learned.length > 4 || !hpValid}
          className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg transition-colors">
          Confirmar
        </button>
      </div>
      {alert && (
        <AlertConfirm busy={busy}
          message="No podrás realizar cambios sobre los movimientos hasta que subas de nivel nuevamente."
          onCancel={() => setAlert(false)} onConfirm={confirm} />
      )}
    </>
  )
}

/* Flujo ASI: reparte puntos entre stats (+1 c/u) y un feat (2 puntos) */
function AsiFlow({ personajeId, pending, onConfirmed, hpRoll, hpValid }) {
  const st = pending.stats || {}
  const level = Number(pending.level) || 1
  const cap = level >= 20 ? 22 : 20
  const totalPoints = Number(pending.points) || 0

  const { learned, available, toAvailable, toLearned, moveInfo, setMoveInfo } = useMovesState(pending)
  const [adds, setAdds] = useState({ dex: 0, str: 0, con: 0, int: 0, wis: 0, cha: 0 })
  const [feats, setFeats] = useState([])
  const [skillsList, setSkillsList] = useState([])
  const [alert, setAlert] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/skills').then(r => r.json()).then(d => setSkillsList(Array.isArray(d) ? d : (d.data ?? []))).catch(() => setSkillsList([]))
  }, [])

  // Bonos de stat de los feats que el Pokémon YA tiene entrenados. Sin esto la
  // ventana de nivel mostraba los stats sin ellos, a diferencia del resto de vistas.
  const prevFeatAdd = { dex: 0, str: 0, con: 0, int: 0, wis: 0, cha: 0 }
  for (const f of (pending.feats || [])) for (const b of (f.bonos || [])) {
    const t = (b.type || '').toLowerCase(), llave = (b.llave || '').toLowerCase()
    if (t === 'stat' && prevFeatAdd[llave] !== undefined) prevFeatAdd[llave] += Number(b.value) || 0
  }

  const baseVal = k => (Number(st[`pokemon_${k}`]) || 0) + (Number(st[`pokemon_${k}_bonus`]) || 0)
  const trainedVal = k => Math.min(baseVal(k) + adds[k], cap) // valor que se guarda (base + puntos)

  // Overlay de bonos de stat del feat elegido (solo display, como en el creador del master)
  const featStatAdd = { dex: 0, str: 0, con: 0, int: 0, wis: 0, cha: 0 }
  for (const f of feats) for (const b of (f.bonos || [])) {
    const t = (b.type || '').toLowerCase(), llave = (b.llave || '').toLowerCase()
    if (t === 'stat' && featStatAdd[llave] !== undefined) featStatAdd[llave] += Number(b.value) || 0
  }
  const shownVal = k => Math.min(trainedVal(k) + prevFeatAdd[k] + featStatAdd[k], cap) // display: puntos + feats previos + el feat elegido
  const modOf = k => Math.floor((shownVal(k) - 10) / 2)

  const spentStats = STAT_KEYS.reduce((a, k) => a + adds[k], 0)
  const featCost = feats.length > 0 ? 2 : 0
  const remaining = totalPoints - spentStats - featCost

  const inc = k => { if (remaining > 0 && baseVal(k) + adds[k] < cap) setAdds(a => ({ ...a, [k]: a[k] + 1 })) }
  const dec = k => { if (adds[k] > 0) setAdds(a => ({ ...a, [k]: a[k] - 1 })) }

  // Stats para los prerequisitos del control de feats (con puntos ya asignados, sin el bonus del propio feat)
  const statCtx = Object.fromEntries(STAT_KEYS.map(k => [k, trainedVal(k) + prevFeatAdd[k]]))
  const skillCtx = (pending.skills || []).map(s => ({ skill_name: s.skill_name, pref: s.pokemon_skill_pref, expert: s.pokemon_skill_expert }))

  const confirm = async () => {
    setBusy(true); setError('')
    try {
      const feat = feats[0] ? { feat_id: feats[0].feat_id, bonos: feats[0].bonos } : null
      const res = await apiFetch(`/personaje/${personajeId}/pokemon/${pending.id_personaje_pokemon}/improvement/asi`,
        { method: 'POST', body: JSON.stringify({ stats: adds, feat, hp_roll: hpRoll, move_ids: learned.map(m => m.move_id) }) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error === 'points' ? 'Debes gastar todos los puntos'
          : j.error === 'hproll' ? `La tirada debe estar entre 1 y ${j.max}`
          : j.error === 'duplicate' ? 'Ese feat no es repetible y el Pokémon ya lo tiene'
          : (j.error || 'No se pudo confirmar'))
        setBusy(false); return
      }
      onConfirmed()
    } catch { setError('No se pudo confirmar'); setBusy(false) }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {/* Movimientos: se pueden reacomodar en cualquier nivel, también en los ASI */}
        <MovesPicker learned={learned} available={available} toAvailable={toAvailable} toLearned={toLearned} onInfo={setMoveInfo} />
        {moveInfo && <MoveInfoModal m={moveInfo} theme="light" onClose={() => setMoveInfo(null)} />}

        {/* Puntos disponibles */}
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-bold text-red-800">Puntos disponibles</span>
          <span className="text-2xl font-black text-red-700">{remaining}</span>
        </div>
        <p className="text-[11px] text-gray-500 leading-snug">
          Cada punto sube <b>+1</b> en un stat (tope {cap}). Un <b>feat</b> cuesta <b>2 puntos</b> (máximo 1). Debes gastar todos los puntos para confirmar.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {STAT_KEYS.map(k => (
            <div key={k} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <span className="text-xs font-black text-gray-700">{STAT_LABEL[k]}</span>
                <span className="text-sm font-bold text-gray-900 ml-2">{shownVal(k)}</span>
                {featStatAdd[k] > 0 && <span className="text-[10px] font-bold text-purple-600 ml-1">(feat +{featStatAdd[k]})</span>}
                <span className="text-[11px] text-gray-400 ml-1">({fmtMod(modOf(k))})</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => dec(k)} disabled={adds[k] <= 0} title="Quitar punto"
                  className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30"><Minus size={13} /></button>
                <button onClick={() => inc(k)} disabled={remaining <= 0 || trainedVal(k) >= cap} title="Agregar punto"
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-30"><Plus size={13} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Feat (máximo 1, cuesta 2 puntos) */}
        <MasterPokemonFeats feats={feats} setFeats={setFeats} level={level}
          stats={statCtx} skills={skillCtx} skillsList={skillsList}
          ownedFeatIds={pending.owned_feat_ids || []}
          maxFeats={feats.length > 0 ? 1 : (remaining >= 2 ? 1 : 0)} />
        {feats.length === 0 && remaining < 2 && (
          <p className="text-[11px] text-gray-400 italic">Necesitas 2 puntos libres para entrenar un feat.</p>
        )}

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
      <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-500">
          {!hpValid ? 'Falta la tirada del dado' : remaining === 0 ? 'Todo repartido' : `Faltan ${remaining} punto(s)`}
        </span>
        <button onClick={() => setAlert(true)} disabled={remaining !== 0 || !hpValid || learned.length > 4}
          className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg transition-colors">
          Confirmar
        </button>
      </div>
      {alert && (
        <AlertConfirm busy={busy} message="Estos ajustes no se pueden deshacer o editar en el futuro."
          onCancel={() => setAlert(false)} onConfirm={confirm} />
      )}
    </>
  )
}

/* Ventana obligatoria de mejora por subida de nivel (no se puede cerrar sin confirmar) */
export default function PendingImprovementModal({ personajeId, pending, onConfirmed }) {
  // La tirada del dado se pide en todos los niveles y viaja con el confirmar del flujo
  const diceMax = Number(pending.hit_dice_max) || 0
  const [hpRoll, setHpRoll] = useState('')
  const rollNum = Math.floor(Number(hpRoll))
  const hpValid = Number.isFinite(rollNum) && hpRoll !== '' && rollNum >= 1 && (diceMax === 0 || rollNum <= diceMax)

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 shrink-0 flex items-center gap-3">
          {pending.sprite && <img src={pending.sprite} alt="" className="w-12 h-12 object-contain" onError={e => { e.target.style.opacity = '0.2' }} />}
          <div className="min-w-0">
            <h3 className="font-black text-gray-900 text-lg leading-tight">Mejora por subida de nivel</h3>
            <p className="text-xs text-gray-500 truncate">{pending.apodo} · {pending.name} · Nv {pending.level}</p>
          </div>
        </div>
        <div className="px-5 pt-3 pb-2 shrink-0 space-y-2">
          <HpRollField dice={pending.hit_dice} max={diceMax} value={hpRoll} onChange={setHpRoll} />
          <div className="rounded-xl bg-green-100 border border-green-300 text-green-800 font-bold text-sm px-4 py-3 text-center">
            {greenText(pending.type)}
          </div>
        </div>
        {pending.is_asi
          ? <AsiFlow personajeId={personajeId} pending={pending} onConfirmed={onConfirmed} hpRoll={rollNum} hpValid={hpValid} />
          : <MovesFlow personajeId={personajeId} pending={pending} onConfirmed={onConfirmed} hpRoll={rollNum} hpValid={hpValid} />}
      </div>
    </div>
  )
}

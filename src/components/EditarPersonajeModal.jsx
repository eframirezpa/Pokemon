import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Plus, Minus, Search, Info, AlertTriangle, Trash2 } from 'lucide-react'
import { apiFetch } from '../api'
import FeatInfoModal from './FeatInfoModal'

const lower = s => (s ?? '').toLowerCase()
const isSkillProf = b => lower(b.type) === 'skill' && lower(b.valor) === 'prof'

const STAT_KEYS = ['dex', 'str', 'con', 'int', 'wis', 'cha']
const statLabel = k => k.toUpperCase()

// Analiza un feat_bonus de tipo 'stat' (misma lógica que el backend)
function analyzeStatBonus(b) {
  if (lower(b.type) !== 'stat') return null
  const llave = lower(b.llave).trim()
  const valor = (b.valor || '').trim()
  if (llave === 'any') {
    if (/or/i.test(valor)) {
      const patterns = valor.split(/or/i)
        .map(p => p.trim().split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, c) => c - a))
        .filter(p => p.length)
      const total  = patterns[0] ? patterns[0].reduce((a, c) => a + c, 0) : 0
      const maxPer = patterns.length ? Math.max(...patterns.flat()) : 0
      return { mode: 'distribute', options: STAT_KEYS, patterns, total, maxPer, raw: valor }
    }
    return { mode: 'single', options: STAT_KEYS, value: parseInt(valor, 10) || 0 }
  }
  if (/or/i.test(llave)) {
    const options = llave.split(/or/i).map(s => s.trim()).filter(s => STAT_KEYS.includes(s))
    return { mode: 'single', options, value: parseInt(valor, 10) || 0 }
  }
  if (STAT_KEYS.includes(llave)) return { mode: 'fixed', llave, value: parseInt(valor, 10) || 0 }
  return null
}
const matchesPattern = (values, patterns) => {
  const chosen = values.filter(v => v > 0).sort((a, c) => c - a)
  return patterns.some(p => p.length === chosen.length && p.every((v, i) => v === chosen[i]))
}
// ¿La elección de un bono (índice i) está completa y es válida?
const bonusResolved = (st, picks) => {
  if (!st || st.mode === 'fixed') return true
  const list = picks || []
  if (st.mode === 'single') return list.length === 1 && st.options.includes(list[0].llave) && list[0].value === st.value
  return matchesPattern(list.map(p => p.value), st.patterns)
}

/* Badge de un feat_bonus (mismo criterio que el wizard de creación) */
function BonusBadge({ b }) {
  const type = lower(b.type)
  if (type === 'healing') {
    return <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1 shrink-0">{(b.llave || '').toUpperCase()} +{b.valor}</span>
  }
  if (type === 'stat') {
    const st = analyzeStatBonus(b)
    let text
    if (st?.mode === 'fixed') text = `${statLabel(st.llave)} +${st.value}`
    else if (st?.mode === 'single' && lower(b.llave) === 'any') text = `any stat +${st.value}`
    else if (st?.mode === 'single') text = `${st.options.map(statLabel).join(' o ')} +${st.value}`
    else if (st?.mode === 'distribute') text = `any stat ${st.raw}`
    else text = `stat: ${b.llave}`
    return <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 shrink-0">{text}</span>
  }
  if (isSkillProf(b)) {
    return <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 shrink-0">prof: {lower(b.llave) === 'any' ? 'a elección' : b.llave}</span>
  }
  return <span className="text-[9px] font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded px-1 shrink-0">{b.type}{b.llave ? `: ${b.llave}` : ''}</span>
}

/* Badges de todos los bonos de un feat */
function FeatBonusBadges({ bonuses }) {
  return (bonuses || []).map((b, i) => <BonusBadge key={i} b={b} />)
}

/* Badges de los bonos resueltos (personaje_feat_bonus): "LLAVE +valor" en verde */
function ResolvedBonusBadges({ bonos }) {
  return (bonos || []).map((b, i) => (
    <span key={i} className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1 shrink-0">
      {(b.llave || '').toUpperCase()} +{b.value}
    </span>
  ))
}

/* Selector de un stat (elige 1 entre options) */
function StatSingleSelect({ options, selected, onPick, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map(k => {
        const sel = selected === k
        return (
          <button key={k} onClick={() => onPick(k)} disabled={disabled}
            className={`text-xs font-bold px-2 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              sel ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-400' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            {statLabel(k)}
          </button>
        )
      })}
    </div>
  )
}

/* Distribuidor de puntos entre stats (según total/maxPer) */
function StatDistribute({ options, total, maxPer, dist, setDist, disabled }) {
  const used = Object.values(dist).reduce((a, c) => a + c, 0)
  const remaining = total - used
  const inc = k => { if (remaining > 0 && (dist[k] || 0) < maxPer) setDist({ ...dist, [k]: (dist[k] || 0) + 1 }) }
  const dec = k => { if ((dist[k] || 0) > 0) setDist({ ...dist, [k]: dist[k] - 1 }) }
  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-1.5">Puntos por repartir: <span className={`font-bold ${remaining === 0 ? 'text-gray-400' : 'text-red-600'}`}>{remaining}</span></p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map(k => (
          <div key={k} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
            <span className="text-xs font-bold text-gray-800">{statLabel(k)}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => dec(k)} disabled={disabled || (dist[k] || 0) === 0}
                className="w-6 h-6 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"><Minus size={13} /></button>
              <span className="w-5 text-center text-sm font-bold tabular-nums text-gray-900">{dist[k] || 0}</span>
              <button onClick={() => inc(k)} disabled={disabled || remaining === 0 || (dist[k] || 0) >= maxPer}
                className="w-6 h-6 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"><Plus size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Confirmación de agregado (irreversible) + selección de stats para bonos que lo requieran */
function ConfirmAddFeat({ feat, busy, error, onCancel, onConfirm }) {
  const bonuses = feat.feat_bonuses || []
  // Análisis de cada bono (por índice)
  const analyzed = bonuses.map(analyzeStatBonus)
  const [single, setSingle] = useState({}) // { i: llave }
  const [dist, setDist]     = useState({}) // { i: {key: pts} }

  // Construye las choices por índice para el backend
  const picksFor = (i, st) => {
    if (!st) return []
    if (st.mode === 'single') return single[i] ? [{ llave: single[i], value: st.value }] : []
    if (st.mode === 'distribute') return Object.entries(dist[i] || {}).filter(([, v]) => v > 0).map(([llave, value]) => ({ llave, value }))
    return []
  }
  const choices = {}
  analyzed.forEach((st, i) => { if (st && st.mode !== 'fixed') choices[i] = picksFor(i, st) })

  const allResolved = analyzed.every((st, i) => bonusResolved(st, picksFor(i, st)))

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900 truncate">Agregar rasgo</h3>
          <button onClick={onCancel} disabled={busy} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2 disabled:opacity-40"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Rasgo + bonos */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{feat.feat_name}</span>
            <FeatBonusBadges bonuses={bonuses} />
          </div>

          {/* Selección de stats para cada bono que lo requiera */}
          {analyzed.map((st, i) => {
            if (!st || st.mode === 'fixed') return null
            return (
              <div key={i} className="border border-gray-200 rounded-xl px-3 py-2.5">
                {st.mode === 'single' ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                      Elige un atributo <span className="text-gray-400 normal-case font-semibold">(+{st.value})</span>
                    </p>
                    <StatSingleSelect options={st.options} selected={single[i]} disabled={busy}
                      onPick={k => setSingle(s => ({ ...s, [i]: k }))} />
                  </>
                ) : (
                  <>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                      Reparte los puntos <span className="text-gray-400 normal-case font-semibold">({st.raw})</span>
                    </p>
                    <StatDistribute options={st.options} total={st.total} maxPer={st.maxPer}
                      dist={dist[i] || {}} setDist={d => setDist(s => ({ ...s, [i]: d }))} disabled={busy} />
                  </>
                )}
              </div>
            )
          })}

          {/* Aviso irreversible */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Esta acción <span className="font-bold">no se puede deshacer</span>. El rasgo quedará agregado al personaje de forma permanente.
            </p>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onCancel} disabled={busy}
            className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={() => onConfirm(choices)} disabled={busy || !allResolved}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Confirmación de borrado de un feat extra (irreversible) */
function ConfirmDeleteFeat({ feat, busy, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900 truncate">Eliminar rasgo</h3>
          <button onClick={onCancel} disabled={busy} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2 disabled:opacity-40"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700">
            ¿Eliminar el rasgo <span className="font-bold text-gray-900">{feat.feat_name}</span> del personaje?
          </p>
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">Esta acción <span className="font-bold">no se puede deshacer</span>.</p>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onCancel} disabled={busy}
            className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Ventana de edición del jugador. Por ahora solo permite agregar feats (tipo General u Origin).
   onChanged: se llama tras agregar un feat (para refrescar la ficha / party). */
export default function EditarPersonajeModal({ personajeId, nombre, onClose, onChanged }) {
  const [full, setFull]       = useState(null)   // personaje completo (feats asignados)
  const [catalog, setCatalog] = useState([])     // catálogo de feats (General + Origin) con feat_bonuses
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [busy, setBusy]       = useState(false)   // guardando (confirmación)
  const [error, setError]     = useState('')
  const [featInfo, setFeatInfo] = useState(null)  // detalle de un feat
  const [confirm, setConfirm]   = useState(null)  // feat pendiente de confirmar (agregar)
  const [confirmDel, setConfirmDel] = useState(null) // feat extra pendiente de eliminar
  const [busyDel, setBusyDel]   = useState(false)
  const [errorDel, setErrorDel] = useState('')
  const [tab, setTab]         = useState('feats') // pestaña activa

  const loadFull = useCallback(() => {
    return apiFetch(`/personaje/${personajeId}/full`)
      .then(r => r.json())
      .then(setFull)
      .catch(() => {})
  }, [personajeId])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadFull(),
      apiFetch('/feats?type=General,Origin&limit=300').then(r => r.json())
        .then(d => setCatalog(d.data ?? [])).catch(() => setCatalog([])),
    ]).finally(() => setLoading(false))
  }, [loadFull])

  // Feats ya asignados (origen + background + extra); los no repetibles se ocultan del selector
  const assigned = new Set([
    full?.origin_feat?.feat_id,
    full?.background_feat?.feat_id,
    ...(full?.extra_feats || []).map(f => f.feat_id),
  ].filter(Boolean))

  const available = catalog
    .filter(f => Number(f.feat_is_repeatable) === 1 || !assigned.has(f.feat_id))
    .filter(f => !search || f.feat_name?.toLowerCase().includes(search.toLowerCase()))

  const extraFeats = full?.extra_feats || []

  const doAdd = async (feat, choices) => {
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/feats`, {
        method: 'POST', body: JSON.stringify({ feat_id: feat.feat_id, choices }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'No se pudo agregar el rasgo')
        return
      }
      await loadFull()
      onChanged?.()
      setConfirm(null)
    } catch {
      setError('No se pudo agregar el rasgo')
    } finally {
      setBusy(false)
    }
  }

  const openConfirm = (feat) => { setError(''); setConfirm(feat) }

  const doDelete = async (f) => {
    setBusyDel(true); setErrorDel('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/feats/${f.personaje_feat_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrorDel(j.error || 'No se pudo eliminar el rasgo')
        return
      }
      await loadFull()
      onChanged?.()
      setConfirmDel(null)
    } catch {
      setErrorDel('No se pudo eliminar el rasgo')
    } finally {
      setBusyDel(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900 truncate">Editar jugador{nombre ? ` — ${nombre}` : ''}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2"><X size={18} /></button>
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-1 px-3 pt-3 border-b border-gray-200 shrink-0">
          {[['feats', 'Feats'], ['especialidades', 'Especialidades']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'especialidades' ? (
          <div className="flex-1 flex items-center justify-center px-5 py-16 text-gray-400 text-sm">
            Próximamente.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Rasgos extra ya agregados */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Rasgos extra</p>
              {extraFeats.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aún no hay rasgos extra.</p>
              ) : (
                <div className="space-y-1.5">
                  {extraFeats.map((f, i) => (
                    <div key={f.personaje_feat_id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          <span className="text-gray-400 font-normal mr-1.5">Rasgo extra {i + 1}:</span>{f.feat_name}
                        </span>
                        <ResolvedBonusBadges bonos={f.bonos} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setFeatInfo(f)} title="Ver detalle" className="text-gray-400 hover:text-red-600">
                          <Info size={16} />
                        </button>
                        <button onClick={() => { setErrorDel(''); setConfirmDel(f) }} title="Eliminar rasgo" className="text-gray-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agregar un rasgo (feats General / Origin) */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Agregar rasgo</p>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar rasgo..."
                  className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
              </div>
              {error && !confirm && <p className="text-xs text-red-600 font-medium mb-2">{error}</p>}
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-3 py-3">Sin rasgos disponibles.</p>
                ) : available.map(f => (
                  <div key={f.feat_id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50">
                    <button onClick={() => setFeatInfo(f)} title="Ver detalle"
                      className="text-left min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 truncate underline decoration-dotted decoration-gray-300 underline-offset-2 hover:text-red-700">{f.feat_name}</span>
                      {Number(f.feat_is_repeatable) === 1 && <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1 shrink-0">repetible</span>}
                      <FeatBonusBadges bonuses={f.feat_bonuses} />
                    </button>
                    <button onClick={() => openConfirm(f)} disabled={busy}
                      className="shrink-0 flex items-center gap-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-md transition-colors">
                      <Plus size={13} /> Agregar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmación de agregado */}
      {confirm && (
        <ConfirmAddFeat
          feat={confirm}
          busy={busy}
          error={error}
          onCancel={() => { if (!busy) { setConfirm(null); setError('') } }}
          onConfirm={(choices) => doAdd(confirm, choices)}
        />
      )}

      {/* Confirmación de eliminación */}
      {confirmDel && (
        <ConfirmDeleteFeat
          feat={confirmDel}
          busy={busyDel}
          error={errorDel}
          onCancel={() => { if (!busyDel) { setConfirmDel(null); setErrorDel('') } }}
          onConfirm={() => doDelete(confirmDel)}
        />
      )}

      {/* Detalle de un rasgo */}
      {featInfo && <FeatInfoModal feat={featInfo} theme="light" onClose={() => setFeatInfo(null)} />}
    </div>
  )
}

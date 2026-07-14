import { useState, useEffect } from 'react'
import { X, Info, ChevronDown, Loader2 } from 'lucide-react'
import { apiFetch } from '../api'
import FeatInfoModal from './FeatInfoModal'

const has = x => (x ?? '') !== ''

/* Fila etiqueta/valor (estilo oscuro de la sala) */
function Row({ label, value }) {
  if (!has(value)) return null
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-gray-700/60">
      <span className="text-[10px] font-black text-amber-400/90 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-xs text-gray-100 text-right whitespace-pre-line">{value}</span>
    </div>
  )
}

/* Cajita con título y contenido (para proficiencies, feats, etc.) */
function InfoCard({ title, description, values }) {
  if (!has(title) && !has(description) && !has(values)) return null
  return (
    <div className="bg-gray-700/50 rounded-lg p-2">
      {has(title) && <p className="text-xs font-bold text-white mb-0.5">{title}</p>}
      {has(description) && <p className="text-[11px] text-gray-400 leading-relaxed">{description}</p>}
      {has(values) && <p className="text-[11px] text-gray-200 mt-0.5">{values}</p>}
    </div>
  )
}

const joinVals = (...vals) => vals.filter(has).join(', ')

/* Rasgo (feat) clickeable — si hay detalle completo abre el popup; si no, muestra el nombre */
function FeatChip({ feat, fallbackName, onClick }) {
  if (!feat && !has(fallbackName)) return null
  return (
    <div className="bg-gray-700/50 rounded-lg p-2">
      <p className="text-xs font-bold text-white mb-0.5">Rasgo</p>
      {feat ? (
        <button onClick={() => onClick(feat)} title="Ver detalle del rasgo"
          className="text-[11px] text-gray-200 underline decoration-dotted decoration-gray-400 underline-offset-2 hover:text-amber-300 transition-colors">
          {feat.feat_name}
        </button>
      ) : (
        <p className="text-[11px] text-gray-200">{fallbackName}</p>
      )}
    </div>
  )
}

/* Ficha completa del origen */
function OriginCard({ o, feat, onFeatClick }) {
  if (!o) return null
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Origen — <span className="text-gray-200">{o.origin_name}</span>
      </p>
      {has(o.origin_description) && <p className="text-[11px] text-gray-300 leading-relaxed">{o.origin_description}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <InfoCard title={o.origin_ability_scores_name} description={o.origin_ability_scores_description}
          values={joinVals(o.origin_ability_scores_value_1, o.origin_ability_scores_value_2)} />
        <InfoCard title={o.origin_skill_proficiencies_name} description={o.origin_skill_proficiencies_description}
          values={o.origin_skill_proficiencies_value_1} />
        <FeatChip feat={feat} fallbackName={o.origin_feat_name} onClick={onFeatClick} />
      </div>
      {has(o.origin_notes) && (
        <p className="text-[11px] text-gray-400"><span className="font-bold text-gray-300">Notas: </span>{o.origin_notes}</p>
      )}
    </div>
  )
}

/* Ficha completa del background */
function BackgroundCard({ b, feat, onFeatClick }) {
  if (!b) return null
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Background — <span className="text-gray-200">{b.background_name}</span>
      </p>
      {has(b.background_description) && <p className="text-[11px] text-gray-300 leading-relaxed">{b.background_description}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <InfoCard title={b.background_ability_scores_name} description={b.background_ability_scores_description}
          values={joinVals(b.background_ability_scores_value_1, b.background_ability_scores_value_2, b.background_ability_scores_value_3)} />
        <InfoCard title={b.background_skill_proficiencies_name} description={b.background_skill_proficiencies_description}
          values={joinVals(b.background_skill_proficiencies_value_1, b.background_skill_proficiencies_value_2)} />
        <InfoCard title={b.background_tool_proficiencies_name} description={b.background_tool_proficiencies_description}
          values={b.background_tool_proficiencies_values} />
        <InfoCard title={b.background_armor_proficiencies_name} description={b.background_armor_proficiencies_description}
          values={joinVals(b.background_armor_proficiencies_value_1, b.background_armor_proficiencies_value_2,
            b.background_armor_proficiencies_value_3, b.background_armor_proficiencies_value_4)} />
        <InfoCard title={b.background_weapon_proficiencies_name} description={b.background_weapon_proficiencies_description} />
        <FeatChip feat={feat} fallbackName={b.background_feat_name} onClick={onFeatClick} />
      </div>
      {has(b.background_notes) && (
        <p className="text-[11px] text-gray-400"><span className="font-bold text-gray-300">Notas: </span>{b.background_notes}</p>
      )}
    </div>
  )
}

/* Ventana de personajes registrados en la partida (solo master).
   Acordeón: al expandir carga la info narrativa + origen y background completos. */
export default function PartidaInfoPanel({ partidaId, onClose }) {
  const [chars, setChars]     = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId]   = useState(null)
  const [info, setInfo]       = useState({})      // id_personaje → { full, origin, background }
  const [loadingId, setLoadingId] = useState(null)
  const [featInfo, setFeatInfo]   = useState(null) // rasgo cuyo detalle se muestra

  useEffect(() => {
    apiFetch(`/personaje/party?id_partida=${partidaId}`)
      .then(r => r.json())
      .then(d => setChars(Array.isArray(d) ? d : []))
      .catch(() => setChars([]))
      .finally(() => setLoading(false))
  }, [partidaId])

  const toggle = async (id) => {
    const next = openId === id ? null : id
    setOpenId(next)
    if (next == null || info[id]) return
    setLoadingId(id)
    try {
      const full = await apiFetch(`/personaje/${id}/full`).then(r => r.json())
      const [origin, background] = await Promise.all([
        full.personaje_origin
          ? apiFetch(`/origins/${full.personaje_origin}`).then(r => r.ok ? r.json() : null).catch(() => null)
          : null,
        full.personaje_background
          ? apiFetch(`/backgrounds/${full.personaje_background}`).then(r => r.ok ? r.json() : null).catch(() => null)
          : null,
      ])
      setInfo(prev => ({ ...prev, [id]: { full, origin, background } }))
    } catch {
      setInfo(prev => ({ ...prev, [id]: { full: null, origin: null, background: null } }))
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-gray-700">
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h3 className="font-black text-white text-lg flex items-center gap-2"><Info size={18} /> Personajes registrados</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-center text-gray-500 text-sm py-10">Cargando…</p>
          ) : chars.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-10">No hay personajes registrados en la partida.</p>
          ) : chars.map(c => {
            const open = openId === c.id_personaje
            const d = info[c.id_personaje]
            const full = d?.full
            return (
              <div key={c.id_personaje} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <button onClick={() => toggle(c.id_personaje)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-gray-700/60 transition-colors">
                  <span className="text-sm font-bold text-white truncate">{c.nombre_personaje || 'Sin nombre'}</span>
                  <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="px-4 pb-3 border-t border-gray-700/60">
                    {loadingId === c.id_personaje || !d ? (
                      <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
                        <Loader2 className="animate-spin mr-2" size={15} /> Cargando…
                      </div>
                    ) : !full ? (
                      <p className="text-center text-gray-500 text-sm py-6">No se pudo cargar la información.</p>
                    ) : (
                      <div className="pt-2 space-y-3">
                        {/* Narrativa del personaje */}
                        <div>
                          <Row label="Conexiones" value={full.personaje_conexiones} />
                          <Row label="Ideales"    value={full.personaje_ideales} />
                          <Row label="Falencias"  value={full.personaje_falencias} />
                          {(full.details || []).map((det, i) => (
                            <Row key={i} label={det.nombre_personaje_detail} value={det.descripcion_personaje_detail} />
                          ))}
                        </div>

                        <OriginCard o={d.origin} feat={full.origin_feat} onFeatClick={setFeatInfo} />
                        <BackgroundCard b={d.background} feat={full.background_feat} onFeatClick={setFeatInfo} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detalle del rasgo (feat) */}
      {featInfo && <FeatInfoModal feat={featInfo} theme="dark" onClose={() => setFeatInfo(null)} />}
    </div>
  )
}

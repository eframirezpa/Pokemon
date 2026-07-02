import { useState, useEffect } from 'react'
import { X, Loader2, Check, ChevronDown } from 'lucide-react'
import { apiFetch } from '../api'

/* Checkbox de solo lectura (estilo de la imagen) */
function ReadCheck({ checked }) {
  return (
    <span className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 ${
      checked ? 'bg-red-600 border-red-600' : 'border-red-400 bg-white'}`}>
      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
    </span>
  )
}

const STATS = [
  ['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'],
  ['INT', 'int'], ['WIS', 'wis'], ['CHA', 'cha'],
]
const fmtMod = m => (m >= 0 ? `+${m}` : `${m}`)

function InfoBox({ label, value, danger = false, green = false, red = false }) {
  const box = green ? 'border-green-600 bg-green-100' : red ? 'border-red-600 bg-red-100' : 'border-gray-800 bg-white'
  const lbl = green ? 'text-green-700' : red ? 'text-red-700' : 'text-gray-500'
  const val = danger ? 'text-red-600' : green ? 'text-green-700' : red ? 'text-red-700' : 'text-gray-900'
  return (
    <div className={`border-2 rounded-xl px-2 py-1 text-center ${box}`}>
      <p className={`text-[9px] font-black uppercase leading-tight ${lbl}`}>{label}</p>
      <p className={`text-lg font-black leading-tight ${val}`}>{(value ?? '') === '' ? '—' : value}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-gray-100">
      <span className="text-xs font-semibold text-red-700 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-gray-700 text-right">{(value ?? '') === '' ? '—' : value}</span>
    </div>
  )
}

export default function CharacterSheet({ id, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetalles, setShowDetalles] = useState(false)
  const [showMochila, setShowMochila]   = useState(false)

  useEffect(() => {
    apiFetch(`/personaje/${id}/full`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id])

  const stats = data?.stats

  // Modificador del ability: FLOOR((base + bonus - 10) / 2)
  const abilMod = (key) => {
    if (!stats) return 0
    const final = (stats[`personaje_${key}`] || 0) + (stats[`personaje_${key}_bonus`] || 0)
    return Math.floor((final - 10) / 2)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{data?.nombre_personaje || 'Personaje'}</h3>
            {data && <span className="text-sm font-semibold text-gray-500 shrink-0">Nivel {data.personaje_level ?? 1}</span>}
            {data && <span className="text-sm font-bold text-green-700 shrink-0">{(data.pokedollars_personaje || 0).toLocaleString()} ₽</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
          </div>
        ) : !data ? (
          <div className="py-20 text-center text-gray-400 text-sm">No se pudo cargar el personaje.</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* HP (barra de solo lectura) + AC + Prof */}
            {(() => {
              const max = data.personaje_hp || 0
              const cur = data.personaje_current_hp ?? max
              const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((cur / max) * 100))) : 0
              const color = pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444'
              return (
                <div className="space-y-3">
                  {/* Barra de vida + AC / Prof / Init */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-0.5">
                        <span className="uppercase tracking-wide">Hit Points</span>
                        <span className="text-gray-700">{cur} / {max}</span>
                      </div>
                      <div className="h-3.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                        <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    <InfoBox label="AC"   value={data.personaje_ac} />
                    <InfoBox label="EXH"  value={data.personaje_exahust_lvl} />
                    <InfoBox label="DSTS" value={data.personaje_dsts} green />
                    <InfoBox label="DSTF" value={data.personaje_dstf} red />
                    <InfoBox label="Prof"
                      value={data.personaje_prof != null ? fmtMod(data.personaje_prof) : '—'}
                      danger={(data.personaje_prof ?? 0) < 0} />
                    <InfoBox label="Init" value={fmtMod(abilMod('dex'))} />
                  </div>

                  {/* Hit dice / Hit dice left / Speed / Poke lvs */}
                  <div className="grid grid-cols-4 gap-2">
                    <InfoBox label="Hit Dice"      value={data.personaje_hit_dice} />
                    <InfoBox label="Hit Dice Left" value={data.personaje_hit_dice_left ?? '0/0'} />
                    <InfoBox label="Speed"         value={data.personaje_speed != null ? `${data.personaje_speed} ft` : ''} />
                    <InfoBox label="Poke lvs"      value={data.personaje_pokelvls} />
                  </div>

                  {/* Saving Throw + armadura + arma */}
                  <Row label="Saving Throw" value={data.saving_throw_prof} />
                  {data.armor && <Row label="Armadura" value={data.armor.armor_type_name} />}
                  {(data.weapons || []).length > 0 && (
                    <Row label="Arma" value={data.weapons.map(w => w.weapon_type_name).join(', ')} />
                  )}
                </div>
              )
            })()}

            {/* General */}
            <div>
              <Row label="Origen"     value={data.origin_name} />
              <Row label="Background" value={data.background_name} />
              {data.background_tool_proficiencies_values && (
                <Row label="Herramientas" value={data.background_tool_proficiencies_values} />
              )}
            </div>

            {/* Atributos — todos en una sola línea */}
            {stats && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Atributos</p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  {STATS.map(([label, key]) => {
                    const base  = stats[`personaje_${key}`] || 0
                    const bonus = stats[`personaje_${key}_bonus`] || 0
                    const final = base + bonus
                    const mod   = Math.floor((final - 10) / 2)
                    const prof  = stats[`personaje_stats_${key}_prof`]
                    return (
                      <div key={key} className="relative border-2 border-gray-800 rounded-xl bg-white px-3 pt-2 pb-1.5">
                        <div className="flex items-start justify-between">
                          <div className="border-2 border-gray-800 rounded-lg px-2 py-0.5 min-w-[2.3rem] text-center">
                            <span className={`text-lg font-black leading-none ${mod < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmtMod(mod)}</span>
                          </div>
                          <span className="text-base font-bold text-gray-500 mt-0.5">{final}</span>
                        </div>
                        <p className="text-center text-xs font-black text-gray-800 uppercase tracking-wide mt-1">{label}</p>
                        <span className={`absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                          prof ? 'border-gray-800' : 'border-gray-300'}`}>
                          {prof && <Check size={12} className="text-gray-900" strokeWidth={3} />}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Habilidades */}
            {(data.skills || []).length > 0 && (() => {
              const prof = data.personaje_prof || 0
              const abilityValue = (s) => {
                const key = (s.skill_related_ability || '').toLowerCase()
                if (!stats || stats[`personaje_${key}`] === undefined) return null
                let v = abilMod(key)                      // modificador del ability
                if (s.personaje_skill_pref)   v += prof   // proficiente
                if (s.personaje_skill_expert) v += prof   // experto (suma prof otra vez)
                return v
              }
              const half = Math.ceil(data.skills.length / 2)
              const cols = [data.skills.slice(0, half), data.skills.slice(half)]
              return (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Habilidades</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                    {cols.map((col, ci) => (
                      <div key={ci}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-3.5 text-center text-[9px] font-bold text-gray-500">E</span>
                          <span className="w-3.5 text-center text-[9px] font-bold text-gray-500">P</span>
                        </div>
                        <div className="space-y-1.5">
                          {col.map((s, i) => {
                            const v = abilityValue(s)
                            return (
                              <div key={i} className="flex items-center gap-1.5">
                                <ReadCheck checked={!!s.personaje_skill_expert} />
                                <ReadCheck checked={!!s.personaje_skill_pref} />
                                <span className={`w-7 text-center text-[11px] font-bold border-b border-gray-400 leading-tight ${
                                  v != null && v < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                  {v == null ? '' : fmtMod(v)}
                                </span>
                                <span className="text-[11px] leading-tight truncate">
                                  <span className="font-semibold text-gray-800">{s.skill_name}</span>
                                  <span className="text-gray-400"> ({s.skill_related_ability})</span>
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Equipo */}
            <div>
              <button
                onClick={() => setShowMochila(o => !o)}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-red-700 hover:text-red-800 transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform ${showMochila ? 'rotate-180' : ''}`} />
                Mochila
              </button>
              {showMochila && (
                <div className="mt-1.5">
                  {(data.equipo || []).map((e, i) => (
                    <Row key={i} label={e.item_name} value={`x${e.cantidad}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Detalles narrativos (desplegable) */}
            <div>
              <button
                onClick={() => setShowDetalles(o => !o)}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-red-700 hover:text-red-800 transition-colors"
              >
                <ChevronDown size={14} className={`transition-transform ${showDetalles ? 'rotate-180' : ''}`} />
                Detalles Narrativos
              </button>
              {showDetalles && (
                <div className="mt-1.5">
                  {data.personaje_ideales    && <Row label="Ideales"    value={data.personaje_ideales} />}
                  {data.personaje_falencias  && <Row label="Falencias"  value={data.personaje_falencias} />}
                  {data.personaje_conexiones && <Row label="Conexiones" value={data.personaje_conexiones} />}
                  {(data.details || []).map((d, i) => (
                    <Row key={i} label={d.nombre_personaje_detail} value={d.descripcion_personaje_detail} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

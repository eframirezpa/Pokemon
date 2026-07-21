import { useState, useEffect } from 'react'
import { X, Loader2, Sword, Shield } from 'lucide-react'
import { apiFetch } from '../api'
import { featPrereqStatus, buildPrereqContext } from '../lib/featPrereq'

const FEAT_MEDIUM_ARMOR_MASTER = 33 // sube a +3 el tope del modificador de DEX en la armadura

function Bono({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">
      {label}: {value}
    </span>
  )
}

export default function Equipamiento({ personajeId, onClose }) {
  const [weapons, setWeapons] = useState([])
  const [armors, setArmors]   = useState([])
  const [propMap, setPropMap] = useState({})
  const [propDetail, setPropDetail] = useState(null) // propiedad seleccionada (tooltip)
  const [dexCapFeat, setDexCapFeat] = useState(false) // tiene Medium Armor Master (tope de DEX +3)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch(`/personaje/${personajeId}/weapon`).then(r => r.json()),
      apiFetch(`/personaje/${personajeId}/armor`).then(r => r.json()),
      apiFetch('/weapon-properties?limit=200').then(r => r.json()),
      // Medium Armor Master eleva el tope del modificador de DEX (solo si cumple prerequisitos)
      apiFetch(`/personaje/${personajeId}/full`).then(r => r.json()).then(full => {
        const ctx = buildPrereqContext(full)
        setDexCapFeat((full?.extra_feats || []).some(f =>
          Number(f.feat_id) === FEAT_MEDIUM_ARMOR_MASTER && (!ctx || featPrereqStatus(f.prereqs, ctx).met)))
      }).catch(() => {}),
    ]).then(([w, a, p]) => {
      setWeapons((Array.isArray(w) ? w : []).filter(x => x.personaje_weapon_in_use))
      setArmors((Array.isArray(a) ? a : []).filter(x => x.personaje_armor_in_use))
      const map = {}
      for (const pr of (p.data || [])) map[pr.weapon_property_id] = { name: pr.weapon_property_name, description: pr.weapon_property_description }
      setPropMap(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [personajeId])

  const weaponProps = (w) => [
    w.weapon_type_property_1, w.weapon_type_property_2, w.weapon_type_property_3,
    w.weapon_type_property_4, w.weapon_type_property_5, w.weapon_type_property_6,
  ].filter(Boolean).map(id => propMap[id] || { name: String(id), description: '' })

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">Equipamiento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Armas */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sword size={16} className="text-red-700" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-600">Armas equipadas</p>
              </div>
              {weapons.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Ninguna arma equipada.</p>
              ) : (
                <div className="space-y-3">
                  {weapons.map(w => (
                    <div key={w.id_personaje_weapon} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-800 text-sm">{w.weapon_type_name}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{w.weapon_type_dnd_category}</span>
                      </div>
                      {w.weapon_type_description && (
                        <p className="text-xs text-gray-500 leading-relaxed mt-1">{w.weapon_type_description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Bono label="Daño" value={[w.weapon_type_damage_dice, w.weapon_type_damage_type].filter(Boolean).join(' ')} />
                        <Bono label="Rango" value={w.weapon_type_range} />
                        <Bono label="Uso" value={w.weapon_type_hand_use} />
                        {weaponProps(w).map((p, i) => (
                          <button key={i} onClick={() => setPropDetail(p)}
                            className="text-[10px] font-bold text-gray-600 bg-gray-200 rounded px-1.5 py-0.5 hover:bg-gray-300 transition-colors"
                            title="Ver descripción">
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Armaduras */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-red-700" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-600">Armaduras equipadas</p>
              </div>
              {armors.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Ninguna armadura equipada.</p>
              ) : (
                <div className="space-y-3">
                  {armors.map(a => (
                    <div key={a.id_personaje_armor} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-800 text-sm">{a.armor_type_name}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{a.armor_type_category}</span>
                      </div>
                      {a.armor_type_description && (
                        <p className="text-xs text-gray-500 leading-relaxed mt-1">{a.armor_type_description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Bono label="AC base" value={a.armor_type_base_ac} />
                        {a.armor_type_uses_dex_modifier === 1 && (() => {
                          const base = a.armor_type_max_dex_modifier
                          // Medium Armor Master sube el tope de la armadura (de +2 a +3)
                          const cap  = base != null && dexCapFeat ? Math.max(base, 3) : base
                          const up   = cap !== base
                          return (
                            <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                              up ? 'text-blue-800 bg-blue-100 border border-blue-300' : 'text-green-700 bg-green-100'}`}
                              title={up ? 'Medium Armor Master: el tope del modificador de DEX sube de +2 a +3' : undefined}>
                              + DEX{cap != null ? ` (máx +${cap})` : ''}{up ? ' · Medium Armor Master' : ''}
                            </span>
                          )
                        })()}
                        <Bono label="Bono AC" value={a.armor_type_ac_bonus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tooltip: descripción de la propiedad del arma */}
      {propDetail && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setPropDetail(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
              <h4 className="font-bold text-gray-900 text-sm">{propDetail.name}</h4>
              <button onClick={() => setPropDetail(null)} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={16} /></button>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-600 leading-relaxed">{propDetail.description || 'Sin descripción.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

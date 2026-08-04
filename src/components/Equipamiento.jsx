import { useState, useEffect } from 'react'
import { X, Loader2, Sword, Shield, FlaskConical } from 'lucide-react'
import { apiFetch } from '../api'
import { featPrereqStatus, buildPrereqContext } from '../lib/featPrereq'
import { buildProfs, titleCase } from '../lib/profs'
import ItemDetailPanel from './ItemDetailPanel'

const FEAT_MEDIUM_ARMOR_MASTER = 33 // sube a +3 el tope del modificador de DEX en la armadura

/* Etiqueta de proficiencia junto al nombre del arma / la armadura */
function ProfTag({ prof }) {
  return prof
    ? <span className="text-[10px] font-bold text-white bg-green-600 rounded px-1.5 py-0.5 shrink-0">prof</span>
    : <span className="text-[10px] font-bold text-gray-500 bg-gray-200 rounded px-1.5 py-0.5 shrink-0">no prof</span>
}

function Bono({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-1.5 py-0.5">
      {label}: {value}
    </span>
  )
}

export default function Equipamiento({ personajeId, onClose }) {
  const [weapons, setWeapons] = useState([])       // solo las equipadas (pestaña Equipamiento)
  const [allWeapons, setAllWeapons] = useState([]) // todas las del personaje (pestaña Proficiencias)
  const [armors, setArmors]   = useState([])
  const [propMap, setPropMap] = useState({})
  const [propDetail, setPropDetail] = useState(null) // propiedad seleccionada (tooltip)
  const [dexCapFeat, setDexCapFeat] = useState(false) // tiene Medium Armor Master (tope de DEX +3)
  const [profs, setProfs] = useState(() => buildProfs(null)) // proficiencias de armas / armaduras
  const [tab, setTab] = useState('equipo')
  const [loading, setLoading] = useState(true)
  // Detalle emergente desde los nombres de la pestaña de proficiencias
  const [weaponInfo, setWeaponInfo] = useState(null)   // fila de personaje_weapon
  const [armorCatInfo, setArmorCatInfo] = useState(null) // categoría de armadura
  const [itemInfoId, setItemInfoId] = useState(null)   // id de item para ItemDetailPanel
  const [armorCatalog, setArmorCatalog] = useState([]) // armor_types completo
  const [toolItemIds, setToolItemIds] = useState({})   // nombre de herramienta → item_id

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
        setProfs(buildProfs(full))
      }).catch(() => {}),
    ]).then(([w, a, p]) => {
      const listaArmas = Array.isArray(w) ? w : []
      setAllWeapons(listaArmas)
      setWeapons(listaArmas.filter(x => x.personaje_weapon_in_use))
      setArmors((Array.isArray(a) ? a : []).filter(x => x.personaje_armor_in_use))
      const map = {}
      for (const pr of (p.data || [])) map[pr.weapon_property_id] = { name: pr.weapon_property_name, description: pr.weapon_property_description }
      setPropMap(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [personajeId])

  // Catálogo de armaduras: para detallar qué armaduras cubre cada categoría proficiente
  useEffect(() => {
    apiFetch('/armor-types?limit=200').then(r => r.json())
      .then(d => setArmorCatalog(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => setArmorCatalog([]))
  }, [])

  // Resuelve cada herramienta contra la tabla items. Solo las que existen
  // llevan link; el resto son texto plano (p. ej. un instrumento que no está
  // catalogado como ítem).
  useEffect(() => {
    const nombres = profs.tools.map(t => t.name)
    if (nombres.length === 0) return
    Promise.all(nombres.map(n =>
      apiFetch(`/items?search=${encodeURIComponent(n)}&limit=10`).then(r => r.json())
        .then(d => {
          const lista = Array.isArray(d) ? d : (d.data ?? [])
          const exacto = lista.find(i => (i.item_name || '').toLowerCase().trim() === n.toLowerCase().trim())
          return [n, exacto ? exacto.item_id : null]
        })
        .catch(() => [n, null])
    )).then(pares => setToolItemIds(Object.fromEntries(pares)))
  }, [profs])

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

        {/* Pestañas */}
        {/* Dos pestañas se llaman "Proficiencias": los iconos de la derecha las
            distinguen — armas/armaduras en una, herramientas en la otra. */}
        <div className="flex items-center gap-0.5 px-3 pt-3 border-b border-gray-200 shrink-0">
          {[
            ['equipo', 'Equipo', null],
            ['profs',  'Proficiencias', <><Sword size={14} /><Shield size={14} /></>],
            ['tools',  'Proficiencias', <FlaskConical size={14} />],
          ].map(([key, label, icons]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-2 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
              {icons && <span className="flex items-center gap-0.5 shrink-0">{icons}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={18} /> Cargando...
          </div>
        ) : tab === 'tools' ? (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical size={16} className="text-red-700" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-600">Herramientas proficientes</p>
            </div>
            {profs.tools.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin proficiencias de herramienta.</p>
            ) : (
              <div className="space-y-1.5">
                {profs.tools.map(t => {
                  const itemId = toolItemIds[t.name] // null si no está catalogada como ítem
                  return (
                    <div key={t.name} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <div className="min-w-0">
                        {itemId ? (
                          <button onClick={() => setItemInfoId(itemId)}
                            className="font-bold text-red-700 hover:text-red-800 hover:underline text-sm truncate text-left max-w-full">
                            {t.name}
                          </button>
                        ) : (
                          <p className="font-bold text-gray-800 text-sm truncate">{t.name}</p>
                        )}
                        {t.source && <p className="text-[11px] text-gray-500 truncate">{t.source}</p>}
                      </div>
                      <ProfTag prof />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : tab === 'profs' ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Armas con proficiencia */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sword size={16} className="text-red-700" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-600">Armas proficientes</p>
              </div>
              {/* Las armas proficientes salen de personaje_weapon, no de los feats:
                  así también aparece la elegida al crear el personaje. */}
              {(() => {
                const profWeapons = allWeapons.filter(w => profs.isWeaponProf(w))
                if (profWeapons.length === 0) {
                  return <p className="text-sm text-gray-400 italic">Sin proficiencias de arma.</p>
                }
                return (
                  <div className="space-y-1.5">
                    {profWeapons
                      .slice()
                      .sort((a, b) => (a.weapon_type_name || '').localeCompare(b.weapon_type_name || ''))
                      .map(w => (
                        <div key={w.id_personaje_weapon} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                          <button onClick={() => setWeaponInfo(w)}
                            className="font-bold text-red-700 hover:text-red-800 hover:underline text-sm truncate text-left min-w-0">
                            {w.weapon_type_name}
                          </button>
                          <ProfTag prof />
                        </div>
                      ))}
                  </div>
                )
              })()}
            </div>

            {/* Tipos de armadura con proficiencia */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-red-700" />
                <p className="text-xs font-black uppercase tracking-widest text-gray-600">Tipos de armadura proficientes</p>
              </div>
              {profs.armors.size === 0 ? (
                <p className="text-sm text-gray-400 italic">Sin proficiencias de armadura.</p>
              ) : (
                <div className="space-y-1.5">
                  {[...profs.armors].sort().map(a => (
                    <div key={a} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <button onClick={() => setArmorCatInfo(a)}
                        className="font-bold text-red-700 hover:text-red-800 hover:underline text-sm truncate text-left min-w-0">
                        {titleCase(a)}
                      </button>
                      <ProfTag prof />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-gray-800 text-sm truncate">{w.weapon_type_name}</span>
                          <ProfTag prof={profs.isWeaponProf(w)} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">{w.weapon_type_dnd_category}</span>
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-gray-800 text-sm truncate">{a.armor_type_name}</span>
                          <ProfTag prof={profs.isArmorProf(a.armor_type_category)} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">{a.armor_type_category}</span>
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

      {/* Detalle del arma (los datos ya vienen en la fila, no hace falta consultar) */}
      {weaponInfo && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setWeaponInfo(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
              <h4 className="font-bold text-gray-900 text-sm truncate">{weaponInfo.weapon_type_name}</h4>
              <button onClick={() => setWeaponInfo(null)} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={16} /></button>
            </div>
            <div className="px-4 py-3 overflow-y-auto space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Bono label="Daño"  value={[weaponInfo.weapon_type_damage_dice, weaponInfo.weapon_type_damage_type].filter(Boolean).join(' ')} />
                <Bono label="Rango" value={weaponInfo.weapon_type_range} />
                <Bono label="Manos" value={weaponInfo.weapon_type_hand_use} />
                <Bono label="Peso"  value={weaponInfo.weapon_type_weight_lb} />
              </div>
              {weaponProps(weaponInfo).length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Propiedades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {weaponProps(weaponInfo).map((p, i) => (
                      <span key={i} className="text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{p.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {weaponInfo.weapon_type_description && (
                <p className="text-xs text-gray-600 leading-relaxed">{weaponInfo.weapon_type_description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detalle de una categoría de armadura: qué armaduras cubre y sus valores */}
      {armorCatInfo && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setArmorCatInfo(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
              <h4 className="font-bold text-gray-900 text-sm truncate">{titleCase(armorCatInfo)}</h4>
              <button onClick={() => setArmorCatInfo(null)} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={16} /></button>
            </div>
            <div className="px-4 py-3 overflow-y-auto space-y-2">
              {(() => {
                const lista = armorCatalog.filter(a =>
                  (a.armor_type_category || '').toLowerCase().trim() === String(armorCatInfo).toLowerCase().trim())
                if (lista.length === 0) {
                  return <p className="text-xs text-gray-400 italic">Sin armaduras de esta categoría.</p>
                }
                return lista.map(a => (
                  <div key={a.armor_type_id} className="border border-gray-200 rounded-xl p-2.5">
                    <p className="font-bold text-gray-800 text-sm">{a.armor_type_name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Bono label="AC base" value={a.armor_type_base_ac} />
                      {a.armor_type_uses_dex_modifier === 1 && (
                        <Bono label="DEX" value={a.armor_type_max_dex_modifier != null ? `máx +${a.armor_type_max_dex_modifier}` : 'sí'} />
                      )}
                      <Bono label="Bono AC" value={a.armor_type_ac_bonus} />
                    </div>
                    {a.armor_type_description && (
                      <p className="text-xs text-gray-500 leading-relaxed mt-1">{a.armor_type_description}</p>
                    )}
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Detalle del ítem de una herramienta catalogada */}
      {itemInfoId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setItemInfoId(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <ItemDetailPanel id={itemInfoId} onClose={() => setItemInfoId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

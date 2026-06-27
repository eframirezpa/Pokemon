import { useState, useEffect } from 'react'
import { X, Plus, Minus, Loader2, Search, PackagePlus, Check } from 'lucide-react'
import { apiFetch } from '../api'
import ItemsList from '../pages/ItemsList'
import ItemDetailPanel from './ItemDetailPanel'

const ITEM_TYPES = [
  { value: 'berry',        label: 'Berry',           bg: '#78C850' },
  { value: 'evolution',    label: 'Evolución',       bg: '#7038F8' },
  { value: 'held item',    label: 'Objeto Equipado', bg: '#6890F0' },
  { value: 'medicine',     label: 'Medicina',        bg: '#F85888' },
  { value: 'pokeball',     label: 'Pokéball',        bg: '#C03028' },
  { value: 'trainer gear', label: 'Equipo',          bg: '#F08030' },
]
const typeBg = t => ITEM_TYPES.find(x => x.value === t)?.bg || '#9CA3AF'
const typeLabel = t => ITEM_TYPES.find(x => x.value === t)?.label || t

export default function Mochila({ personajeId, onClose }) {
  const [tab, setTab] = useState('equipo') // equipo | armaduras | armas

  // ── Equipo (items) ──
  const [items, setItems]       = useState([])
  const [loadingItems, setLI]   = useState(true)
  const [search, setSearch]     = useState('')
  const [typeFilter, setType]   = useState('')
  const [detailId, setDetailId] = useState(null)
  const [showPicker, setPicker] = useState(false)
  const [pickItem, setPickItem] = useState(null)
  const [pickQty, setPickQty]   = useState('1')

  // ── Armaduras ──
  const [armor, setArmor]         = useState([])
  const [loadingArmor, setLA]     = useState(false)
  const [armorCatalog, setCatalog] = useState([])
  const [showArmorPicker, setSAP] = useState(false)
  const [armorSearch, setAS]      = useState('')

  // ── Armas ──
  const [weapons, setWeapons]       = useState([])
  const [loadingWeapons, setLW]     = useState(false)
  const [weaponCatalog, setWCat]    = useState([])
  const [showWeaponPicker, setSWP]  = useState(false)
  const [weaponSearch, setWS]       = useState('')
  const [weaponMsg, setWeaponMsg]   = useState('')

  const loadItems = () => {
    setLI(true)
    apiFetch(`/personaje/${personajeId}/equipo`).then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([])).finally(() => setLI(false))
  }
  const loadArmor = () => {
    setLA(true)
    apiFetch(`/personaje/${personajeId}/armor`).then(r => r.json())
      .then(d => setArmor(Array.isArray(d) ? d : [])).catch(() => setArmor([])).finally(() => setLA(false))
  }
  const loadWeapons = () => {
    setLW(true)
    apiFetch(`/personaje/${personajeId}/weapon`).then(r => r.json())
      .then(d => setWeapons(Array.isArray(d) ? d : [])).catch(() => setWeapons([])).finally(() => setLW(false))
  }
  useEffect(() => { loadItems() }, [personajeId])
  useEffect(() => {
    if (tab === 'armaduras') {
      loadArmor()
      if (armorCatalog.length === 0) {
        apiFetch('/armor-types?limit=200').then(r => r.json())
          .then(d => setCatalog(Array.isArray(d.data) ? d.data : [])).catch(() => {})
      }
    }
    if (tab === 'armas') {
      loadWeapons()
      if (weaponCatalog.length === 0) {
        apiFetch('/weapon-types?limit=500').then(r => r.json())
          .then(d => setWCat(Array.isArray(d.data) ? d.data : [])).catch(() => {})
      }
    }
  }, [tab])

  // ── Acciones items ──
  const setCantidad = (idEq, nueva) => {
    const c = Math.max(0, nueva)
    setItems(prev => prev.map(it => it.id_personaje_equipo === idEq ? { ...it, cantidad: c } : it))
    apiFetch(`/personaje/${personajeId}/equipo/${idEq}`, { method: 'PATCH', body: JSON.stringify({ cantidad: c }) }).catch(() => {})
  }
  const confirmAdd = async () => {
    const cantidad = Math.max(1, Number(pickQty) || 1)
    try {
      await apiFetch(`/personaje/${personajeId}/equipo`, { method: 'POST', body: JSON.stringify({ id_item: pickItem.item_id, cantidad }) })
      setPickItem(null); setPicker(false); setPickQty('1'); loadItems()
    } catch { /* noop */ }
  }

  // ── Acciones armaduras ──
  const toggleInUse = (row) => {
    const nuevo = !row.personaje_armor_in_use
    setArmor(prev => prev.map(a => ({
      ...a,
      personaje_armor_in_use: a.id_personaje_armor === row.id_personaje_armor ? nuevo : (nuevo ? false : a.personaje_armor_in_use),
    })))
    apiFetch(`/personaje/${personajeId}/armor/${row.id_personaje_armor}`, { method: 'PATCH', body: JSON.stringify({ in_use: nuevo }) }).catch(() => {})
  }
  const addArmor = async (a) => {
    try {
      await apiFetch(`/personaje/${personajeId}/armor`, { method: 'POST', body: JSON.stringify({ id_armor: a.armor_type_id }) })
      setSAP(false); setAS(''); loadArmor()
    } catch { /* noop */ }
  }

  // ── Acciones armas (la regla de cuántas en uso la valida el backend) ──
  const toggleWeaponInUse = async (row) => {
    const nuevo = !row.personaje_weapon_in_use
    try {
      const res = await apiFetch(`/personaje/${personajeId}/weapon/${row.id_personaje_weapon}`, {
        method: 'PATCH', body: JSON.stringify({ in_use: nuevo }),
      })
      const data = await res.json().catch(() => ({}))
      if (data && data.applied === false && data.reason === 'max') {
        setWeaponMsg('Ya tienes 2 armas de una mano en uso. Desequipa una primero.')
        setTimeout(() => setWeaponMsg(''), 4000)
      }
    } catch { /* noop */ }
    loadWeapons()
  }
  const addWeapon = async (w) => {
    try {
      await apiFetch(`/personaje/${personajeId}/weapon`, { method: 'POST', body: JSON.stringify({ id_weapon: w.weapon_type_id }) })
      setSWP(false); setWS(''); loadWeapons()
    } catch { /* noop */ }
  }

  const filteredItems = items.filter(it => {
    const ms = !search || it.item_name?.toLowerCase().includes(search.toLowerCase())
    const mt = !typeFilter || it.item_type === typeFilter
    return ms && mt
  })
  const filteredCatalog = armorCatalog.filter(a => !armorSearch || a.armor_type_name?.toLowerCase().includes(armorSearch.toLowerCase()))

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
        tab === id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header con título + pestañas */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-gray-900 shrink-0">🎒 Mochila</h3>
            <div className="flex gap-1">
              <TabBtn id="equipo"    label="Equipo" />
              <TabBtn id="armaduras" label="Armaduras" />
              <TabBtn id="armas"     label="Armas" />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={18} /></button>
        </div>

        {/* ── EQUIPO ── */}
        {tab === 'equipo' && (
          <>
            <div className="px-4 pt-3 pb-2 shrink-0 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ítem..."
                    className="w-full pl-8 pr-7 py-1.5 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                  {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
                </div>
                <button onClick={() => setPicker(true)}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors shrink-0">
                  <PackagePlus size={15} /> Agregar
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button onClick={() => setType('')}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    typeFilter === '' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                  Todos
                </button>
                {ITEM_TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(typeFilter === t.value ? '' : t.value)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                    style={{ backgroundColor: typeFilter === t.value ? t.bg : 'white', color: typeFilter === t.value ? '#fff' : '#4B5563', borderColor: typeFilter === t.value ? t.bg : '#E5E7EB' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {loadingItems ? (
              <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="animate-spin mr-2" size={18} /> Cargando...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">{items.length === 0 ? 'No hay items en la mochila.' : 'Sin resultados.'}</div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredItems.map(it => (
                  <div key={it.id_personaje_equipo} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-gray-50">
                    <button onClick={() => setDetailId(it.id_item)} className="min-w-0 text-left group">
                      <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-red-700">{it.item_name}</p>
                      {it.item_type && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-white rounded-full px-1.5 py-0.5" style={{ backgroundColor: typeBg(it.item_type) }}>{typeLabel(it.item_type)}</span>
                      )}
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setCantidad(it.id_personaje_equipo, it.cantidad - 1)} disabled={it.cantidad <= 0}
                        className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"><Minus size={15} /></button>
                      <span className="w-7 text-center font-bold text-gray-900 tabular-nums">{it.cantidad}</span>
                      <button onClick={() => setCantidad(it.id_personaje_equipo, it.cantidad + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors"><Plus size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ARMADURAS ── */}
        {tab === 'armaduras' && (
          <>
            <div className="px-4 pt-3 pb-2 shrink-0 flex justify-end">
              <button onClick={() => setSAP(true)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors">
                <PackagePlus size={15} /> Agregar armadura
              </button>
            </div>
            {loadingArmor ? (
              <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="animate-spin mr-2" size={18} /> Cargando...</div>
            ) : armor.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No hay armaduras.</div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 px-5 py-1.5 text-[10px] font-bold text-gray-400 uppercase">
                  <span>En uso</span><span>Armadura</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {armor.map(a => (
                    <div key={a.id_personaje_armor} className="grid grid-cols-[auto_1fr] gap-x-3 items-center px-5 py-2.5">
                      <button onClick={() => toggleInUse(a)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          a.personaje_armor_in_use ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white hover:border-red-400'}`}>
                        {a.personaje_armor_in_use && <Check size={13} className="text-white" strokeWidth={3} />}
                      </button>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{a.armor_type_name}</p>
                        <p className="text-[11px] text-gray-400">
                          {a.armor_type_category} · AC base {a.armor_type_base_ac}
                          {a.armor_type_uses_dex_modifier === 1 && ' + DEX'}
                          {a.armor_type_ac_bonus != null && ` + ${a.armor_type_ac_bonus}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── ARMAS ── */}
        {tab === 'armas' && (
          <>
            <div className="px-4 pt-3 pb-2 shrink-0 flex justify-end">
              <button onClick={() => setSWP(true)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors">
                <PackagePlus size={15} /> Agregar arma
              </button>
            </div>
            {weaponMsg && (
              <div className="mx-4 mb-2 shrink-0 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {weaponMsg}
              </div>
            )}
            {loadingWeapons ? (
              <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="animate-spin mr-2" size={18} /> Cargando...</div>
            ) : weapons.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No hay armas.</div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 px-5 py-1.5 text-[10px] font-bold text-gray-400 uppercase">
                  <span>En uso</span><span>Arma</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {weapons.map(w => (
                    <div key={w.id_personaje_weapon} className="grid grid-cols-[auto_1fr] gap-x-3 items-center px-5 py-2.5">
                      <button onClick={() => toggleWeaponInUse(w)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          w.personaje_weapon_in_use ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white hover:border-red-400'}`}>
                        {w.personaje_weapon_in_use && <Check size={13} className="text-white" strokeWidth={3} />}
                      </button>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{w.weapon_type_name}</p>
                        <p className="text-[11px] text-gray-400">
                          {w.weapon_type_dnd_category} · {w.weapon_type_damage_dice} {w.weapon_type_damage_type}
                          {w.weapon_type_hand_use && ` · ${w.weapon_type_hand_use}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detalle de un item del inventario */}
      {detailId && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setDetailId(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <ItemDetailPanel id={detailId} onClose={() => setDetailId(null)} />
          </div>
        </div>
      )}

      {/* Selector de items (agregar) */}
      {showPicker && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setPicker(false) }}>
          <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
            <button onClick={() => setPicker(false)} className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"><X size={18} /></button>
            <ItemsList title="Agregar item" onPick={(item) => { setPickItem(item); setPickQty('1') }} />
          </div>
        </div>
      )}

      {/* Cantidad del item elegido */}
      {pickItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h4 className="font-bold text-gray-900 text-sm">Agregar a la mochila</h4>
              <p className="text-xs text-gray-500 mt-0.5">{pickItem.item_name}</p>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
              <input type="number" min="1" value={pickQty} onChange={e => setPickQty(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') confirmAdd() }}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
              <button onClick={() => setPickItem(null)} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg">Cancelar</button>
              <button onClick={confirmAdd} className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de armaduras (agregar) */}
      {showArmorPicker && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setSAP(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-900">Agregar armadura</h3>
              <button onClick={() => setSAP(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={armorSearch} onChange={e => setAS(e.target.value)} placeholder="Buscar armadura..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {filteredCatalog.map(a => (
                <button key={a.armor_type_id} onClick={() => addArmor(a)}
                  className="w-full text-left border border-gray-200 rounded-xl px-4 py-2.5 hover:border-red-300 hover:bg-red-50/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{a.armor_type_name}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{a.armor_type_category}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    AC base {a.armor_type_base_ac}{a.armor_type_uses_dex_modifier === 1 && ' + DEX'}{a.armor_type_ac_bonus != null && ` + ${a.armor_type_ac_bonus}`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selector de armas (agregar) */}
      {showWeaponPicker && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setSWP(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-900">Agregar arma</h3>
              <button onClick={() => setSWP(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={weaponSearch} onChange={e => setWS(e.target.value)} placeholder="Buscar arma..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {weaponCatalog
                .filter(w => !weaponSearch || w.weapon_type_name?.toLowerCase().includes(weaponSearch.toLowerCase()))
                .map(w => (
                  <button key={w.weapon_type_id} onClick={() => addWeapon(w)}
                    className="w-full text-left border border-gray-200 rounded-xl px-4 py-2.5 hover:border-red-300 hover:bg-red-50/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-800 text-sm">{w.weapon_type_name}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{w.weapon_type_dnd_category}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {w.weapon_type_damage_dice} {w.weapon_type_damage_type}{w.weapon_type_hand_use && ` · ${w.weapon_type_hand_use}`}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

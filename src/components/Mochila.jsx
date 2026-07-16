import { useState, useEffect } from 'react'
import { X, Plus, Minus, Loader2, Search, PackagePlus, Check, Wallet, CreditCard, Coins, Banknote, DollarSign } from 'lucide-react'
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

  // ── Compra (pokédollars) ──
  const [pokedollars, setPokedollars] = useState(0)
  const [showBuy, setShowBuy]   = useState(false)
  const [buyAmount, setBuyAmount] = useState('')
  const [buying, setBuying]     = useState(false)
  const [buyMsg, setBuyMsg]     = useState('')

  // ── Billetera (agregar pokédollars) ──
  const [addAmount, setAddAmount] = useState('')
  const [adding, setAdding]       = useState(false)
  const [addMsg, setAddMsg]       = useState('')

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
      .then(d => {
        const list = Array.isArray(d) ? d : []
        // Si no hay ninguna en uso, seleccionar automáticamente la armadura id 1
        const anyInUse = list.some(a => a.personaje_armor_in_use)
        const def = list.find(a => a.armor_type_id === 1)
        if (!anyInUse && def) {
          apiFetch(`/personaje/${personajeId}/armor/${def.id_personaje_armor}`, {
            method: 'PATCH', body: JSON.stringify({ in_use: true }),
          }).catch(() => {})
          setArmor(list.map(a => ({ ...a, personaje_armor_in_use: a.id_personaje_armor === def.id_personaje_armor })))
        } else {
          setArmor(list)
        }
      })
      .catch(() => setArmor([])).finally(() => setLA(false))
  }
  const loadWeapons = () => {
    setLW(true)
    apiFetch(`/personaje/${personajeId}/weapon`).then(r => r.json())
      .then(d => setWeapons(Array.isArray(d) ? d : [])).catch(() => setWeapons([])).finally(() => setLW(false))
  }
  const loadCharacter = () => {
    apiFetch(`/personaje/${personajeId}`).then(r => r.json())
      .then(d => setPokedollars(Number(d?.pokedollars_personaje) || 0)).catch(() => {})
  }
  useEffect(() => { loadItems(); loadCharacter() }, [personajeId])
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
  // Paso 1: tras elegir la cantidad, abre el popup de compra (pokédollars a gastar)
  const proceedToBuy = () => { setBuyMsg(''); setBuyAmount(''); setShowBuy(true) }

  // Paso 2: valida el saldo, descuenta los pokédollars y agrega el item a la mochila
  const handleBuy = async () => {
    const amount = Math.floor(Number(buyAmount))
    if (!Number.isFinite(amount) || amount < 0) { setBuyMsg('Ingresa un número válido'); return }
    if (pokedollars < amount) { setBuyMsg('No tienes suficientes pokédollars'); return }
    setBuying(true); setBuyMsg('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokedollars`, { method: 'PATCH', body: JSON.stringify({ cantidad: amount }) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (j.pokedollars != null) setPokedollars(j.pokedollars)
        setBuyMsg(j.error || 'No se pudo completar la compra')
        return
      }
      const j = await res.json()
      setPokedollars(Number(j.pokedollars) || 0)
      const cantidad = Math.max(1, Number(pickQty) || 1)
      await apiFetch(`/personaje/${personajeId}/equipo`, { method: 'POST', body: JSON.stringify({ id_item: pickItem.item_id, cantidad }) })
      setShowBuy(false); setPickItem(null); setPicker(false); setPickQty('1'); setBuyAmount(''); loadItems()
    } catch {
      setBuyMsg('No se pudo completar la compra')
    } finally {
      setBuying(false)
    }
  }

  // Billetera: suma pokédollars al personaje
  const handleAddPokedollars = async () => {
    const amount = Math.floor(Number(addAmount))
    if (!Number.isFinite(amount) || amount <= 0) { setAddMsg('Ingresa una cantidad válida'); return }
    setAdding(true); setAddMsg('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/pokedollars/add`, { method: 'PATCH', body: JSON.stringify({ cantidad: amount }) })
      if (!res.ok) { const j = await res.json().catch(() => ({})); setAddMsg(j.error || 'No se pudo agregar'); return }
      const j = await res.json()
      setPokedollars(Number(j.pokedollars) || 0)
      setAddAmount('')
    } catch { setAddMsg('No se pudo agregar') } finally { setAdding(false) }
  }

  // ── Acciones armaduras ──
  // Siempre debe quedar una armadura en uso; al desmarcar la activa se cae a la id 1.
  const toggleInUse = (row) => {
    const turningOn = !row.personaje_armor_in_use
    let targetId = row.id_personaje_armor
    if (!turningOn) {
      const def = armor.find(a => a.armor_type_id === 1)
      targetId = def ? def.id_personaje_armor : null
    }
    if (targetId == null) {
      // No hay armadura por defecto: solo desmarcar
      setArmor(prev => prev.map(a => a.id_personaje_armor === row.id_personaje_armor ? { ...a, personaje_armor_in_use: false } : a))
      apiFetch(`/personaje/${personajeId}/armor/${row.id_personaje_armor}`, { method: 'PATCH', body: JSON.stringify({ in_use: false }) }).catch(() => {})
      return
    }
    setArmor(prev => prev.map(a => ({ ...a, personaje_armor_in_use: a.id_personaje_armor === targetId })))
    apiFetch(`/personaje/${personajeId}/armor/${targetId}`, { method: 'PATCH', body: JSON.stringify({ in_use: true }) }).catch(() => {})
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
              <TabBtn id="billetera" label="Billetera" />
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
                      {it.item_type === 'Event Item' ? (
                        // Los Event Item no permiten cambiar cantidades
                        <span className="w-7 text-center font-bold text-gray-900 tabular-nums">{it.cantidad}</span>
                      ) : (
                        <>
                          <button onClick={() => setCantidad(it.id_personaje_equipo, it.cantidad - 1)} disabled={it.cantidad <= 0}
                            className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"><Minus size={15} /></button>
                          <span className="w-7 text-center font-bold text-gray-900 tabular-nums">{it.cantidad}</span>
                          <button onClick={() => setCantidad(it.id_personaje_equipo, it.cantidad + 1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors"><Plus size={15} /></button>
                        </>
                      )}
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
                          {a.armor_type_uses_dex_modifier === 1 && ` + DEX${a.armor_type_max_dex_modifier != null ? ` (máx +${a.armor_type_max_dex_modifier})` : ''}`}
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

        {/* ── BILLETERA ── */}
        {tab === 'billetera' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Tarjeta con el saldo + decorativos */}
            <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 60%, #450a0a 100%)' }}>
              <Coins size={130} className="absolute -right-5 -bottom-6 opacity-15" />
              <DollarSign size={90} className="absolute right-16 -top-6 opacity-10" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Billetera</span>
                  <Wallet size={20} className="opacity-90" />
                </div>
                {/* chip de tarjeta */}
                <div className="w-11 h-8 rounded-md mt-4 mb-3 bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-inner" />
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">Pokédollars disponibles</p>
                <p className="text-4xl font-black tabular-nums leading-tight mt-0.5">{pokedollars.toLocaleString()} <span className="text-xl">₽</span></p>
                <div className="flex items-center justify-between mt-4 text-[11px] opacity-80">
                  <span className="tracking-widest">•••• •••• •••• {String(personajeId ?? 0).padStart(4, '0').slice(-4)}</span>
                  <CreditCard size={18} />
                </div>
              </div>
            </div>

            {/* Agregar pokédollars */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pokédollars a agregar</label>
              <div className="flex gap-2">
                <input type="number" min="1" step="1" value={addAmount}
                  onChange={e => { setAddAmount(e.target.value); setAddMsg('') }}
                  onKeyDown={e => { if (e.key === 'Enter' && !adding) handleAddPokedollars() }}
                  placeholder="Cantidad"
                  className="flex-1 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                <button onClick={handleAddPokedollars} disabled={adding}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0">
                  {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Agregar
                </button>
              </div>
              {addMsg && <p className="text-xs text-red-600 font-medium mt-2">{addMsg}</p>}
            </div>

            {/* Decorativos */}
            <div className="flex items-center justify-center gap-5 text-gray-300 pt-3">
              <Coins size={30} />
              <Banknote size={30} />
              <CreditCard size={30} />
              <DollarSign size={30} />
            </div>
          </div>
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
            <ItemsList title="Agregar item" excludeType="Event Item" onPick={(item) => { setPickItem(item); setPickQty('1') }} />
          </div>
        </div>
      )}

      {/* Cantidad del item elegido */}
      {pickItem && !showBuy && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h4 className="font-bold text-gray-900 text-sm">Agregar a la mochila</h4>
              <p className="text-xs text-gray-500 mt-0.5">{pickItem.item_name}</p>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
              <input type="number" min="1" value={pickQty} onChange={e => setPickQty(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') proceedToBuy() }}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
              <button onClick={() => setPickItem(null)} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg">Cancelar</button>
              <button onClick={proceedToBuy} className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* Compra: pokédollars a gastar */}
      {pickItem && showBuy && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h4 className="font-bold text-gray-900 text-sm">Pokédollars a gastar</h4>
              <p className="text-xs text-gray-500 mt-0.5">{pickItem.item_name} · x{Math.max(1, Number(pickQty) || 1)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-600 mb-1">
                Disponibles: <span className="text-green-700 font-bold">{pokedollars.toLocaleString()} ₽</span>
              </p>
              <input type="number" min="0" step="1" value={buyAmount} autoFocus
                onChange={e => { setBuyAmount(e.target.value); setBuyMsg('') }}
                onKeyDown={e => { if (e.key === 'Enter' && !buying) handleBuy() }}
                placeholder="Cantidad a gastar"
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
              {buyMsg && <p className="text-xs text-red-600 font-medium mt-2">{buyMsg}</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
              <button onClick={() => { setShowBuy(false); setBuyMsg('') }} disabled={buying}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg disabled:opacity-40">Volver</button>
              <button onClick={handleBuy} disabled={buying}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
                {buying && <Loader2 size={14} className="animate-spin" />} Comprar
              </button>
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
                    AC base {a.armor_type_base_ac}{a.armor_type_uses_dex_modifier === 1 && ` + DEX${a.armor_type_max_dex_modifier != null ? ` (máx +${a.armor_type_max_dex_modifier})` : ''}`}{a.armor_type_ac_bonus != null && ` + ${a.armor_type_ac_bonus}`}
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

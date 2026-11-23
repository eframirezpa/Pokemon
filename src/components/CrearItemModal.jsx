import { useState } from 'react'
import { X, ChevronDown, Check, CheckCircle2 } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'
import { TIPOS_ITEM as TIPOS } from '../lib/itemTypes'



/* Popup para que el máster cree un item nuevo desde la mochila de la partida */
export default function CrearItemModal({ onClose, onCreated }) {
  const [nombre, setNombre]       = useState('')
  const [tipo, setTipo]           = useState(TIPOS[0])
  const [precio, setPrecio]       = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState('')
  // Item ya creado, pendiente de que el máster confirme para cerrar todo
  const [creado, setCreado]       = useState(null)

  const valido = nombre.trim() && tipo && precio.trim() !== '' && descripcion.trim()

  const crear = async () => {
    if (!valido || busy) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch('/items', {
        method: 'POST',
        body: JSON.stringify({
          item_name: nombre.trim(), item_type: tipo,
          item_cost: Number(precio), item_description: descripcion.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el item')
      setCreado(data)
    } catch (e) {
      setError(e.message || 'No se pudo crear el item')
    } finally {
      setBusy(false)
    }
  }

  const aceptar = () => {
    onCreated?.(creado)
    onClose()
  }

  if (creado) {
    return (
      <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo">
        <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-sm flex flex-col shadow-hoja overflow-hidden">
          <div className="px-5 py-6 flex flex-col items-center text-center gap-2">
            <CheckCircle2 size={36} className="text-ok" />
            <h3 className="font-bold text-texto">Item creado</h3>
            <p className="text-sm text-texto-2">{creado.item_name} se agregó correctamente.</p>
          </div>
          <div className="px-5 py-3 border-t border-separador flex items-center justify-end">
            <button onClick={aceptar}
              className="text-sm font-bold text-white bg-acento hover:bg-acento-hover px-4 py-1.5 rounded-lg transition-colors">
              Aceptar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-sm flex flex-col shadow-hoja overflow-hidden max-h-[85vh]">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
          <h3 className="font-bold text-texto">Crear item</h3>
          <button onClick={onClose} disabled={busy} className="text-texto-2 hover:text-texto disabled:opacity-40"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1">Nombre del item</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
              placeholder="Ej. Oran Berry"
              className="w-full px-3 py-2 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1">Tipo de item</label>
            <div className="relative">
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1">Precio</label>
            <input type="number" min="0" value={precio}
              onChange={e => setPrecio(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className="w-full px-3 py-2 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1">Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4}
              placeholder="Qué hace este item..."
              className="w-full px-3 py-2 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50 resize-none" />
          </div>
          {error && <p className="text-xs text-peligro font-medium">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-separador flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} disabled={busy} className="text-sm font-semibold text-texto-2 hover:text-texto px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
          <button onClick={crear} disabled={busy || !valido}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-acento hover:bg-acento-hover disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <PokeballSpinner size={15} /> : <Check size={15} />} Crear
          </button>
        </div>
      </div>
    </div>
  )
}

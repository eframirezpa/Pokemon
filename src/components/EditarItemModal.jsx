import { useState } from 'react'
import { X, ChevronDown, Check, Trash2 } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'
import { TIPOS_ITEM as TIPOS } from '../lib/itemTypes'

/**
 * Corrige (o borra) un item del catálogo desde la mochila del máster.
 *
 * El nombre se puede corregir: en la mochila y en los Pokémon el item se
 * referencia por su id, nunca por el nombre, así que renombrarlo no rompe
 * nada ya repartido por la partida.
 *
 * Borrar sí puede fallar a propósito: si el item ya está en alguna mochila,
 * equipado en un Pokémon, o pedido por un background o una plantilla del
 * máster, el backend lo rechaza (409) para no dejar esas referencias
 * apuntando a nada. El mensaje que devuelve ya dice dónde está en uso.
 */
export default function EditarItemModal({ item, onClose, onSaved, onDeleted }) {
  const [nombre, setNombre] = useState(item.item_name || '')
  const [tipo, setTipo] = useState(item.item_type || TIPOS[0])
  const [precio, setPrecio] = useState(item.item_cost == null ? '' : String(item.item_cost))
  const [descripcion, setDescripcion] = useState(item.item_description || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  const valido = nombre.trim() && tipo && precio.trim() !== '' && descripcion.trim()

  const guardar = async () => {
    if (!valido || busy) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/items/${item.item_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          item_name: nombre.trim(), item_type: tipo, item_cost: Number(precio), item_description: descripcion.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo editar el item')
      onSaved?.(data)
    } catch (e) {
      setError(e.message || 'No se pudo editar el item')
    } finally {
      setBusy(false)
    }
  }

  const borrar = async () => {
    if (busy) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/items/${item.item_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'No se pudo borrar el item')
      }
      onDeleted?.(item.item_id)
    } catch (e) {
      setError(e.message || 'No se pudo borrar el item')
      setConfirmandoBorrado(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">Editar item</h3>
            <p className="text-xs text-gray-500 truncate">{item.item_name}</p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-700 disabled:opacity-40 shrink-0 ml-2"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nombre</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Tipo de item</label>
            <div className="relative">
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2 text-sm text-gray-900 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Precio</label>
            <input type="number" min="0" value={precio}
              onChange={e => setPrecio(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={5}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between gap-2 shrink-0">
          {confirmandoBorrado ? (
            <>
              <span className="text-xs font-semibold text-gray-600">¿Borrar «{item.item_name}»?</span>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setConfirmandoBorrado(false)} disabled={busy}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
                <button onClick={borrar} disabled={busy}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
                  {busy ? <PokeballSpinner size={15} /> : <Trash2 size={15} />} Sí, borrar
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmandoBorrado(true)} disabled={busy} title="Borrar item"
                className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors">
                <Trash2 size={15} /> Borrar
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={onClose} disabled={busy}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
                <button onClick={guardar} disabled={busy || !valido}
                  className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
                  {busy ? <PokeballSpinner size={15} /> : <Check size={15} />} Guardar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

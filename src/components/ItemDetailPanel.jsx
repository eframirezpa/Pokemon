import { useState, useEffect } from 'react'
import { X, ExternalLink, Package } from 'lucide-react'
import { apiFetch } from '../api'

const TYPE_COLORS = {
  'berry':        { bg: '#78C850', text: '#fff', label: 'Berry'       },
  'evolution':    { bg: '#7038F8', text: '#fff', label: 'Evolución'   },
  'held item':    { bg: '#6890F0', text: '#fff', label: 'Objeto Equipado' },
  'medicine':     { bg: '#F85888', text: '#fff', label: 'Medicina'    },
  'pokeball':     { bg: '#C03028', text: '#fff', label: 'Pokéball'    },
  'trainer gear': { bg: '#F08030', text: '#fff', label: 'Equipo'      },
}

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] ?? { bg: '#888', text: '#fff', label: type }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {c.label}
    </span>
  )
}

export default function ItemDetailPanel({ id, onClose }) {
  const [item,    setItem]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    apiFetch(`/items/${id}`)
      .then(r => r.json())
      .then(d => setItem(d))
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  /* ── loading ── */
  if (loading) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm animate-pulse">Cargando...</div>
    </div>
  )

  if (!item || item.error) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <span className="text-sm text-gray-500">No encontrado</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* ── sticky header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-gray-900 truncate">{item.item_name}</span>
          {item.item_type && <TypeBadge type={item.item_type} />}
        </div>
        <button onClick={onClose}
          className="text-gray-400 hover:text-gray-700 p-1 transition-colors ml-2 shrink-0" title="Cerrar">
          <X size={18} />
        </button>
      </div>

      {/* ── scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Sprite */}
        <div className="flex flex-col items-center gap-3 py-6 bg-gray-50 border-b border-gray-100">
          {item.item_media_sprite ? (
            <img src={item.item_media_sprite} alt={item.item_name}
              className="w-24 h-24 object-contain"
              onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <div className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded-2xl">
              <Package size={40} className="text-gray-400" />
            </div>
          )}
          <span className="text-lg font-bold text-gray-900">{item.item_name}</span>
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* Info grid */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ borderTop: '5px solid #9C6E1B', borderBottom: '5px solid #9C6E1B', backgroundColor: '#FDF1DC' }}
          >
            <div className="px-4 pt-3 pb-1">
              <h2 className="text-lg font-black text-[#7A200D]">{item.item_name}</h2>
              {item.item_type && (
                <p className="text-xs text-gray-600 capitalize">{item.item_type}</p>
              )}
            </div>
            <hr style={{ borderColor: '#9C6E1B', borderTopWidth: 2 }} />
            <div className="px-4 py-2 space-y-0.5 text-xs">
              {item.item_cost != null && (
                <p>
                  <span className="font-bold text-[#7A200D]">Costo</span>{' '}
                  {item.item_cost.toLocaleString()} po
                </p>
              )}
              {item.item_type && (
                <p>
                  <span className="font-bold text-[#7A200D]">Tipo</span>{' '}
                  <span className="capitalize">{TYPE_COLORS[item.item_type]?.label ?? item.item_type}</span>
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {item.item_description && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-2">Descripción</h3>
              <p className="text-sm text-gray-700 leading-relaxed border-l-2 border-amber-300 pl-3">
                {item.item_description}
              </p>
            </div>
          )}

          {/* Notes */}
          {item.item_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Notas</p>
              <p className="text-xs text-amber-900 leading-relaxed">{item.item_notes}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { X, Package } from 'lucide-react'
import { apiFetch } from '../api'
import { tipoItem } from '../lib/tiposItem'
import ItemTypeBadge from './pokedex/ItemTypeBadge'
import { ListaAgrupada } from './ui/ListaAgrupada'
import { FilaDato } from './pokedex/FichaPokemon'

// Detalle de un item al lado del catálogo (o en la hoja inferior del celular)

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

  const barra = (titulo, extra = null) => (
    <div className="flex items-center gap-2 px-4 py-3 shrink-0 bg-superficie border-b border-separador">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-semibold text-[15px] text-texto truncate">{titulo}</span>
        {extra}
      </div>
      <button type="button" onClick={onClose} title="Cerrar" aria-label="Cerrar"
        className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2 hover:text-texto transition-colors shrink-0">
        <X size={16} strokeWidth={2.4} />
      </button>
    </div>
  )

  /* ── loading ── */
  if (loading) return (
    <div className="flex flex-col h-full bg-fondo text-texto">
      {barra(<span className="inline-block h-3.5 w-28 rounded bg-relleno animate-pulse align-middle" />)}
      <div className="p-4"><div className="h-40 rounded-tarjeta bg-relleno animate-pulse" /></div>
    </div>
  )

  if (!item || item.error) return (
    <div className="flex flex-col h-full bg-fondo text-texto">
      {barra('No encontrado')}
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-fondo text-texto">
      {barra(item.item_name, <ItemTypeBadge type={item.item_type} />)}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 [&>*]:shrink-0">
        {/* Sprite y nombre */}
        <div className="bg-superficie rounded-tarjeta py-6 flex flex-col items-center gap-2">
          {item.item_media_sprite ? (
            <img src={item.item_media_sprite} alt={item.item_name}
              className="w-24 h-24 object-contain [image-rendering:pixelated]"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div className="w-24 h-24 grid place-items-center bg-relleno rounded-2xl">
              <Package size={40} className="text-texto-2" aria-hidden />
            </div>
          )}
          <span className="text-[22px] font-bold tracking-[-.02em] text-center px-4">{item.item_name}</span>
        </div>

        <ListaAgrupada>
          {item.item_type && <FilaDato etiqueta="Tipo">{tipoItem(item.item_type)?.label ?? item.item_type}</FilaDato>}
          {item.item_cost != null && <FilaDato etiqueta="Costo">{item.item_cost.toLocaleString()} po</FilaDato>}
        </ListaAgrupada>

        {item.item_description && (
          <ListaAgrupada titulo="Descripción">
            <p className="px-4 py-3 text-[14px] leading-relaxed text-texto">{item.item_description}</p>
          </ListaAgrupada>
        )}

        {item.item_notes && (
          <ListaAgrupada titulo="Notas">
            <p className="px-4 py-3 text-[14px] leading-relaxed text-texto-2">{item.item_notes}</p>
          </ListaAgrupada>
        )}
      </div>
    </div>
  )
}

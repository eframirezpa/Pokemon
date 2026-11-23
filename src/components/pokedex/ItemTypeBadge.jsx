import { tipoItem } from '../../lib/tiposItem'
import { textoSobreColor } from '../../lib/partidaShared'

// Etiqueta del tipo de un item (Berry, Medicina, TM…), con el texto oscuro o
// blanco según cuál se lea mejor sobre su color.
export default function ItemTypeBadge({ type }) {
  if (!type) return null
  const t = tipoItem(type)
  const bg = t?.bg ?? '#8E8E93'
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] leading-[1.3] font-bold whitespace-nowrap"
      style={{ backgroundColor: bg, color: textoSobreColor(bg) }}>
      {t?.label ?? type}
    </span>
  )
}

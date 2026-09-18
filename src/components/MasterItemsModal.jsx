import { useState } from 'react'
import { X } from 'lucide-react'
import ItemsList from '../pages/ItemsList'
import CrearItemModal from './CrearItemModal'
import EditarItemModal from './EditarItemModal'

/**
 * Catálogo de items del máster dentro de la partida.
 *
 * Es el mismo listado del home -buscador, filtros por tipo y paginación-, con
 * dos añadidos que solo tienen sentido aquí: el botón para crear uno nuevo y el
 * lápiz de cada fila para corregirle el precio, el tipo o la descripción.
 */
export default function MasterItemsModal({ onClose }) {
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState(null)   // item que se está corrigiendo
  // Al crear o editar hay que volver a pedir la página: el listado la tiene
  // cacheada desde la última búsqueda.
  const [refresco, setRefresco] = useState(0)
  const recargar = () => setRefresco(n => n + 1)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
        <button onClick={onClose} title="Cerrar"
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">
          <X size={18} />
        </button>
        <ItemsList
          title="Items"
          onAdd={() => setCreando(true)}
          onEdit={setEditando}
          refreshKey={refresco}
        />
      </div>

      {creando && (
        <CrearItemModal onClose={() => setCreando(false)} onCreated={recargar} />
      )}

      {editando && (
        <EditarItemModal item={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); recargar() }}
          onDeleted={() => { setEditando(null); recargar() }} />
      )}
    </div>
  )
}

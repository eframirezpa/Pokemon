import { useState, useEffect, useRef } from 'react'
import { X, Upload, Image } from 'lucide-react'
import { apiFetch } from '../api'

const EMPTY = {
  nombre: '', descripcion: '',
  titulo1: '', leyenda1: '',
  titulo2: '', leyenda2: '',
  titulo3: '', leyenda3: '',
}

function SpriteField({ label, name, preview, onChange }) {
  const ref = useRef()
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div
        onClick={() => ref.current.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-red-300 hover:bg-red-50 transition-colors"
      >
        {preview
          ? <img src={preview} alt="" className="w-14 h-14 object-contain rounded-lg bg-gray-100" />
          : <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center"><Image size={20} className="text-gray-400" /></div>
        }
        <div>
          <p className="text-xs font-medium text-gray-700 flex items-center gap-1"><Upload size={12} /> Subir imagen</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{preview ? 'Haz clic para cambiar' : 'JPG, PNG, GIF...'}</p>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => onChange(e.target.files[0])} />
    </div>
  )
}

function Field({ label, name, value, onChange, textarea }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {textarea
        ? <textarea rows={2} name={name} value={value} onChange={onChange} required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
        : <input type="text" name={name} value={value} onChange={onChange} required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
      }
    </div>
  )
}

export default function PartidaForm({ partida, onClose, onSaved }) {
  const isEdit = !!partida
  const [fields, setFields]   = useState(isEdit ? {
    nombre: partida.nombre_partida, descripcion: partida.descripcion_partida,
    titulo1: partida.titulo1_partida, leyenda1: partida.leyenda1_partida,
    titulo2: partida.titulo2_partida, leyenda2: partida.leyenda2_partida,
    titulo3: partida.titulo3_partida, leyenda3: partida.leyenda3_partida,
  } : { ...EMPTY })

  const [sprites, setSprites] = useState({ sprite1: null, sprite2: null, sprite3: null })
  const [previews, setPreviews] = useState({
    sprite1: partida?.sprite1_partida ? null : null,
    sprite2: partida?.sprite2_partida ? null : null,
    sprite3: partida?.sprite3_partida ? null : null,
  })
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  const handleField = e => setFields(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSprite = (key, file) => {
    if (!file) return
    setSprites(s => ({ ...s, [key]: file }))
    const url = URL.createObjectURL(file)
    setPreviews(p => ({ ...p, [key]: url }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isEdit && (!sprites.sprite1 || !sprites.sprite2 || !sprites.sprite3)) {
      setError('Los 3 sprites son obligatorios'); return
    }
    setError(''); setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
      if (sprites.sprite1) fd.append('sprite1', sprites.sprite1)
      if (sprites.sprite2) fd.append('sprite2', sprites.sprite2)
      if (sprites.sprite3) fd.append('sprite3', sprites.sprite3)

      const res = await apiFetch(isEdit ? `/partida/${partida.id_partida}` : '/partida', {
        method: isEdit ? 'PUT' : 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al guardar'); return }
      onSaved(data)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-white font-bold">{isEdit ? 'Editar Partida' : 'Nueva Partida'}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <Field label="Nombre de la partida" name="nombre" value={fields.nombre} onChange={handleField} />
          <Field label="Descripción" name="descripcion" value={fields.descripcion} onChange={handleField} textarea />

          {[1, 2, 3].map(n => (
            <div key={n} className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sección {n}</p>
              <Field label={`Título ${n}`} name={`titulo${n}`} value={fields[`titulo${n}`]} onChange={handleField} />
              <Field label={`Leyenda ${n}`} name={`leyenda${n}`} value={fields[`leyenda${n}`]} onChange={handleField} textarea />
              <SpriteField
                label={`Sprite ${n}${!isEdit ? ' *' : ''}`}
                name={`sprite${n}`}
                preview={previews[`sprite${n}`]}
                onChange={file => handleSprite(`sprite${n}`, file)}
              />
            </div>
          ))}

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1 pb-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear partida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

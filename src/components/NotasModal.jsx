import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Loader2, ChevronDown, Check, User, Zap, Backpack, HelpCircle } from 'lucide-react'
import { apiFetch } from '../api'

const TIPOS = ['Personaje', 'Pokemon', 'Items', 'Otros']
const MAX_LEN = 125
// Icono + color por tipo de nota
const TIPO_ICON = {
  Personaje: { Icon: User,       color: 'text-blue-400' },
  Pokemon:   { Icon: Zap,        color: 'text-red-500' },
  Items:     { Icon: Backpack,   color: 'text-green-600' },
  Otros:     { Icon: HelpCircle, color: 'text-amber-400' },
}
function TipoIcon({ tipo }) {
  const { Icon, color } = TIPO_ICON[tipo] || TIPO_ICON.Otros
  return <span title={tipo || 'Otros'} className={`flex items-center ${color}`}><Icon size={16} /></span>
}

/* Popup para crear / editar una nota */
function NotaForm({ nota, busy, error, onCancel, onSave }) {
  const [tipo, setTipo] = useState(nota?.tipo_nota || 'Personaje')
  const [texto, setTexto] = useState(nota?.nota || '')
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{nota ? 'Editar nota' : 'Nueva nota'}</h3>
          <button onClick={onCancel} disabled={busy} className="text-gray-400 hover:text-gray-700 disabled:opacity-40"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Tipo</label>
            <div className="relative">
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2 text-sm text-gray-900 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nota</label>
            <textarea value={texto} onChange={e => setTexto(e.target.value.slice(0, MAX_LEN))} rows={4} autoFocus
              placeholder="Escribe tu nota..."
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{texto.length}/{MAX_LEN}</p>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
          <button onClick={() => onSave({ tipo_nota: tipo, nota: texto.trim() })} disabled={busy || !texto.trim()}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Notas del personaje: listar (con filtro por tipo), crear, editar, borrar y marcar hecha */
export default function NotasModal({ personajeId, onClose }) {
  const [notas, setNotas]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState(null)     // null = todas
  const [form, setForm]       = useState(null)     // { nota } | { } al crear
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  const load = () => {
    setLoading(true)
    apiFetch(`/notas?id_personaje=${personajeId}`)
      .then(r => r.json())
      .then(d => setNotas(Array.isArray(d) ? d : []))
      .catch(() => setNotas([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [personajeId])

  const list = filtro ? notas.filter(n => n.tipo_nota === filtro) : notas

  const save = async ({ tipo_nota, nota }) => {
    setBusy(true); setError('')
    try {
      const editing = form && form.id_nota
      const res = editing
        ? await apiFetch(`/notas/${form.id_nota}`, { method: 'PATCH', body: JSON.stringify({ tipo_nota, nota }) })
        : await apiFetch('/notas', { method: 'POST', body: JSON.stringify({ id_personaje: personajeId, tipo_nota, nota }) })
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error || 'No se pudo guardar'); return }
      setForm(null); load()
    } catch { setError('No se pudo guardar') } finally { setBusy(false) }
  }

  const toggleDone = async (n) => {
    const next = !n.is_done_nota
    setNotas(list => list.map(x => x.id_nota === n.id_nota ? { ...x, is_done_nota: next } : x))
    try {
      const res = await apiFetch(`/notas/${n.id_nota}`, { method: 'PATCH', body: JSON.stringify({ is_done_nota: next }) })
      if (!res.ok) throw new Error()
    } catch { setNotas(list => list.map(x => x.id_nota === n.id_nota ? { ...x, is_done_nota: !next } : x)) }
  }

  const remove = async (n) => {
    setNotas(list => list.filter(x => x.id_nota !== n.id_nota))
    try {
      const res = await apiFetch(`/notas/${n.id_nota}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch { load() }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">Notas</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { setError(''); setForm({}) }} title="Nueva nota"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors">
              <Plus size={17} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
        </div>

        {/* Filtro por tipo (una sola línea, scroll horizontal en móvil) */}
        <div className="px-5 pt-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setFiltro(null)}
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                filtro === null ? 'bg-red-600 border-red-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Todas
            </button>
            {TIPOS.map(t => (
              <button key={t} onClick={() => setFiltro(t)}
                className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                  filtro === t ? 'bg-red-600 border-red-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="animate-spin mr-2" size={18} /> Cargando...</div>
          ) : list.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-10">{notas.length === 0 ? 'No tienes notas.' : 'Sin notas de este tipo.'}</p>
          ) : (
            <div className="space-y-2">
              {list.map(n => (
                <div key={n.id_nota} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <button onClick={() => toggleDone(n)} title={n.is_done_nota ? 'Marcar pendiente' : 'Marcar hecha'}
                    className={`mt-0.5 w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                      n.is_done_nota ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white hover:border-green-400'}`}>
                    {n.is_done_nota && <Check size={11} className="text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm break-words ${n.is_done_nota ? 'line-through text-gray-400' : 'text-gray-800'}`}>{n.nota}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TipoIcon tipo={n.tipo_nota} />
                    <button onClick={() => { setError(''); setForm(n) }} title="Editar" className="p-1 text-gray-400 hover:text-red-600"><Pencil size={14} /></button>
                    <button onClick={() => remove(n)} title="Borrar" className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {form && (
        <NotaForm nota={form.id_nota ? form : null} busy={busy} error={error}
          onCancel={() => { if (!busy) { setForm(null); setError('') } }} onSave={save} />
      )}
    </div>
  )
}

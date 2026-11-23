import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, ChevronDown, Check, User, Zap, Backpack, HelpCircle } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

const TIPOS = ['Personaje', 'Pokemon', 'Items', 'Otros']
const MAX_LEN = 125
// Icono + color por tipo de nota
const TIPO_ICON = {
  Personaje: { Icon: User,       color: 'text-blue-400' },
  Pokemon:   { Icon: Zap,        color: 'text-red-500' },
  Items:     { Icon: Backpack,   color: 'text-ok' },
  Otros:     { Icon: HelpCircle, color: 'text-tinte' },
}
function TipoIcon({ tipo }) {
  const { Icon, color } = TIPO_ICON[tipo] || TIPO_ICON.Otros
  return <span title={tipo || 'Otros'} className={`flex items-center ${color}`}><Icon size={16} /></span>
}

/* Popup para crear / editar una nota */
function NotaForm({ nota, busy, error, onCancel, onSave, tipoPorDefecto = 'Personaje' }) {
  // Al crear, se propone el tipo que se está viendo: si estás filtrando por
  // Items, lo natural es que la nota nueva nazca como Items. Al editar manda el
  // tipo que ya tiene la nota.
  const [tipo, setTipo] = useState(nota?.tipo_nota || tipoPorDefecto)
  const [texto, setTexto] = useState(nota?.nota || '')
  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-sm flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between">
          <h3 className="font-bold text-texto">{nota ? 'Editar nota' : 'Nueva nota'}</h3>
          <button onClick={onCancel} disabled={busy} aria-label="Cerrar" className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2 hover:text-texto shrink-0 disabled:opacity-40"><X size={16} strokeWidth={2.4} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1">Tipo</label>
            <div className="relative">
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-texto-2 mb-1">Nota</label>
            <textarea value={texto} onChange={e => setTexto(e.target.value.slice(0, MAX_LEN))} rows={4} autoFocus
              placeholder="Escribe tu nota..."
              className="w-full px-3 py-2 text-sm text-texto border border-separador rounded-xl bg-superficie focus:outline-none focus:ring-2 focus:ring-tinte/50 resize-none" />
            <p className="text-[10px] text-texto-2 text-right mt-0.5">{texto.length}/{MAX_LEN}</p>
          </div>
          {error && <p className="text-xs text-peligro font-medium">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-separador flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="text-sm font-semibold text-texto-2 hover:text-texto px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
          <button onClick={() => onSave({ tipo_nota: tipo, nota: texto.trim() })} disabled={busy || !texto.trim()}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-acento hover:bg-acento-hover disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <PokeballSpinner size={15} /> : <Check size={15} />} Guardar
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
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-lg max-h-[85vh] flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
          <h3 className="font-bold text-texto">Pokenotas</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { setError(''); setForm({}) }} title="Nueva nota"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-acento hover:bg-acento-hover text-white shadow-sm transition-colors">
              <Plus size={17} />
            </button>
            <button onClick={onClose} aria-label="Cerrar" className="w-[30px] h-[30px] rounded-full bg-relleno grid place-items-center text-texto-2 hover:bg-relleno-2 hover:text-texto shrink-0 disabled:opacity-40"><X size={16} strokeWidth={2.4} /></button>
          </div>
        </div>

        {/* Filtro por tipo (una sola línea, scroll horizontal en móvil) */}
        <div className="px-5 pt-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setFiltro(null)}
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                filtro === null ? 'bg-acento border-acento text-white' : 'border-separador text-texto-2 hover:bg-relleno'}`}>
              Todas
            </button>
            {TIPOS.map(t => (
              <button key={t} onClick={() => setFiltro(t)}
                className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                  filtro === t ? 'bg-acento border-acento text-white' : 'border-separador text-texto-2 hover:bg-relleno'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-texto-2"><PokeballSpinner size={18} className="mr-2" /> Cargando...</div>
          ) : list.length === 0 ? (
            <p className="text-sm text-texto-2 italic text-center py-10">{notas.length === 0 ? 'No tienes notas.' : 'Sin notas de este tipo.'}</p>
          ) : (
            <div className="space-y-2">
              {list.map(n => (
                <div key={n.id_nota} className="flex items-start gap-2 bg-superficie border border-separador rounded-xl px-3 py-2">
                  <button onClick={() => toggleDone(n)} title={n.is_done_nota ? 'Marcar pendiente' : 'Marcar hecha'}
                    className={`mt-0.5 w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                      n.is_done_nota ? 'bg-ok border-ok' : 'border-separador bg-superficie hover:border-ok/60'}`}>
                    {n.is_done_nota && <Check size={11} className="text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm break-words ${n.is_done_nota ? 'line-through text-texto-2' : 'text-texto'}`}>{n.nota}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TipoIcon tipo={n.tipo_nota} />
                    <button onClick={() => { setError(''); setForm(n) }} title="Editar" className="p-1 text-texto-2 hover:text-tinte"><Pencil size={14} /></button>
                    <button onClick={() => remove(n)} title="Borrar" className="p-1 text-texto-2 hover:text-tinte"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {form && (
        <NotaForm nota={form.id_nota ? form : null} tipoPorDefecto={filtro || 'Personaje'} busy={busy} error={error}
          onCancel={() => { if (!busy) { setForm(null); setError('') } }} onSave={save} />
      )}
    </div>
  )
}

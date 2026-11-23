import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Copy, Trash2, AlertTriangle } from 'lucide-react'
import { apiFetch } from '../api'
import MasterNpcWizard from './MasterNpcWizard'
import PokeballSpinner from './PokeballSpinner'

/* Confirmación de borrado de un NPC */
function ConfirmDelete({ npc, busy, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-sm flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
          <h3 className="font-bold text-texto truncate">Eliminar NPC</h3>
          <button onClick={onCancel} disabled={busy} className="text-texto-2 hover:text-texto shrink-0 ml-2 disabled:opacity-40"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-texto">¿Eliminar a <span className="font-bold text-texto">{npc.master_npc_apodo}</span>?</p>
          <div className="flex items-start gap-2 bg-aviso/10 border border-aviso/30 rounded-lg px-3 py-2">
            <AlertTriangle size={16} className="text-aviso shrink-0 mt-0.5" />
            <p className="text-xs text-aviso">Esta acción <span className="font-bold">no se puede deshacer</span>.</p>
          </div>
          {error && <p className="text-xs text-peligro font-medium">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-separador flex items-center justify-end gap-2 shrink-0">
          <button onClick={onCancel} disabled={busy}
            className="text-sm font-semibold text-texto-2 hover:text-texto px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
          <button onClick={onConfirm} disabled={busy}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-acento hover:bg-acento-hover disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
            {busy ? <PokeballSpinner size={15} /> : <Trash2 size={15} />} Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Lista de NPC del máster: crear, editar, clonar y eliminar */
export default function MasterNpcPanel({ onClose }) {
  const [npcs, setNpcs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busyDel, setBusyDel] = useState(false)
  const [errorDel, setErrorDel] = useState('')
  const [wizard, setWizard] = useState(null) // { mode, sourceId } | null

  const load = () => {
    setLoading(true)
    apiFetch('/master/npc')
      .then(r => r.json())
      .then(d => setNpcs(Array.isArray(d) ? d : []))
      .catch(() => setNpcs([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const doDelete = async (npc) => {
    setBusyDel(true); setErrorDel('')
    try {
      const res = await apiFetch(`/master/npc/${npc.id_master_npc}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrorDel(j.error || 'No se pudo eliminar el NPC')
        return
      }
      setNpcs(prev => prev.filter(x => x.id_master_npc !== npc.id_master_npc))
      setConfirmDel(null)
    } catch {
      setErrorDel('No se pudo eliminar el NPC')
    } finally {
      setBusyDel(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-fondo text-texto animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-lg max-h-[88vh] flex flex-col shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center justify-between shrink-0">
          <h3 className="font-bold text-texto">Mis NPC</h3>
          <button onClick={onClose} className="text-texto-2 hover:text-texto"><X size={18} /></button>
        </div>

        <div className="px-5 pt-4 shrink-0">
          <button
            onClick={() => setWizard({ mode: 'create' })}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-separador
                       text-texto-2 hover:border-tinte/60 hover:text-tinte text-sm font-semibold rounded-xl transition-colors">
            <Plus size={15} /> Agregar NPC
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-texto-2">
              <PokeballSpinner size={18} className="mr-2" /> Cargando...
            </div>
          ) : npcs.length === 0 ? (
            <p className="text-sm text-texto-2 italic text-center py-10">Aún no tienes NPC.</p>
          ) : (
            <div className="space-y-2">
              {npcs.map(n => (
                <div key={n.id_master_npc} className="flex items-center gap-3 bg-superficie border border-separador rounded-xl px-3 py-2">
                  <img src={`/avatars/${n.master_npc_avatar}`} alt=""
                    className="w-11 h-11 object-cover bg-relleno rounded-lg shrink-0"
                    onError={e => { e.currentTarget.style.opacity = '0.2' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-texto text-sm truncate">{n.master_npc_apodo}</span>
                      <span className="text-[10px] font-bold text-texto-2 bg-relleno-2 rounded px-1.5 py-0.5 shrink-0">Lv.{n.master_npc_level}</span>
                    </div>
                    <p className="text-xs text-texto-2">
                      HP {n.master_npc_current_hp}/{n.master_npc_hp}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setWizard({ mode: 'edit', sourceId: n.id_master_npc })} title="Editar"
                      className="p-1.5 rounded-lg text-texto-2 hover:text-tinte hover:bg-tinte/10 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setWizard({ mode: 'clone', sourceId: n.id_master_npc })} title="Clonar"
                      className="p-1.5 rounded-lg text-texto-2 hover:text-tinte hover:bg-tinte/10 transition-colors">
                      <Copy size={15} />
                    </button>
                    <button onClick={() => { setErrorDel(''); setConfirmDel(n) }} title="Eliminar"
                      className="p-1.5 rounded-lg text-texto-2 hover:text-tinte hover:bg-tinte/10 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDel && (
        <ConfirmDelete npc={confirmDel} busy={busyDel} error={errorDel}
          onCancel={() => { if (!busyDel) { setConfirmDel(null); setErrorDel('') } }}
          onConfirm={() => doDelete(confirmDel)} />
      )}

      {wizard && (
        <MasterNpcWizard
          mode={wizard.mode}
          sourceId={wizard.sourceId}
          onClose={() => setWizard(null)}
          onSaved={() => { setWizard(null); load() }}
        />
      )}
    </div>
  )
}

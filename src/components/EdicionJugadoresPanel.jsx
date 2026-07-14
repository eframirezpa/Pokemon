import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { apiFetch } from '../api'

/* Panel del master (acordeón) para editar jugadores conectados.
   Por ahora solo muestra el listado + un check que representa personaje_is_editable.
   onAfterChange: se llama tras cambiar el flag (para avisar a los trainers vía party_update). */
export default function EdicionJugadoresPanel({ partidaId, presentes = [], partyVersion, onAfterChange }) {
  const [open, setOpen] = useState(false)
  const [editable, setEditable] = useState({}) // personaje_id → bool
  const [saving, setSaving] = useState(null)    // personaje_id que se está guardando

  const reload = useCallback(() => {
    return apiFetch(`/personaje/party?id_partida=${partidaId}`)
      .then(r => r.json())
      .then(list => {
        const map = {}
        for (const c of (Array.isArray(list) ? list : [])) map[String(c.id_personaje)] = !!c.personaje_is_editable
        setEditable(map)
      })
      .catch(() => {})
  }, [partidaId])

  useEffect(() => { reload() }, [reload, partyVersion])

  // Jugadores conectados con personaje activo (deduplicado por personaje)
  const seen = new Set()
  const jugadores = []
  for (const p of presentes) {
    if (p.role === 'master') continue
    if (p.personaje_id == null) continue
    const key = String(p.personaje_id)
    if (seen.has(key)) continue
    seen.add(key)
    jugadores.push(p)
  }

  const toggle = async (personaje_id) => {
    const key = String(personaje_id)
    const next = !editable[key]
    setEditable(prev => ({ ...prev, [key]: next })) // optimista
    setSaving(personaje_id)
    try {
      const res = await apiFetch(`/personaje/${personaje_id}/editable`, {
        method: 'PATCH', body: JSON.stringify({ is_editable: next }),
      })
      if (!res.ok) throw new Error()
      onAfterChange?.() // avisa a los trainers para que actualicen su lápiz
    } catch {
      setEditable(prev => ({ ...prev, [key]: !next })) // revierte si falla
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="shrink-0 px-4 pt-3">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-1.5 py-2 bg-gray-800 hover:bg-gray-700
                   border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-colors">
        <span>Edición de Jugadores (Stats, Feats, Level UP ... ETC)</span>
        <ChevronDown size={15} className={`transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl divide-y divide-gray-700/60 overflow-hidden">
          {jugadores.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic px-3 py-3">No hay jugadores conectados.</p>
          ) : jugadores.map(p => {
            const key = String(p.personaje_id)
            const on = !!editable[key]
            return (
              <div key={key} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm text-gray-100 truncate">{p.user_name || 'Jugador'}</span>
                <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Editable</span>
                  <button onClick={() => toggle(p.personaje_id)} disabled={saving === p.personaje_id}
                    className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-colors disabled:opacity-50 ${
                      on ? 'bg-green-600 border-green-600' : 'border-gray-500 bg-gray-700'}`}
                    title={on ? 'Edición habilitada' : 'Edición deshabilitada'}>
                    {on && <Check size={13} className="text-white" strokeWidth={3} />}
                  </button>
                </label>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

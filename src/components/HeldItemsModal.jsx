import { useEffect, useState } from 'react'
import { X, AlertTriangle, Plus, Briefcase } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

// Objetos equipados de un Pokémon.
//
// Se usa desde dos sitios con comportamientos distintos, y por eso lleva el
// prop `modo`:
//
//   'gestion' — cinturón y femputadora. Se equipan y se quitan objetos; el item
//               sale y vuelve a la mochila del entrenador.
//   'combate' — panel de combate. Solo se consultan y se USAN; usar es
//               irreversible y el item no vuelve.
//
// La cuenta de la mochila la lleva el backend dentro de una transacción; aquí
// solo se recarga la lista al terminar.
export default function HeldItemsModal({ personajeId, idpp, modo = 'gestion', onClose, onChanged }) {
  const [held, setHeld]       = useState(null)   // null = cargando
  // Cuántos objetos puede llevar. Lo dice el servidor porque depende de sus
  // feats (regla 2: Ambidextrous); el cliente no puede deducirlo.
  const [maximo, setMaximo]   = useState(1)
  const [mochila, setMochila] = useState([])
  const [agregando, setAgregando] = useState(false)  // panel de elegir item
  const [confirmar, setConfirmar] = useState(null)   // { tipo, item }
  const [abierto, setAbierto] = useState(null)       // id con el detalle desplegado
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  const gestion = modo === 'gestion'

  const cargar = async () => {
    const h = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/held-items`).then(r => r.json())
    setHeld(Array.isArray(h?.items) ? h.items : [])
    if (Number(h?.maximo) > 0) setMaximo(Number(h.maximo))
    if (gestion) {
      // Solo lo que queda en la mochila: con cantidad 0 no hay nada que equipar
      const m = await apiFetch(`/personaje/${personajeId}/equipo`).then(r => r.json())
      setMochila((Array.isArray(m) ? m : []).filter(i => Number(i.cantidad) > 0))
    }
  }

  // Las dos consultas van en el efecto y no llamando a cargar(): la regla de
  // lint no puede saber que cargar() empieza por un await y lo toma por un
  // setState síncrono. El resultado es el mismo.
  useEffect(() => {
    let vivo = true
    Promise.all([
      apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/held-items`).then(r => r.json()),
      gestion
        ? apiFetch(`/personaje/${personajeId}/equipo`).then(r => r.json())
        : Promise.resolve([]),
    ]).then(([h, m]) => {
      if (!vivo) return
      setHeld(Array.isArray(h?.items) ? h.items : [])
      if (Number(h?.maximo) > 0) setMaximo(Number(h.maximo))
      setMochila((Array.isArray(m) ? m : []).filter(i => Number(i.cantidad) > 0))
    }).catch(() => { if (vivo) { setHeld([]); setError('No se pudo cargar') } })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personajeId, idpp])

  const lleno = (held?.length ?? 0) >= maximo

  const ejecutar = async () => {
    if (!confirmar || busy) return
    setBusy(true); setError('')
    const { tipo, item } = confirmar
    try {
      let res
      if (tipo === 'agregar') {
        res = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/held-items`,
          { method: 'POST', body: JSON.stringify({ id_item: item.id_item }) })
      } else if (tipo === 'quitar') {
        res = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/held-items/${item.personaje_pokemon_held_item_id}`,
          { method: 'DELETE' })
      } else {
        res = await apiFetch(`/personaje/${personajeId}/pokemon/${idpp}/held-items/${item.personaje_pokemon_held_item_id}/usar`,
          { method: 'POST' })
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'No se pudo completar la acción')
        return
      }
      setConfirmar(null); setAgregando(false)
      await cargar()
      onChanged?.()
    } catch { setError('No se pudo completar la acción') }
    finally { setBusy(false) }
  }

  const textoConfirmacion = {
    agregar: 'Esta acción debe ser aprobada por el DM.',
    quitar:  'El objeto volverá a tu mochila.',
    usar:    'Esta acción no se puede deshacer, el item desaparecerá.',
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm max-h-[85vh]
                      flex flex-col shadow-2xl overflow-hidden">

        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Briefcase size={16} className="text-green-400" /> Held Items
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {held === null ? (
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 py-6 justify-center">
              <PokeballSpinner size={14} /> Cargando…
            </p>
          ) : (
            <>
              {/* Lo que lleva puesto */}
              {held.length === 0 ? (
                <p className="text-[11px] text-gray-500 italic">Este Pokémon no lleva ningún objeto.</p>
              ) : held.map(h => {
                const open = abierto === h.personaje_pokemon_held_item_id
                return (
                  <div key={h.personaje_pokemon_held_item_id} className="bg-gray-700/50 rounded-lg px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => setAbierto(open ? null : h.personaje_pokemon_held_item_id)}
                        className="min-w-0 flex-1 text-left text-white text-xs font-medium truncate hover:text-amber-300 transition-colors">
                        {h.item_name}
                      </button>
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-gray-400
                                       bg-gray-800/60 border border-gray-600 rounded px-1.5 py-0.5">
                        {h.item_type}
                      </span>
                      <button onClick={() => setConfirmar({ tipo: gestion ? 'quitar' : 'usar', item: h })}
                        className={`shrink-0 text-[10px] font-bold uppercase tracking-wide text-white px-2 py-1
                                    rounded-md transition-colors ${
                          gestion ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-700'}`}>
                        {gestion ? 'Quitar' : 'Usar'}
                      </button>
                    </div>
                    {open && (
                      <p className="mt-1 text-[11px] text-gray-400 whitespace-pre-line">
                        {h.item_description || 'Sin descripción.'}
                      </p>
                    )}
                  </div>
                )
              })}

              {/* Equipar, solo desde el cinturón y la femputadora */}
              {gestion && (
                <div className="border-t border-gray-700 pt-3">
                  {!agregando ? (
                    <button onClick={() => { setAgregando(true); setError('') }} disabled={lleno}
                      title={lleno ? `Ya lleva ${maximo} objeto${maximo === 1 ? '' : 's'}, su máximo` : undefined}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white
                                 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
                                 px-3 py-2 rounded-lg transition-colors">
                      <Plus size={14} /> Agregar
                    </button>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        De tu mochila
                      </p>
                      {mochila.length === 0 ? (
                        <p className="text-[11px] text-gray-500 italic">No tienes items disponibles.</p>
                      ) : (
                        <div className="space-y-1">
                          {mochila.map(i => (
                            <button key={i.id_personaje_equipo}
                              onClick={() => setConfirmar({ tipo: 'agregar', item: i })}
                              className="w-full flex items-center justify-between gap-2 bg-gray-700/50 hover:bg-gray-700
                                         rounded-lg px-2 py-1.5 text-left transition-colors">
                              <span className="text-white text-xs font-medium truncate">{i.item_name}</span>
                              <span className="shrink-0 text-[10px] font-black tabular-nums text-gray-300">x{i.cantidad}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setAgregando(false)}
                        className="mt-2 w-full text-[11px] font-semibold text-gray-400 hover:text-gray-200 py-1">
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              )}

              {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
            </>
          )}
        </div>
      </div>

      {/* Confirmación. El aviso cambia según lo que se vaya a hacer: equipar
          necesita el visto bueno del DM, usar es irreversible. */}
      {confirmar && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget && !busy) setConfirmar(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 truncate">{confirmar.item.item_name}</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2 border ${
                confirmar.tipo === 'usar' ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
                <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${
                  confirmar.tipo === 'usar' ? 'text-red-600' : 'text-amber-600'}`} />
                <p className={`text-[11px] leading-snug ${
                  confirmar.tipo === 'usar' ? 'text-red-900' : 'text-amber-900'}`}>
                  {textoConfirmacion[confirmar.tipo]}
                </p>
              </div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmar(null)} disabled={busy}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">
                Cancelar
              </button>
              <button onClick={ejecutar} disabled={busy}
                className={`flex items-center gap-1.5 text-sm font-bold text-white px-4 py-1.5 rounded-lg
                            transition-colors disabled:opacity-40 ${
                  confirmar.tipo === 'usar' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                {busy && <PokeballSpinner size={14} />}
                {confirmar.tipo === 'agregar' ? 'Agregar' : confirmar.tipo === 'quitar' ? 'Quitar' : 'Usar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

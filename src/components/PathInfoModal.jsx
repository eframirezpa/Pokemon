// Detalle de la ruta del entrenador. Marca cada rasgo según el nivel:
// adquirido (ya se alcanzó) o pendiente (falta llegar).
import { X, Check, Lock } from 'lucide-react'
import { describirPathBonus, TARGET_BONO } from '../lib/pathBonus'

const NIVELES = [2, 5, 9, 15]

export default function PathInfoModal({ path, nivel = 1, otorgados = [], onClose }) {
  if (!path) return null
  const bonos = path.bonos || []
  // Lo que el personaje ya tiene registrado, por nivel: sirve para mostrar la
  // skill concreta que eligió, que el catálogo no puede saber.
  const porNivel = new Map()
  for (const b of otorgados) {
    const n = Number(b.level)
    if (!porNivel.has(n)) porNivel.set(n, [])
    porNivel.get(n).push(b)
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Trainer Path</p>
            <h3 className="font-bold text-gray-900 truncate">{path.path_name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {path.path_full_description && (
            <p className="text-xs text-gray-600 leading-relaxed">{path.path_full_description}</p>
          )}

          {NIVELES.map(n => {
            const nombre = path[`path_level_${n}_feature_name`]
            const descr  = path[`path_level_${n}_description`]
            if (!nombre && !descr) return null
            const adquirido = nivel >= n
            const mios = porNivel.get(n) || []
            return (
              <div key={n} className={`border rounded-xl px-3 py-2.5 ${
                adquirido ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-gray-50/60'}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold text-white rounded px-1.5 py-0.5 shrink-0 ${
                    adquirido ? 'bg-green-600' : 'bg-gray-400'}`}>Nivel {n}</span>
                  <span className={`text-xs font-bold ${adquirido ? 'text-gray-800' : 'text-gray-500'}`}>{nombre}</span>
                  {adquirido
                    ? <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-700"><Check size={11} /> Adquirido</span>
                    : <span className="flex items-center gap-0.5 text-[10px] font-bold text-gray-400"><Lock size={10} /> Pendiente</span>}
                </div>
                {descr && (
                  <p className={`text-xs leading-relaxed ${adquirido ? 'text-gray-600' : 'text-gray-400'}`}>{descr}</p>
                )}

                {/* Lo que el personaje tiene registrado de este nivel */}
                {mios.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {mios.map(b => (
                      <span key={b.id}
                        className={`text-[10px] font-bold rounded px-1.5 py-0.5 border ${
                          (b.value || '').toLowerCase() === 'expert'
                            ? 'text-blue-700 bg-blue-50 border-blue-200'
                            : 'text-green-700 bg-green-50 border-green-200'}`}>
                        {b.llave}{(b.value || '').toLowerCase() === 'expert' ? ' exp' : ''}
                        {(b.target || '') === 'all_pokemon' && <span className="font-normal"> (Pokémon)</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Lo que el catálogo define para ese nivel */}
                {bonos.filter(b => Number(b.level) === n).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {bonos.filter(b => Number(b.level) === n).map(b => {
                      const d = describirPathBonus(b)
                      return (
                        <span key={b.id} title={d.detalle || b.notes || undefined}
                          className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 border ${
                            adquirido ? 'text-gray-700 bg-white border-gray-300' : 'text-gray-400 bg-white border-gray-200'}`}>
                          {d.texto}
                          {d.target && d.target !== 'trainer' && (
                            <span className="font-normal text-gray-400"> · {TARGET_BONO[d.target] || d.target}</span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {path.path_notes && (
            <p className="text-xs text-gray-500 italic">
              <span className="font-semibold not-italic text-gray-700">Notas: </span>{path.path_notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

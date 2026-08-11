import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

// Arma equipada del entrenador dentro del panel de combate.
//
// Muestra lo mismo que la ventana de Equipamiento —daño, rango, manos y
// propiedades— pero con el estilo oscuro del panel y en compacto: en mesa lo
// que se consulta es con qué se pega y cuánto, no la ficha entera.
//
// Solo las que están en uso (personaje_weapon_in_use). Las demás viven en
// Equipamiento, que es donde se equipan y se desequipan.
//
// La proficiencia llega desde arriba y no se consulta aquí: el panel ya pidió
// /full para armar la ficha del entrenador, y ese es el dato que decide si un
// arma cuyo prof viene de un feat sigue contando.
export default function WeaponPanel({ personajeId, profs = null }) {
  const [armas, setArmas]   = useState(null)
  const [props, setProps]   = useState({})   // weapon_property_id → { name, description }
  const [abierto, setAbierto] = useState(null)
  const [error, setError]   = useState('')

  useEffect(() => {
    let vivo = true
    Promise.all([
      apiFetch(`/personaje/${personajeId}/weapon`).then(r => r.json()),
      apiFetch('/weapon-properties?limit=200').then(r => r.json()),
    ]).then(([w, p]) => {
      if (!vivo) return
      setArmas((Array.isArray(w) ? w : []).filter(x => x.personaje_weapon_in_use))
      const mapa = {}
      for (const pr of (p.data || [])) {
        mapa[pr.weapon_property_id] = { name: pr.weapon_property_name, description: pr.weapon_property_description }
      }
      setProps(mapa)
    }).catch(() => { if (vivo) { setArmas([]); setError('No se pudo cargar el arma') } })
    return () => { vivo = false }
  }, [personajeId])

  // Las propiedades vienen como hasta seis columnas de ids sueltos
  const propiedadesDe = (w) => [
    w.weapon_type_property_1, w.weapon_type_property_2, w.weapon_type_property_3,
    w.weapon_type_property_4, w.weapon_type_property_5, w.weapon_type_property_6,
  ].filter(Boolean).map(id => props[id] || { name: String(id), description: '' })

  if (armas === null) {
    return <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><PokeballSpinner size={12} /> Cargando…</p>
  }
  if (error) return <p className="text-[11px] text-red-400 font-medium">{error}</p>

  return (
    <div className="space-y-1">
      {armas.length === 0 ? (
        <p className="text-[11px] text-gray-500 italic">Ninguna arma equipada.</p>
      ) : armas.map(w => {
        const open = abierto === w.id_personaje_weapon
        const prof = profs ? profs.isWeaponProf(w) : !!w.personaje_weapon_prof
        const dano = [w.weapon_type_damage_dice, w.weapon_type_damage_type].filter(Boolean).join(' ')
        return (
          <div key={w.id_personaje_weapon} className="bg-gray-700/50 rounded-lg px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setAbierto(open ? null : w.id_personaje_weapon)}
                className="min-w-0 flex-1 text-left text-white text-xs font-medium truncate hover:text-amber-300 transition-colors">
                {w.weapon_type_name}
              </button>
              {/* Igual que en Stats y Saves: el verde marca la proficiencia */}
              <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border ${
                prof ? 'text-green-300 bg-green-900/40 border-green-600' : 'text-gray-400 bg-gray-800/60 border-gray-600'}`}>
                {prof ? 'prof' : 'no prof'}
              </span>
            </div>

            {/* Lo que se consulta al atacar, siempre a la vista */}
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {dano && <Dato label="Daño" value={dano} />}
              {w.weapon_type_range    && <Dato label="Rango" value={w.weapon_type_range} />}
              {w.weapon_type_hand_use && <Dato label="Manos" value={w.weapon_type_hand_use} />}
            </div>

            {open && (
              <div className="mt-1.5 space-y-1.5">
                {w.weapon_type_dnd_category && (
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{w.weapon_type_dnd_category}</p>
                )}
                {propiedadesDe(w).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {propiedadesDe(w).map((p, i) => (
                      <span key={i} title={p.description || undefined}
                        className="text-[9px] font-bold text-gray-300 bg-gray-800/60 border border-gray-600 rounded px-1.5 py-0.5">
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
                {w.weapon_type_description && (
                  <p className="text-[11px] text-gray-400 leading-relaxed">{w.weapon_type_description}</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* Etiqueta compacta "Daño 1d4 piercing" */
function Dato({ label, value }) {
  return (
    <span className="text-[9px] font-bold text-gray-300 bg-gray-800/60 border border-gray-600 rounded px-1.5 py-0.5">
      <span className="text-gray-500 uppercase">{label}</span> {value}
    </span>
  )
}

import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo, Vacio } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import Boton from '../components/ui/Boton'
import { apiFetch } from '../api'
import { describirPathBonus, TARGET_BONO } from '../lib/pathBonus'

// Las rutas otorgan sus rasgos en estos cuatro niveles, siempre los mismos.
const NIVELES = [2, 5, 9, 15]

// Etiquetas de path_bonus_type / target, que en la BD vienen en snake_case
/* Un rasgo (nivel + nombre + descripción) con los bonos que otorga */
function Rasgo({ nivel, nombre, descripcion, bonos }) {
  if (!nombre && !descripcion) return null
  return (
    <div className="bg-superficie rounded-xl px-3 py-2.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-white bg-acento rounded-md px-1.5 py-0.5 shrink-0">Nivel {nivel}</span>
        <span className="text-[14px] font-semibold text-texto">{nombre}</span>
      </div>
      {descripcion && <p className="mt-1">{descripcion}</p>}
      {bonos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {bonos.map(b => {
            const d = describirPathBonus(b)
            return (
              <span key={b.id} title={d.detalle || b.notes || undefined}
                className={`text-[11px] font-semibold rounded-md px-1.5 py-0.5 ${
                  d.aplica ? 'text-ok bg-ok/12' : 'text-texto-2 bg-relleno'}`}>
                {d.texto}
                {d.target && d.target !== 'trainer' && (
                  <span className="font-normal"> · {TARGET_BONO[d.target] || d.target}</span>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PathsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vivo = true
    apiFetch('/paths')
      .then(r => { if (!r.ok) throw new Error(`El servidor respondió ${r.status}`); return r.json() })
      .then(d => { if (vivo) setItems(Array.isArray(d) ? d : []) })
      .catch(e => { if (vivo) { setItems([]); setLoadError(e.message || 'No se pudieron cargar las rutas') } })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [intento])

  const q = search.toLowerCase()
  const filtered = items.filter(p =>
    !search ||
    p.path_name?.toLowerCase().includes(q) ||
    NIVELES.some(n => p[`path_level_${n}_feature_name`]?.toLowerCase().includes(q))
  )

  return (
    <Pagina>
      <CabeceraPagina titulo="Rutas de Entrenador"
        subtitulo={loading ? 'Cargando…' : `${filtered.length} rutas · rasgos en los niveles 2, 5, 9 y 15`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar ruta o rasgo" />} />

      {loadError ? (
        <Vacio titulo="No se pudieron cargar las rutas" detalle={loadError}
          accion={<Boton tamano="md" className="mt-2" onClick={() => { setLoading(true); setLoadError(''); setIntento(n => n + 1) }}>Reintentar</Boton>} />
      ) : (
        <ListaCatalogo cargando={loading} vacio="No se encontraron rutas">
          {filtered.map(p => {
            const open  = expandedId === p.path_id
            const bonos = p.bonos || []
            return (
              <CeldaDesplegable key={p.path_id} titulo={p.path_name}
                subtitulo={NIVELES.map(n => p[`path_level_${n}_feature_name`]).filter(Boolean).join(' · ') || null}
                abierta={open} onToggle={() => setExpandedId(open ? null : p.path_id)}>
                <div className="space-y-2">
                  {p.path_full_description && <p className="text-texto">{p.path_full_description}</p>}
                  {NIVELES.map(n => (
                    <Rasgo key={n} nivel={n}
                      nombre={p[`path_level_${n}_feature_name`]}
                      descripcion={p[`path_level_${n}_description`]}
                      bonos={bonos.filter(b => Number(b.level) === n)} />
                  ))}
                  {p.path_notes && <Dato etiqueta="Notas" className="italic">{p.path_notes}</Dato>}
                </div>
              </CeldaDesplegable>
            )
          })}
        </ListaCatalogo>
      )}
    </Pagina>
  )
}

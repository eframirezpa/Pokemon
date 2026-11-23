import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { TypeBadge } from '../components/partida/TypeBadge'
import { apiFetch } from '../api'

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export default function SpecializationsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/specializations?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search ||
    n.specialization_name?.toLowerCase().includes(search.toLowerCase()) ||
    n.specialization_pokemon_type_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Pagina>
      <CabeceraPagina titulo="Especializaciones" subtitulo={loading ? 'Cargando…' : `${filtered.length} especializaciones`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar especialización" />} />
      <ListaCatalogo cargando={loading} vacio="No se encontraron especializaciones">
        {filtered.map(n => {
          const open = expandedId === n.specialization_id
          const tipo = n.specialization_pokemon_type_name
          const asi  = n.specialization_ability_score_increase
          const skill = n.specialization_skill_proficiency
          return (
            <CeldaDesplegable key={n.specialization_id} titulo={n.specialization_name}
              subtitulo={(asi || skill) ? (
                <>
                  {asi && <span className="font-semibold text-ok mr-2">{asi.toUpperCase()} +{n.specialization_ability_score_increase_value ?? 1}</span>}
                  {skill && <span>prof: {cap(skill)}</span>}
                </>
              ) : null}
              valor={tipo && <TypeBadge type={cap(tipo)} tamano="sm" />}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.specialization_id)}>
              <div className="space-y-1.5">
                {n.specialization_description && <p className="text-texto">{n.specialization_description}</p>}
                {asi && (
                  <Dato etiqueta="Aumento de atributo">{asi.toUpperCase()} +{n.specialization_ability_score_increase_value ?? 1}</Dato>
                )}
                {skill && (
                  <Dato etiqueta="Proficiencia">{cap(skill)}
                    {n.specialization_grants_expertise_if_proficient === 1 && ' (experto si ya es proficiente)'}</Dato>
                )}
                {n.specialization_notes && <Dato etiqueta="Notas">{n.specialization_notes}</Dato>}
              </div>
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { apiFetch } from '../api'

export default function BackgroundsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/backgrounds?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.background_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Pagina>
      <CabeceraPagina titulo="Trasfondos" subtitulo={loading ? 'Cargando…' : `${filtered.length} trasfondos`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar" />} />
      <ListaCatalogo cargando={loading} vacio="No se encontraron trasfondos">
        {filtered.map(n => {
          const open = expandedId === n.background_id
          return (
            <CeldaDesplegable key={n.background_id} titulo={n.background_name} subtitulo={n.background_description}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.background_id)}>
              <div className="space-y-2">
                {n.background_description && <p className="text-texto">{n.background_description}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {n.background_ability_scores_name && (
                    <div className="bg-superficie rounded-xl px-3 py-2">
                      <p className="font-semibold text-texto">{n.background_ability_scores_name}</p>
                      <p>{n.background_ability_scores_description}</p>
                      <p className="text-texto mt-0.5">{[n.background_ability_scores_value_1, n.background_ability_scores_value_2, n.background_ability_scores_value_3].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                  {n.background_skill_proficiencies_name && (
                    <div className="bg-superficie rounded-xl px-3 py-2">
                      <p className="font-semibold text-texto">{n.background_skill_proficiencies_name}</p>
                      <p>{[n.background_skill_proficiencies_value_1, n.background_skill_proficiencies_value_2].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                  {n.background_feat_name && (
                    <div className="bg-superficie rounded-xl px-3 py-2">
                      <p className="font-semibold text-texto">Rasgo</p>
                      <p>{n.background_feat_name}</p>
                    </div>
                  )}
                </div>
                {n.background_notes && <Dato etiqueta="Notas">{n.background_notes}</Dato>}
              </div>
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

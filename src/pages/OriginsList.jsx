import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { apiFetch } from '../api'

export default function OriginsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/origins?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.origin_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Pagina>
      <CabeceraPagina titulo="Orígenes" subtitulo={loading ? 'Cargando…' : `${filtered.length} orígenes`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar" />} />
      <ListaCatalogo cargando={loading} vacio="No se encontraron orígenes">
        {filtered.map(n => {
          const open = expandedId === n.origin_id
          return (
            <CeldaDesplegable key={n.origin_id} titulo={n.origin_name} subtitulo={n.origin_description}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.origin_id)}>
              <div className="space-y-2">
                {n.origin_description && <p className="text-texto">{n.origin_description}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {n.origin_ability_scores_name && (
                    <div className="bg-superficie rounded-xl px-3 py-2">
                      <p className="font-semibold text-texto">{n.origin_ability_scores_name}</p>
                      <p>{[n.origin_ability_scores_value_1, n.origin_ability_scores_value_2].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                  {n.origin_skill_proficiencies_name && (
                    <div className="bg-superficie rounded-xl px-3 py-2">
                      <p className="font-semibold text-texto">{n.origin_skill_proficiencies_name}</p>
                      <p>{n.origin_skill_proficiencies_value_1}</p>
                    </div>
                  )}
                  {n.origin_feat_name && (
                    <div className="bg-superficie rounded-xl px-3 py-2">
                      <p className="font-semibold text-texto">Rasgo</p>
                      <p>{n.origin_feat_name}</p>
                    </div>
                  )}
                </div>
                {n.origin_notes && <Dato etiqueta="Notas">{n.origin_notes}</Dato>}
              </div>
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

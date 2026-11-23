import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api'

export default function FeatsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [searchParams] = useSearchParams()
  const allowedTypes = (searchParams.get('type') ?? '')
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean)

  useEffect(() => {
    setLoading(true)
    apiFetch('/feats?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n => {
    const matchSearch = !search || n.feat_name?.toLowerCase().includes(search.toLowerCase())
    const matchType   = allowedTypes.length === 0 || allowedTypes.includes(n.feat_type?.toLowerCase())
    return matchSearch && matchType
  })

  return (
    <Pagina>
      <CabeceraPagina titulo="Rasgos" subtitulo={loading ? 'Cargando…' : `${filtered.length} rasgos`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar" />} />
      <ListaCatalogo cargando={loading} vacio="No se encontraron rasgos">
        {filtered.map(n => {
          const open = expandedId === n.feat_id
          return (
            <CeldaDesplegable key={n.feat_id} titulo={n.feat_name}
              subtitulo={[n.feat_type, n.feat_prerequisite && `Requiere: ${n.feat_prerequisite}`].filter(Boolean).join(' · ') || null}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.feat_id)}>
              <div className="space-y-1">
                {n.feat_benefits && <Dato etiqueta="Beneficios">{n.feat_benefits}</Dato>}
                {n.feat_ability_score_increase && <Dato etiqueta="Aumento de atributo">{n.feat_ability_score_increase}</Dato>}
                {n.feat_is_repeatable === 1 && <p className="text-ok font-semibold">✓ Repetible</p>}
                {n.feat_notes && <Dato etiqueta="Notas">{n.feat_notes}</Dato>}
              </div>
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

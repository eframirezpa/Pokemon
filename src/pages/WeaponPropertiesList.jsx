import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { apiFetch } from '../api'

export default function WeaponPropertiesList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/weapon-properties?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.weapon_property_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Pagina>
      <CabeceraPagina titulo="Propiedades de Arma" subtitulo={loading ? 'Cargando…' : `${filtered.length} propiedades`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar" />} />
      <ListaCatalogo cargando={loading} filas={6} vacio="No se encontraron propiedades">
        {filtered.map(n => {
          const open = expandedId === n.weapon_property_id
          return (
            <CeldaDesplegable key={n.weapon_property_id} titulo={n.weapon_property_name} subtitulo={n.weapon_property_description}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.weapon_property_id)}>
              {n.weapon_property_description && <p className="text-texto">{n.weapon_property_description}</p>}
              {n.weapon_property_notes && <Dato etiqueta="Notas" className="mt-1">{n.weapon_property_notes}</Dato>}
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

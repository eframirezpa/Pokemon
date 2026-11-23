import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { apiFetch } from '../api'

export default function NaturesList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/natures?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.nature_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Pagina>
      <CabeceraPagina titulo="Naturalezas" subtitulo={loading ? 'Cargando…' : `${filtered.length} naturalezas`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar" />} />
      <ListaCatalogo cargando={loading} vacio="No se encontraron naturalezas">
        {filtered.map(n => {
          const open = expandedId === n.nature_id
          return (
            <CeldaDesplegable key={n.nature_id} titulo={n.nature_name}
              subtitulo={(n.nature_effect_increase || n.nature_effect_decrease) && (
                <>
                  {n.nature_effect_increase && <span className="text-ok">▲ {n.nature_effect_increase}</span>}
                  {n.nature_effect_increase && n.nature_effect_decrease && '  '}
                  {n.nature_effect_decrease && <span className="text-peligro">▼ {n.nature_effect_decrease}</span>}
                </>
              )}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.nature_id)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {n.nature_d100 && <Dato etiqueta="D100">{n.nature_d100}</Dato>}
                <p><span className="font-semibold text-ok">Aumenta: </span>{n.nature_effect_increase} {n.nature_effect_increase_value && `(+${n.nature_effect_increase_value}%)`}</p>
                <p><span className="font-semibold text-peligro">Disminuye: </span>{n.nature_effect_decrease} {n.nature_effect_decrease_value && `(-${n.nature_effect_decrease_value}%)`}</p>
                {n.nature_notes && <Dato etiqueta="Notas" className="sm:col-span-2">{n.nature_notes}</Dato>}
              </div>
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

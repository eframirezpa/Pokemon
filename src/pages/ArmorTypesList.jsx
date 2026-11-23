import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { apiFetch } from '../api'

export default function ArmorTypesList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/armor-types?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.armor_type_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Pagina>
      <CabeceraPagina titulo="Tipos de Armadura" subtitulo={loading ? 'Cargando…' : `${filtered.length} tipos`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar" />} />
      <ListaCatalogo cargando={loading} vacio="No se encontraron armaduras">
        {filtered.map(n => {
          const open = expandedId === n.armor_type_id
          return (
            <CeldaDesplegable key={n.armor_type_id} titulo={n.armor_type_name} subtitulo={n.armor_type_category}
              valor={n.armor_type_ac_formula && <span className="font-mono text-[13px]">{n.armor_type_ac_formula}</span>}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.armor_type_id)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                {n.armor_type_dnd_equivalent && <Dato etiqueta="Equivalente D&D">{n.armor_type_dnd_equivalent}</Dato>}
                {n.armor_type_base_ac != null && <Dato etiqueta="AC base">{n.armor_type_base_ac}</Dato>}
                {n.armor_type_ac_bonus != null && <Dato etiqueta="Bono AC">{n.armor_type_ac_bonus}</Dato>}
                {n.armor_type_uses_dex_modifier === 1 && <p className="text-tinte font-medium">✓ Usa modificador DEX{n.armor_type_max_dex_modifier != null ? ` (máx. ${n.armor_type_max_dex_modifier})` : ''}</p>}
              </div>
              {n.armor_type_concept && <Dato etiqueta="Concepto" className="mt-2">{n.armor_type_concept}</Dato>}
              {n.armor_type_description && <p className="mt-1 text-texto">{n.armor_type_description}</p>}
              {n.armor_type_notes && <Dato etiqueta="Notas" className="mt-1">{n.armor_type_notes}</Dato>}
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

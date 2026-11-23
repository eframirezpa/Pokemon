import { useState, useEffect } from 'react'
import { CabeceraPagina, Buscador, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { apiFetch } from '../api'

export default function WeaponTypesList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/weapon-types?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(n =>
    !search || n.weapon_type_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Pagina>
      <CabeceraPagina titulo="Tipos de Arma" subtitulo={loading ? 'Cargando…' : `${filtered.length} tipos`}
        accion={<Buscador valor={search} onChange={setSearch} placeholder="Buscar" etiqueta="Buscar" />} />
      <ListaCatalogo cargando={loading} vacio="No se encontraron armas">
        {filtered.map(n => {
          const open = expandedId === n.weapon_type_id
          const etiquetas = [n.weapon_type_is_simple === 1 && 'Simple', n.weapon_type_is_martial === 1 && 'Marcial',
                             n.weapon_type_is_melee === 1 && 'Cuerpo a cuerpo', n.weapon_type_is_ranged === 1 && 'A distancia',
                             n.weapon_type_is_firearm === 1 && 'Arma de fuego'].filter(Boolean)
          return (
            <CeldaDesplegable key={n.weapon_type_id} titulo={n.weapon_type_name}
              subtitulo={[etiquetas.join(' · '), n.weapon_type_range].filter(Boolean).join(' — ') || null}
              valor={(n.weapon_type_damage_dice || n.weapon_type_damage_type) &&
                <span className="font-mono text-[13px]">{[n.weapon_type_damage_dice, n.weapon_type_damage_type].filter(Boolean).join(' ')}</span>}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.weapon_type_id)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                {n.weapon_type_dnd_category && <Dato etiqueta="Categoría D&D">{n.weapon_type_dnd_category}</Dato>}
                {n.weapon_type_damage && <Dato etiqueta="Daño">{n.weapon_type_damage}</Dato>}
                {n.weapon_type_damage_dice && <Dato etiqueta="Dados">{n.weapon_type_damage_dice}</Dato>}
                {n.weapon_type_damage_type && <Dato etiqueta="Tipo daño">{n.weapon_type_damage_type}</Dato>}
                {n.weapon_type_weight && <Dato etiqueta="Peso">{n.weapon_type_weight} {n.weapon_type_weight_lb && `(${n.weapon_type_weight_lb} lb)`}</Dato>}
                {n.weapon_type_hand_use && <Dato etiqueta="Uso">{n.weapon_type_hand_use}</Dato>}
                {n.weapon_type_range && <Dato etiqueta="Rango">{n.weapon_type_range}</Dato>}
              </div>
              {n.weapon_type_concept && <Dato etiqueta="Concepto" className="mt-2">{n.weapon_type_concept}</Dato>}
              {n.weapon_type_description && <p className="mt-1 text-texto">{n.weapon_type_description}</p>}
              {n.weapon_type_notes && <Dato etiqueta="Notas" className="mt-1">{n.weapon_type_notes}</Dato>}
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

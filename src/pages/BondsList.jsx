import { useState, useEffect } from 'react'
import { CabeceraPagina, Pagina, ListaCatalogo } from '../components/ui/Pagina'
import { CeldaDesplegable, Dato } from '../components/ui/ListaAgrupada'
import { apiFetch } from '../api'

export default function BondsList() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    apiFetch('/bonds?limit=200')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Pagina>
      <CabeceraPagina titulo="Vínculos" subtitulo={loading ? 'Cargando…' : `${items.length} vínculos`} />
      <ListaCatalogo cargando={loading} filas={6} vacio="No hay vínculos">
        {items.map(n => {
          const open = expandedId === n.bond_id
          return (
            <CeldaDesplegable key={n.bond_id} titulo={n.bond_name}
              subtitulo={n.bond_points != null ? `${n.bond_points} puntos` : null}
              icono={<span className="min-w-8 h-8 px-1.5 rounded-lg bg-tinte/12 text-tinte font-bold text-[15px] grid place-items-center tabular-nums">{n.bond_level}</span>}
              abierta={open} onToggle={() => setExpandedId(open ? null : n.bond_id)}>
              <div className="space-y-1.5">
                {n.bond_description && <p className="text-texto">{n.bond_description}</p>}
                {n.bond_mechanical_effect && <Dato etiqueta="Efecto mecánico">{n.bond_mechanical_effect}</Dato>}
                {n.bond_command_roll_required && (
                  <div>
                    <p className="font-semibold text-texto">Tirada de comando requerida</p>
                    {n.bond_command_failure_threshold && <Dato etiqueta="Umbral de fallo">{n.bond_command_failure_threshold}</Dato>}
                    {n.bond_command_failure_effect && <Dato etiqueta="Efecto de fallo">{n.bond_command_failure_effect}</Dato>}
                  </div>
                )}
                {n.bond_notes && <Dato etiqueta="Notas">{n.bond_notes}</Dato>}
              </div>
            </CeldaDesplegable>
          )
        })}
      </ListaCatalogo>
    </Pagina>
  )
}

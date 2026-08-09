import { useState, useEffect } from 'react'
import { getEffectivenessRows, effectivenessByIds, effectivenessByNames, typeNamesByIds } from '../lib/typeEffect'

const TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850', Electric:'#F8D030',
  Ice:'#98D8D8', Fighting:'#C03028', Poison:'#A040A0', Ground:'#E0C068', Flying:'#A890F0',
  Psychic:'#F85888', Bug:'#A8B820', Rock:'#B8A038', Ghost:'#705898', Dragon:'#7038F8',
  Dark:'#705848', Steel:'#B8B8D0', Fairy:'#EE99AC', Typeless:'#9CA3AF',
}

function TypeChip({ type }) {
  return (
    <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5"
      style={{ backgroundColor: TYPE_COLORS[type] || '#9CA3AF' }}>{type}</span>
  )
}

function Line({ label, color, types }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`text-[10px] font-black uppercase tracking-wide shrink-0 w-24 pt-0.5 ${color}`}>{label}</span>
      <div className="flex flex-wrap gap-1">
        {types.length === 0 ? <span className="text-[11px] text-gray-400 italic">—</span>
          : types.map(t => <TypeChip key={t} type={t} />)}
      </div>
    </div>
  )
}

/* Muestra resistencias / vulnerabilidades / inmunidades de un Pokémon.
   Acepta ids (personaje_pokemon_type_1/_2) o nombres (pokemon_type_1/_2). */
export default function TypeEffectivenessView({ typeId1, typeId2, typeName1, typeName2, dark = false, title = 'Efectividad de tipo', showTypes = false }) {
  const [te, setTe] = useState(null)
  useEffect(() => { getEffectivenessRows().then(setTe) }, [])

  const eff = te
    ? (typeId1 != null || typeId2 != null
        ? effectivenessByIds(te, typeId1, typeId2)
        : effectivenessByNames(te, typeName1, typeName2))
    : { resist: [], vuln: [], immune: [] }

  const labelCls = dark ? 'text-gray-400' : 'text-gray-500'

  // Los tipos propios del Pokémon. Los nombres salen de las mismas filas ya
  // cargadas cuando llegan ids, así que no hay una consulta extra.
  const tipos = showTypes
    ? (typeId1 != null || typeId2 != null
        ? typeNamesByIds(te, typeId1, typeId2)
        : [typeName1, typeName2].filter(Boolean))
    : []

  return (
    <div>
      <p className={`text-[11px] font-black uppercase tracking-widest mb-1.5 ${labelCls}`}>{title}</p>
      <div className="space-y-1.5">
        {showTypes && (
          <Line label="Tipo" color={dark ? 'text-gray-300' : 'text-gray-700'} types={tipos} />
        )}
        <Line label="Resiste"    color="text-green-600"  types={eff.resist} />
        <Line label="Vulnerable" color="text-red-600"    types={eff.vuln} />
        <Line label="Inmune"     color="text-indigo-500" types={eff.immune} />
      </div>
    </div>
  )
}

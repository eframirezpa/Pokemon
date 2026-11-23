import { ShoppingBag, Leaf, Star, BookOpen, Map, Heart, Shield, Tag, BookMarked, Swords, Sword, Award, Route } from 'lucide-react'

// Secciones de consulta. Las usan la barra lateral (Layout) y el inicio, así
// que un catálogo nuevo se agrega aquí una sola vez.
export const SECCIONES = [
  {
    titulo: 'Trainer',
    enlaces: [
      { to: '/armor-types',                 label: 'Armaduras',         Icon: Shield,     desc: 'Tipos de protección y AC' },
      { to: '/backgrounds',                 label: 'Trasfondos',        Icon: BookOpen,   desc: 'Historias y habilidades de origen' },
      { to: '/feats?type=origin%2Cgeneral', label: 'Rasgos',            Icon: Star,       desc: 'Rasgos de origen y generales' },
      { to: '/origins',                     label: 'Orígenes',          Icon: Map,        desc: 'Lugar de procedencia del entrenador' },
      { to: '/specializations',             label: 'Especializaciones', Icon: Award,      desc: 'Afinidad con un tipo de Pokémon' },
      { to: '/paths',                       label: 'Rutas',             Icon: Route,      desc: 'Camino del entrenador y sus rasgos' },
      { to: '/weapon-types',                label: 'Tipos de Arma',     Icon: Sword,      desc: 'Categorías de armas y su daño' },
      { to: '/weapon-properties',           label: 'Prop. de Arma',     Icon: Tag,        desc: 'Propiedades especiales de armas' },
      { to: '/bonds',                       label: 'Vínculos',          Icon: Heart,      desc: 'Niveles de lealtad con Pokémon' },
    ],
  },
  {
    titulo: 'Pokémon',
    enlaces: [
      { to: '/pokemon',            label: 'Pokédex',     Icon: BookMarked, desc: '1,139 criaturas con stats D&D 5e' },
      { to: '/feats?type=pokemon', label: 'Rasgos',      Icon: Star,       desc: 'Rasgos exclusivos de Pokémon' },
      { to: '/natures',            label: 'Naturalezas', Icon: Leaf,       desc: 'Personalidad y afinidades de combate' },
      { to: '/moves',              label: 'Movimientos', Icon: Swords,     desc: 'Ataques y habilidades de combate' },
    ],
  },
  {
    titulo: 'Items',
    enlaces: [
      { to: '/items', label: 'Items', Icon: ShoppingBag, desc: 'Objetos, pociones y equipamiento' },
    ],
  },
]

// ¿El enlace `to` corresponde a la dirección actual? Los rasgos comparten
// ruta y se distinguen por la consulta (?type=…), así que un enlace con
// consulta solo cuenta si coincide entera; uno sin consulta cuenta también
// para sus subrutas (/pokemon/25 marca la Pokédex).
export function enlaceActivo(to, { pathname, search }) {
  const [ruta, consulta = ''] = to.split('?')
  if (consulta) return pathname === ruta && search.replace(/^\?/, '') === consulta
  return pathname === ruta || pathname.startsWith(`${ruta}/`)
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, LogIn, Leaf, Star, BookOpen, Map, Heart, Shield, Tag, BookMarked, Swords } from 'lucide-react'
import LoginModal from '../components/LoginModal'

const SECTIONS = [
  {
    title: 'Trainer',
    cards: [
      { to: '/armor-types',                  label: 'Armaduras',       Icon: Shield,    desc: 'Tipos de protección y CA'              },
      { to: '/backgrounds',                  label: 'Trasfondos',      Icon: BookOpen,  desc: 'Historias y habilidades de origen'     },
      { to: '/feats?type=origin%2Cgeneral',  label: 'Rasgos',          Icon: Star,      desc: 'Rasgos de origen y generales'          },
      { to: '/origins',                      label: 'Orígenes',        Icon: Map,       desc: 'Lugar de procedencia del entrenador'   },
      { to: '/weapon-properties',            label: 'Prop. de Arma',   Icon: Tag,       desc: 'Propiedades especiales de armas'       },
      { to: '/bonds',                        label: 'Vínculos',        Icon: Heart,     desc: 'Niveles de lealtad con Pokémon'        },
    ],
  },
  {
    title: 'Pokémon',
    cards: [
      { to: '/pokemon',                  label: 'Pokédex',         Icon: BookMarked, desc: '1,139 criaturas con stats D&D 5e'     },
      { to: '/feats?type=pokemon',       label: 'Rasgos',          Icon: Star,       desc: 'Rasgos exclusivos de Pokémon'          },
      { to: '/natures',                  label: 'Naturalezas',     Icon: Leaf,       desc: 'Personalidad y afinidades de combate'  },
      { to: '/moves',                    label: 'Movimientos',     Icon: Swords,     desc: 'Ataques y habilidades de combate'      },
    ],
  },
  {
    title: 'Items',
    cards: [
      { to: '/items', label: 'Items', Icon: ShoppingBag, desc: 'Objetos, pociones y equipamiento' },
    ],
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div className="flex flex-col items-center px-6 py-10 gap-8 max-w-2xl mx-auto w-full">

      <div className="w-full flex justify-end">
        <button
          onClick={() => setLoginOpen(true)}
          className="flex items-center gap-2 bg-gray-900 hover:bg-red-600 text-white
                     px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                     shadow-sm hover:shadow-md"
        >
          <LogIn size={16} />
          Iniciar Sesión
        </button>
      </div>

      {SECTIONS.map(({ title, cards }) => (
        <section key={title} className="w-full">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cards.map(({ to, label, Icon, desc }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="group flex flex-col items-center gap-2 bg-white border border-gray-200
                           rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-red-300
                           hover:-translate-y-0.5 transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 bg-red-50 group-hover:bg-red-100 rounded-xl
                                flex items-center justify-center transition-colors">
                  <Icon size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  )
}

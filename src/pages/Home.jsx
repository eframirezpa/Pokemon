import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, LogIn, Leaf, Star, BookOpen, Map, Heart, Shield, Tag, BookMarked, Swords, Sword, ChevronDown, Zap, Clock } from 'lucide-react'
import LoginModal from '../components/LoginModal'

function PokeballIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="white" stroke="currentColor" strokeWidth="2" />
      <path d="M2 12a10 10 0 0 1 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const SECTIONS = [
  {
    title: 'Trainer',
    Icon: PokeballIcon,
    cards: [
      { to: '/armor-types',                  label: 'Armaduras',       Icon: Shield,    desc: 'Tipos de protección y CA'              },
      { to: '/backgrounds',                  label: 'Trasfondos',      Icon: BookOpen,  desc: 'Historias y habilidades de origen'     },
      { to: '/feats?type=origin%2Cgeneral',  label: 'Rasgos',          Icon: Star,      desc: 'Rasgos de origen y generales'          },
      { to: '/origins',                      label: 'Orígenes',        Icon: Map,       desc: 'Lugar de procedencia del entrenador'   },
      { to: '/weapon-types',                 label: 'Tipos de Arma',   Icon: Sword,     desc: 'Categorías de armas y su daño'         },
      { to: '/weapon-properties',            label: 'Prop. de Arma',   Icon: Tag,       desc: 'Propiedades especiales de armas'       },
      { to: '/bonds',                        label: 'Vínculos',        Icon: Heart,     desc: 'Niveles de lealtad con Pokémon'        },
    ],
  },
  {
    title: 'Pokémon',
    Icon: Zap,
    cards: [
      { to: '/pokemon',                  label: 'Pokédex',         Icon: BookMarked, desc: '1,139 criaturas con stats D&D 5e'     },
      { to: '/feats?type=pokemon',       label: 'Rasgos',          Icon: Star,       desc: 'Rasgos exclusivos de Pokémon'          },
      { to: '/natures',                  label: 'Naturalezas',     Icon: Leaf,       desc: 'Personalidad y afinidades de combate'  },
      { to: '/moves',                    label: 'Movimientos',     Icon: Swords,     desc: 'Ataques y habilidades de combate'      },
    ],
  },
  {
    title: 'Items',
    Icon: Clock,
    cards: [
      { to: '/items', label: 'Items', Icon: ShoppingBag, desc: 'Objetos, pociones y equipamiento' },
    ],
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [loginOpen, setLoginOpen] = useState(false)
  const [openSection, setOpenSection] = useState(null)

  const toggle = (title) => setOpenSection(prev => prev === title ? null : title)

  return (
    <div className="flex flex-col items-center px-6 py-10 gap-4 max-w-2xl mx-auto w-full">

      <div className="w-full flex justify-end mb-2">
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

      <div className="w-full flex flex-col gap-2">
        {SECTIONS.map(({ title, Icon, cards }) => {
          const isOpen = openSection === title
          return (
            <div key={title} className="w-full border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => toggle(title)}
                className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors
                  ${isOpen ? 'bg-red-600 text-white' : 'bg-white text-gray-800 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={isOpen ? 'text-white' : 'text-red-500'} />
                  <span className="font-semibold text-base">{title}</span>
                </div>
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-gray-400'}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cards.map(({ to, label, Icon, desc }) => (
                      <button
                        key={to}
                        onClick={() => navigate(to)}
                        className="group flex flex-col items-center gap-2 bg-gray-50 border border-gray-200
                                   rounded-2xl p-4 hover:shadow-md hover:border-red-300
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
                </div>
              )}
            </div>
          )
        })}
      </div>

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  )
}

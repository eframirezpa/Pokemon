import { useNavigate } from 'react-router-dom'
import { Swords, ShoppingBag, Home } from 'lucide-react'

const CARDS = [
  { to: '/',        label: 'Inicio',   Icon: Home,         desc: 'Página principal'                   },
  { to: '/pokemon', label: 'Pokémon',  Icon: Swords,       desc: '1,139 criaturas con stats D&D 5e'  },
  { to: '/items',   label: 'Items',    Icon: ShoppingBag,  desc: 'Objetos, pociones y equipamiento'   },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] lg:min-h-[calc(100vh-73px)] px-6 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
        {CARDS.map(({ to, label, Icon, desc }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="group flex flex-col items-center gap-3 bg-white border border-gray-200
                       rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-red-300
                       hover:-translate-y-0.5 transition-all duration-200 text-left"
          >
            <div className="w-12 h-12 bg-red-50 group-hover:bg-red-100 rounded-xl
                            flex items-center justify-center transition-colors">
              <Icon size={24} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-base">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

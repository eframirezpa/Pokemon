import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Swords, ShoppingBag } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/pokemon', label: 'Pokémon', Icon: Swords      },
  { to: '/items',   label: 'Items',   Icon: ShoppingBag },
]

function PokeballIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export default function Layout() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-gray-900 shadow-md">
          <div className="flex items-center gap-4 px-4 lg:px-8 py-3">
            {/* Brand */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
            >
              <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-white">
                <PokeballIcon />
              </div>
              <span className="font-bold text-white text-base">
                Pokemon <span className="text-red-400">DnD</span>
              </span>
            </button>

            {/* Nav links */}
            <nav className="flex items-center gap-1 ml-4">
              {NAV_ITEMS.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700/60 hover:text-white'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 text-center text-xs py-4">
        Creado por <span className="text-gray-200">Efrain Ramirez</span> &amp; <span className="text-gray-200">Gustavo Quintero</span>
      </footer>

    </div>
  )
}

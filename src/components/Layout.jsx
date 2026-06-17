import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Swords, ShoppingBag } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/pokemon', label: 'Pokémon',  Icon: Swords      },
  { to: '/items',   label: 'Items',    Icon: ShoppingBag },
]

function PokeballIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M9 12a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="0" fill="currentColor" opacity="0.15" />
    </svg>
  )
}

function SidebarContent({ onNavClick, onBrandClick }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-700/60">
        <button onClick={onBrandClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white">
            <PokeballIcon />
          </div>
          <span className="font-bold text-lg text-white tracking-wide">
            Pokemon <span className="text-red-400">DnD</span>
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'text-gray-400 hover:bg-gray-700/60 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-700/60 text-center">
        <p className="text-gray-500 text-xs leading-relaxed">
          Creado por<br />
          <span className="text-gray-400">Efrain Ramirez</span>
          {' & '}
          <span className="text-gray-400">Gustavo Quintero</span>
        </p>
      </div>
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const closeSidebar = () => setSidebarOpen(false)
  const goHome       = () => { navigate('/'); closeSidebar() }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar (oculto en home) ── */}
      {!isHome && (
        <aside
          className={`
            fixed top-0 left-0 h-full w-64 bg-gray-900 z-30 flex flex-col
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:static lg:z-auto
          `}
        >
          <SidebarContent onNavClick={closeSidebar} onBrandClick={goHome} />
        </aside>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar (oculto en home) */}
        {!isHome && (
          <header className="lg:hidden sticky top-0 z-10 bg-gray-900 px-4 py-3 flex items-center gap-3 shadow-md">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white p-1 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <button onClick={goHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white">
                <PokeballIcon />
              </div>
              <span className="font-bold text-white text-base">
                Pokemon <span className="text-red-400">DnD</span>
              </span>
            </button>
          </header>
        )}

        {/* Page header */}
        <div className="hidden lg:flex items-center px-8 py-5 border-b border-gray-200 bg-white">
          <button onClick={goHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center text-white">
              <PokeballIcon />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-extrabold text-gray-900 leading-none">
                Pokemon <span className="text-red-600">DnD</span>
              </h1>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Referencia para D&amp;D 5e</p>
            </div>
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

    </div>
  )
}

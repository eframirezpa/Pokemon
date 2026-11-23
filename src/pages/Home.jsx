import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Gamepad2 } from 'lucide-react'
import LoginModal from '../components/LoginModal'
import { AVISO_SESION } from '../api'
import NotasParche, { BotonParche } from '../components/NotasParche'
import { useAuth } from '../context/AuthContext'
import { SECCIONES } from '../lib/navegacion'
import { ListaAgrupada, Celda } from '../components/ui/ListaAgrupada'
import { Pagina } from '../components/ui/Pagina'

// Icono de la sección en un cuadro morado claro
function IconoCelda({ Icon }) {
  return (
    <span className="w-7 h-7 rounded-lg bg-tinte/12 text-tinte grid place-items-center">
      <Icon size={16} aria-hidden />
    </span>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // Si la sesión venció, apiFetch nos trajo aquí: se abre el login y se explica
  // por qué, en vez de dejar al usuario adivinando por qué lo sacaron.
  const [expirada] = useState(() => {
    const hay = sessionStorage.getItem(AVISO_SESION) === '1'
    if (hay) sessionStorage.removeItem(AVISO_SESION)   // solo se avisa una vez
    return hay
  })
  const [loginOpen, setLoginOpen] = useState(expirada)

  return (
    <Pagina>
      {/* Banda morada con el nombre, el parche y el acceso */}
      <section className="relative overflow-hidden rounded-tarjeta bg-acento text-white px-6 py-6 sm:px-7 sm:py-7">
        {/* Pokébola de fondo, decorativa */}
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 w-[300px] h-[300px] rounded-full border-[30px] border-white/[.14]" />
        <span aria-hidden className="pointer-events-none absolute -right-16 top-[55px] w-[300px] h-[30px] bg-white/[.14]" />

        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[30px] sm:text-[34px] leading-[1.05] font-bold tracking-[-.022em]">Pokemon DnD</h1>
            <p className="mt-1.5 text-[15px] text-[#F0DCFA] flex flex-wrap items-center gap-x-1.5">
              <span>Consulta de reglas, Pokédex y partidas</span>
              <span aria-hidden>·</span>
              <BotonParche variante="banda" />
            </p>
          </div>
          {user ? (
            <button type="button" onClick={() => navigate(`/dashboard/${user.role}`)}
              className="self-start sm:self-auto inline-flex items-center gap-2 h-10 px-5 rounded-full bg-white text-acento text-[15px] font-semibold hover:bg-white/90 transition-colors">
              <Gamepad2 size={17} /> Mis partidas
            </button>
          ) : (
            <button type="button" onClick={() => setLoginOpen(true)}
              className="self-start sm:self-auto inline-flex items-center gap-2 h-10 px-5 rounded-full bg-white text-acento text-[15px] font-semibold hover:bg-white/90 transition-colors">
              <LogIn size={17} /> Iniciar sesión
            </button>
          )}
        </div>
      </section>

      {/* Las tres secciones de consulta */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 items-start">
        {SECCIONES.map(({ titulo, enlaces }) => (
          <ListaAgrupada key={titulo} titulo={titulo}>
            {enlaces.map(({ to, label, Icon, desc }) => (
              <Celda key={to} icono={<IconoCelda Icon={Icon} />} titulo={label} subtitulo={desc}
                chevron onClick={() => navigate(to)} className="min-h-[52px]" />
            ))}
          </ListaAgrupada>
        ))}
      </div>

      <NotasParche />

      {loginOpen && <LoginModal aviso={expirada ? 'Tu sesión expiró. Vuelve a entrar para continuar.' : null}
        onClose={() => setLoginOpen(false)} />}
    </Pagina>
  )
}

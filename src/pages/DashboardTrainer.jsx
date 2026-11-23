import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCircle, Lock, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api'
import PartidaPresentacion from '../components/PartidaPresentacion'
import AvatarSelector from '../components/AvatarSelector'
import { Pagina, CabeceraPagina, Vacio } from '../components/ui/Pagina'
import Boton from '../components/ui/Boton'

export default function DashboardTrainer() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [partidas, setPartidas]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [presentacion, setPresentacion]   = useState(null)
  const [showAvatar, setShowAvatar]       = useState(false)

  const hasAvatar = !!user?.avatar_id

  useEffect(() => {
    apiFetch('/partida/mis-partidas')
      .then(r => r.json())
      .then(d => setPartidas(Array.isArray(d) ? d : []))
      .catch(() => setPartidas([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (partida) => {
    if (!hasAvatar) return
    setPresentacion(partida)
  }

  const handleFinishPresentacion = () => {
    const p = presentacion
    setPresentacion(null)
    navigate(`/partida-lobby/${p.id_partida}`, { state: { nombre: p.nombre_partida } })
  }

  // ── Presentación ─────────────────────────────────────────────────────────
  if (presentacion) {
    return (
      <PartidaPresentacion
        partida={presentacion}
        onFinish={handleFinishPresentacion}
      />
    )
  }

  // ── Lista de partidas ────────────────────────────────────────────────────
  return (
    <Pagina className="max-w-3xl">
      <CabeceraPagina titulo="Mis partidas"
        subtitulo={<>Bienvenido, <span className="font-semibold text-texto">{user?.user_name}</span></>}
        accion={
          <Boton variante={hasAvatar ? 'tintado' : 'relleno'} onClick={() => setShowAvatar(true)} className="self-start sm:self-auto">
            {hasAvatar
              ? <><img src={user.avatar_face_url} alt="" className="w-6 h-6 -ml-2 rounded-full object-cover" /> Cambiar avatar</>
              : <><UserCircle size={16} /> Elegir avatar</>}
          </Boton>
        } />

      {/* Aviso si no tiene avatar: sin él no se entra a ninguna partida */}
      {!hasAvatar && (
        <div className="flex items-start gap-3 bg-superficie rounded-grupo px-4 py-3.5">
          <span className="w-8 h-8 rounded-lg bg-tinte/12 text-tinte grid place-items-center shrink-0"><Lock size={16} /></span>
          <div>
            <p className="font-semibold text-[15px]">Elige un avatar para continuar</p>
            <p className="text-[13px] text-texto-2 leading-snug mt-0.5">
              Debes elegir tu avatar antes de poder entrar a una partida.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map(i => <div key={i} className="h-[104px] rounded-[20px] bg-relleno animate-pulse" />)}
        </div>
      ) : partidas.length === 0 ? (
        <Vacio titulo="Sin partidas asignadas"
          detalle="Ahora mismo no estás en ninguna partida activa. Pídele a tu Master que te agregue a una." />
      ) : (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[13px] font-semibold text-texto-2 uppercase tracking-[.03em] px-4">Elige tu partida</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {partidas.map((p, i) => (
              <button key={p.id_partida} type="button" onClick={() => handleSelect(p)} disabled={!hasAvatar}
                className="group text-left bg-superficie rounded-[20px] p-4 flex items-start gap-3.5 transition-all
                           enabled:hover:shadow-[0_8px_24px_rgba(0,0,0,.08)] enabled:hover:-translate-y-0.5
                           disabled:opacity-50 disabled:cursor-not-allowed
                           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte">
                <span className="w-10 h-10 rounded-xl bg-acento text-white text-lg font-bold grid place-items-center shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold tracking-[-.02em] group-enabled:group-hover:text-tinte transition-colors">
                    {p.nombre_partida}
                  </span>
                  {p.descripcion_partida && (
                    <span className="block text-[13px] text-texto-2 mt-1 line-clamp-2 leading-snug">{p.descripcion_partida}</span>
                  )}
                </span>
                {hasAvatar
                  ? <ChevronRight size={18} className="text-texto-2 opacity-60 shrink-0 mt-2.5" aria-hidden />
                  : <Lock size={15} className="text-texto-2 shrink-0 mt-2.5" aria-hidden />}
              </button>
            ))}
          </div>
        </section>
      )}

      {showAvatar && <AvatarSelector onClose={() => setShowAvatar(false)} />}
    </Pagina>
  )
}

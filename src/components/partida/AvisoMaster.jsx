import { useEffect, useState } from 'react'

const DURACION_MS = 20000

// Mensaje del master en la sala de los jugadores. Sustituye a la barra superior:
// en reposo solo se ve el icono del master arriba a la izquierda; cuando llega
// un mensaje nuevo se despliega el texto 20 segundos y vuelve a ser icono.
// Tocar el icono vuelve a mostrar el último mensaje (otros 20 segundos), y
// tocar el aviso abierto lo pliega antes.
//
// El mensaje con el que se entra a la sala no se despliega solo: es el que ya
// había, no uno que acabe de llegar.
export default function AvisoMaster({ mensaje, avatar }) {
  const [ultimo, setUltimo]   = useState(mensaje)
  const [abierto, setAbierto] = useState(false)
  // Abrir cuando cambia el mensaje (ajuste durante el render, sin efecto)
  const [vez, setVez] = useState(0)
  if (mensaje !== ultimo) {
    setUltimo(mensaje)
    setAbierto(true)
    setVez(v => v + 1)
  }

  // Plegar a los 20 s. `vez` reinicia la cuenta si llega otro mensaje con el
  // aviso ya abierto.
  useEffect(() => {
    if (!abierto) return
    const t = setTimeout(() => setAbierto(false), DURACION_MS)
    return () => clearTimeout(t)
  }, [abierto, vez])

  const hayTexto = !!(mensaje && String(mensaje).trim())

  return (
    <button type="button"
      onClick={() => { if (abierto) setAbierto(false); else if (hayTexto) { setAbierto(true); setVez(v => v + 1) } }}
      aria-expanded={abierto}
      title={abierto ? 'Plegar el mensaje' : 'Ver el último mensaje del master'}
      className={`modo-oscuro cristal fixed left-3 top-3 z-[47] flex items-center text-left text-texto
                  transition-[max-width,border-radius,padding] duration-300 ease-out overflow-hidden
                  ${abierto
                    ? 'gap-2.5 rounded-[20px] py-1.5 pl-1.5 pr-4 max-w-[min(30rem,calc(100vw-7.5rem))]'
                    : 'rounded-full p-1 max-w-[52px]'}`}>
      <img src={avatar} alt="Master"
        className="w-9 h-9 rounded-full object-cover shrink-0 bg-relleno" />
      {abierto && (
        <span className="min-w-0 leading-snug animate-velo">
          <small className="block text-[11px] font-semibold uppercase tracking-[.06em] text-tinte">Master</small>
          <span className="block text-[13px] text-[#EBEBF5] line-clamp-3">{mensaje}</span>
        </span>
      )}
    </button>
  )
}

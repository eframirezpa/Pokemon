import { useState } from 'react'
import { SkipForward, ChevronRight } from 'lucide-react'
import { API_BASE_URL } from '../api'

function spriteUrl(src) {
  if (!src) return null
  return src.startsWith('http') ? src : `${API_BASE_URL}${src}`
}

export default function PartidaPresentacion({ partida, onFinish }) {
  const slides = [
    { titulo: partida.titulo1_partida, leyenda: partida.leyenda1_partida, sprite: partida.sprite1_partida },
    { titulo: partida.titulo2_partida, leyenda: partida.leyenda2_partida, sprite: partida.sprite2_partida },
    { titulo: partida.titulo3_partida, leyenda: partida.leyenda3_partida, sprite: partida.sprite3_partida },
  ]

  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  const goTo = (next) => {
    setVisible(false)
    setTimeout(() => {
      if (next >= slides.length) { onFinish(); return }
      setCurrent(next)
      setVisible(true)
    }, 400)
  }

  const slide = slides[current]
  const url   = spriteUrl(slide.sprite)

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">

      {/* Imagen de fondo a 100% */}
      <div className={`absolute inset-0 transition-opacity duration-400 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {url && (
          <img
            src={url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        {/* Gradiente para legibilidad del texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
      </div>

      {/* Skip — arriba derecha */}
      <button
        onClick={onFinish}
        className="absolute top-5 right-5 z-10 flex items-center gap-1.5 text-white/70
                   hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10
                   backdrop-blur-sm transition-all"
      >
        <SkipForward size={15} /> Skip
      </button>

      {/* Texto + controles — sobre la imagen, parte inferior */}
      <div className={`absolute inset-x-0 bottom-0 z-10 px-8 pb-10 flex flex-col items-center gap-4
        text-center transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        <div className="space-y-2 max-w-lg">
          <h2 className="text-3xl font-bold text-white drop-shadow-lg">{slide.titulo}</h2>
          <p className="text-gray-200 text-base leading-relaxed drop-shadow">{slide.leyenda}</p>
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300
              ${i === current ? 'w-6 bg-red-500' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>

        {/* Botón */}
        <button
          onClick={() => goTo(current + 1)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white
                     px-8 py-3 rounded-xl font-medium transition-colors shadow-lg"
        >
          {current < slides.length - 1
            ? <><ChevronRight size={18} /> Siguiente</>
            : <>Entrar a la partida</>
          }
        </button>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { SkipForward, Volume2, VolumeX } from 'lucide-react'

// Intro de la partida: una secuencia de etapas encadenadas con fundido a negro.
//
// PROTOTIPO LOCAL. Los archivos viven en public/Videos/ y están fuera de git a
// propósito (ver .gitignore): public/ se copia entera a dist/, así que
// commitearlos los desplegaría. Quien monta este componente lo hace solo en
// desarrollo, por eso aquí no hay comprobación de entorno: la decisión está en
// PartidaPresentacion.
//
// ── EL ORDEN SE CAMBIA AQUÍ ────────────────────────────────────────────────
// Cada etapa es 'video' o 'imagen' y se reproducen de arriba abajo. Reordenar
// es mover una línea; añadir un clip, escribir una. Un video dura lo que dura;
// una imagen, lo que diga su `duracion`.
//
// El texto va por código y no quemado en el archivo: se corrige sin volver a
// exportar desde CapCut.
//
// Etiquetas libres para los clips que faltan:
//   'Sé astuto'  ·  'Sé leal'  ·  'Sé implacable'
const ETAPAS = [
  { tipo: 'video',  src: '/Videos/Rave.mp4',      texto: 'Sé fuerte' },
  {
    tipo: 'imagen', src: '/Videos/Opening.png',
    duracion: 5000,
    linea1: 'Vastara no pregunta quién eres.',
    linea2: 'Pregunta quién serás.',
  },
  { tipo: 'video',  src: '/Videos/KAIA.mp4',      texto: 'Sé veloz'  },
  { tipo: 'video',  src: '/Videos/USNavy.mp4',    texto: 'Sé audaz'  },
]

// Tiempos en milisegundos
const ENTRADA_IMAGEN  = 600    // la lámina aparece
const ENTRADA_TEXTO   = 1200   // su texto entra después, sobre la imagen ya visible
const FUNDIDO = 400            // el mismo que PartidaPresentacion usa entre diapositivas

export default function IntroVideos({ onFinish }) {
  const [i, setI] = useState(0)
  const [visible, setVisible] = useState(false)
  const [textoVisible, setTextoVisible] = useState(false)
  // Una misma etapa puede cerrarse por el temporizador y por onEnded a la vez.
  // Va en un ref y no en estado: es un cerrojo, no algo que se pinte.
  const pasando = useRef(false)

  // Arranca en silencio porque los navegadores no dejan reproducir solo con
  // sonido; se activa con el botón. La preferencia se guarda para no tener que
  // pulsarlo en cada pase mientras se monta el intro.
  const [silencio, setSilencio] = useState(
    () => localStorage.getItem('intro_sonido') !== '1')
  const videoRef = useRef(null)

  const etapa = ETAPAS[i]
  const esImagen = etapa?.tipo === 'imagen'

  // React solo fija `muted` al montar el elemento, así que al cambiar de etapa
  // —o al pulsar el botón— hay que ponerlo a mano sobre el nodo.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = silencio
  }, [i, silencio])

  const alternarSonido = () => {
    const v = !silencio
    setSilencio(v)
    localStorage.setItem('intro_sonido', v ? '0' : '1')
    if (videoRef.current) {
      videoRef.current.muted = v
      // El clic es un gesto del usuario, así que aquí sí se permite sonar
      if (!v) videoRef.current.play().catch(() => {})
    }
  }

  const siguiente = () => {
    if (pasando.current) return
    pasando.current = true
    setVisible(false)
    setTextoVisible(false)
    setTimeout(() => {
      if (i + 1 >= ETAPAS.length) { onFinish(); return }
      setI(i + 1)
    }, FUNDIDO)
  }

  // Entrada de cada etapa: los setState van dentro de los temporizadores, no en
  // el cuerpo del efecto, que si no React encadena renders de más.
  useEffect(() => {
    pasando.current = false
    const t1 = setTimeout(() => setVisible(true), esImagen ? ENTRADA_IMAGEN : 30)
    const t2 = esImagen ? setTimeout(() => setTextoVisible(true), ENTRADA_TEXTO) : null
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2) }
  }, [i, esImagen])

  // Una imagen no termina sola como un video: la corta el reloj
  useEffect(() => {
    if (!esImagen) return
    const t = setTimeout(siguiente, etapa.duracion ?? 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, esImagen])

  if (!etapa) return null

  return (
    // Columna: el medio arriba ocupando lo que pueda, el texto debajo. Si el
    // texto fuese encima en absolute, con object-contain caería sobre el propio
    // fotograma y taparía a los personajes. Así siempre queda sobre negro.
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      {/* min-h-0 es lo que deja encoger a un hijo de flex; sin él el medio
          desborda y empuja el texto fuera de la pantalla. */}
      <div className="flex-1 min-h-0">
        {esImagen ? (
          <img
            key={etapa.src}
            src={etapa.src}
            alt=""
            onError={siguiente}
            className={`w-full h-full object-contain transition-opacity duration-700 ${
              visible ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <video
            ref={videoRef}
            key={etapa.src}
            src={etapa.src}
            autoPlay
            muted={silencio}   /* arranca mudo: es la única forma de autoplay */
            playsInline
            onEnded={siguiente}
            /* Si falta el archivo o el códec no va, se pasa a la siguiente en
               vez de dejar la pantalla en negro para siempre */
            onError={siguiente}
            className={`w-full h-full object-contain transition-opacity duration-400 ${
              visible ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>

      {/* Franja de texto: altura fija para que el medio no dé saltos al cambiar
          de etapa. Sobre negro, así que no necesita degradado ni sombras. */}
      <div className="shrink-0 h-32 sm:h-36 px-6 flex flex-col items-center justify-center text-center">
        {esImagen ? (
          <div className={`transition-all duration-700 ${
            textoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-xl sm:text-3xl font-bold text-white">{etapa.linea1}</p>
            <p className="mt-1 text-xl sm:text-3xl font-black text-red-500">{etapa.linea2}</p>
          </div>
        ) : etapa.texto ? (
          <h2 className={`text-3xl sm:text-5xl font-black text-white tracking-wide
            transition-all duration-400 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {etapa.texto}
          </h2>
        ) : null}

        {/* Puntos de progreso */}
        <div className="mt-4 flex gap-2">
          {ETAPAS.map((_, n) => (
            <div key={n} className={`h-1.5 rounded-full transition-all duration-300
              ${n === i ? 'w-6 bg-red-500' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      </div>

      {/* Sonido y Skip, arriba a la derecha */}
      <div className="absolute top-5 right-5 z-10 flex items-center gap-1">
        <button
          onClick={alternarSonido}
          title={silencio ? 'Activar sonido' : 'Silenciar'}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm
                     px-3 py-1.5 rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all"
        >
          {silencio ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span className="hidden sm:inline">{silencio ? 'Sonido' : 'Silencio'}</span>
        </button>
        <button
          onClick={onFinish}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm
                     px-3 py-1.5 rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all"
        >
          <SkipForward size={15} /> Skip
        </button>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { POKEBALL_SPRITE } from '../lib/partidaShared'
import { ladoTalla } from '../lib/tallas'

// Tiempos de la secuencia, en ms
const LANZAR = 700     // la pokébola vuela hasta el Pokémon
const ABSORBER = 600   // se abre y lo absorbe en un destello
const CAER = 450       // cae al suelo
const SACUDIDA = 2000  // cada balanceo, con su pausa (lento, para el drama)
const FINAL = 2400     // el desenlace en pantalla
// Siempre tres sacudidas, atrape o no: el número no adelanta el resultado
const SACUDIDAS = 3

const SILUETA_BLANCA = { filter: 'brightness(0) invert(1) drop-shadow(0 0 18px rgba(255,255,255,0.9))' }
const SILUETA_NEGRA  = { filter: 'brightness(0) drop-shadow(0 0 10px rgba(255,255,255,0.35))' }
const ESTRELLAS = [0, 45, 90, 135, 180, 225, 270, 315]

/**
 * La captura automática como en los juegos: la pokébola vuela, se abre y
 * absorbe al Pokémon en un destello, cae, se balancea y al final hace "click"
 * con estrellas o se abre y el Pokémon escapa.
 *
 * fx: { uid, exito, bola, nombreBola, sprite, oculto, trainer, pokemon }
 */
export default function CapturaFx({ fx, esMaster = false, onFin }) {
  const n = SACUDIDAS
  const [fase, setFase] = useState('lanzar')
  const [sacudida, setSacudida] = useState(0)

  const finRef = useRef(onFin)
  useEffect(() => { finRef.current = onFin })

  useEffect(() => {
    const ts = []
    let t = LANZAR
    ts.push(setTimeout(() => setFase('absorber'), t)); t += ABSORBER
    ts.push(setTimeout(() => setFase('caer'), t)); t += CAER
    for (let i = 0; i < n; i++) {
      ts.push(setTimeout(() => { setFase('sacudir'); setSacudida(i + 1) }, t))
      t += SACUDIDA
    }
    t += 200
    ts.push(setTimeout(() => setFase('final'), t)); t += FINAL
    ts.push(setTimeout(() => finRef.current?.(), t))
    return () => ts.forEach(clearTimeout)
  }, [n])

  const bola = fx.bola || POKEBALL_SPRITE
  // Un Pokémon oculto se ve como sombra para los jugadores hasta que se sepa
  const sombra = fx.oculto && !esMaster && !(fase === 'final' && fx.exito)
  const final = fase === 'final'

  // Clases de la pokébola en cada fase
  const claseBola = {
    lanzar: 'animate-cap-lanzar',
    absorber: 'cap-bola-arriba',
    caer: 'animate-cap-caer',
    sacudir: 'animate-cap-sacudir',
    final: fx.exito ? 'cap-bola-cerrada' : 'animate-cap-abrir',
  }[fase]

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-gray-950/85 pointer-events-none animate-bgfade">
      <p className="mb-4 px-6 text-center text-sm font-bold text-gray-300">
        {fx.trainer} lanzó una {fx.nombreBola || 'pokébola'}
      </p>

      <div className="relative w-64 h-72">
        {/* El Pokémon: quieto, absorbido o escapando */}
        {fx.sprite && (fase === 'lanzar' || fase === 'absorber' || (final && !fx.exito)) && (
          <img src={fx.sprite} alt=""
            // 160 px es el mediano; centrado a mano porque el ancho cambia con la talla
            style={{ width: ladoTalla(160, fx.talla), height: ladoTalla(160, fx.talla), marginLeft: -ladoTalla(160, fx.talla) / 2,
              ...(fase === 'absorber' ? SILUETA_BLANCA : (sombra ? SILUETA_NEGRA : {})) }}
            className={`absolute left-1/2 top-6 object-contain
              ${fase === 'absorber' ? 'animate-cap-absorber' : ''} ${final ? (sombra ? 'animate-cap-escapar-sombra' : 'animate-cap-escapar') : ''}`}
            onError={e => { e.target.style.opacity = '0' }} />
        )}

        {/* Destello al abrirse la pokébola: al absorber y al escapar */}
        {(fase === 'absorber' || (final && !fx.exito)) && (
          <div className={`absolute left-1/2 w-40 h-40 -ml-20 rounded-full animate-cap-destello ${final ? 'bottom-0' : 'top-6'}`}
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(254,202,202,0.5) 40%, rgba(255,255,255,0) 70%)' }} />
        )}

        {/* La pokébola. key con la sacudida para que la animación arranque de nuevo */}
        <img key={`${fase}-${sacudida}`} src={bola} alt=""
          className={`absolute left-1/2 bottom-5 w-12 h-12 -ml-6 object-contain drop-shadow-lg ${claseBola}`}
          onError={e => { e.target.src = POKEBALL_SPRITE }} />

        {/* Click: estrellas que salen de la pokébola cerrada */}
        {final && fx.exito && ESTRELLAS.map(g => (
          <span key={g} className="absolute left-1/2 bottom-9 -ml-2 text-amber-300 text-base leading-none animate-cap-estrella"
            style={{ '--giro': `${g}deg` }}>★</span>
        ))}
      </div>

      <p className={`mt-4 px-6 text-center text-2xl font-black ${final ? 'animate-cap-texto' : 'opacity-0'}
        ${fx.exito ? 'text-amber-300' : 'text-white'}`}>
        {fx.exito ? `¡${fx.pokemon} atrapado!` : '¡Se escapó!'}
      </p>
    </div>
  )
}

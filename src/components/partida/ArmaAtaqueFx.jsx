import { spriteArma } from '../../lib/armasFx'

// El arma del entrenador en el efecto de ataque. Va al lado derecho del avatar
// (que es el que salta) y arranca al aterrizar el salto (0.6 s); los tiempos
// viven en index.css, bajo "Ataque con arma".
//
// fx: { sprite, anim, proyectil?, fuego? }  (ver lib/armasFx.js)

function Proyectil({ tipo }) {
  if (tipo === 'piedra') {
    return <span className="block w-3 h-3 rounded-full bg-gray-400 border-2 border-[#2b1d12]" />
  }
  if (tipo === 'bala' || tipo === 'perdigones') {
    return <span className="block w-8 h-1.5 rounded-full bg-gradient-to-r from-transparent via-amber-200 to-white shadow-[0_0_8px_rgba(253,230,138,0.9)]" />
  }
  // flecha, virote y dardo: la misma silueta, más corta en el dardo
  const largo = tipo === 'dardo' ? 30 : tipo === 'virote' ? 38 : 48
  return (
    <svg width={largo} height="12" viewBox={`0 0 ${largo} 12`} aria-hidden="true">
      <path d={`M3 6 H${largo - 7}`} stroke="#2b1d12" strokeWidth="3.4" strokeLinecap="round" />
      <path d={`M3 6 H${largo - 7}`} stroke="#b7791f" strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${largo - 8} 2 L${largo - 1} 6 L${largo - 8} 10 Z`} fill="#dbe3ec" stroke="#2b1d12" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M1 2 L7 6 L1 10" fill="#dc2626" stroke="#2b1d12" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

// Destello amarillo de impacto (y fogonazo de las armas de fuego)
function Estrella({ className = '', size = 56 }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    const r = i % 2 ? 9 : 22
    return `${24 + r * Math.cos(a)},${24 + r * Math.sin(a)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <polygon points={pts} fill="#fde68a" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export default function ArmaAtaqueFx({ fx }) {
  const src = spriteArma(fx.sprite)
  const arma = (cls) => (
    <img src={src} alt="" className={`absolute w-24 h-24 drop-shadow-[0_3px_4px_rgba(0,0,0,0.6)] ${cls}`}
      onError={e => { e.target.style.opacity = '0' }} />
  )

  return (
    // Escenario de 300×120 que arranca en el borde derecho del avatar
    <div className="absolute left-[calc(50%+3rem)] top-1/2 -translate-y-1/2 w-[300px] h-[120px] pointer-events-none">
      {fx.anim === 'corte' && (
        <>
          {arma('left-0 top-3 arma-pivote animate-arma-corte')}
          <svg className="absolute -left-2 -top-10 w-44 h-44 overflow-visible" viewBox="0 0 140 140" fill="none" aria-hidden="true">
            <path d="M18 22 A105 105 0 0 1 128 112" pathLength="1" className="animate-arma-trazo"
              stroke="white" strokeWidth="7" strokeLinecap="round" />
          </svg>
        </>
      )}

      {fx.anim === 'estocada' && (
        <>
          {arma('left-0 top-3 animate-arma-estocada')}
          {[18, 0, -18].map((dy, i) => (
            <span key={i} className="absolute left-32 top-1/2 h-1 w-20 rounded-full bg-white/80 origin-left animate-arma-lineas"
              style={{ marginTop: dy }} />
          ))}
        </>
      )}

      {fx.anim === 'golpe' && (
        <>
          {arma('left-0 top-3 arma-pivote animate-arma-golpe')}
          <span className="absolute left-24 top-14 w-16 h-16 rounded-full border-4 border-white animate-arma-onda" />
          <Estrella className="absolute left-[100px] top-[60px] animate-arma-impacto" />
        </>
      )}

      {fx.anim === 'proyectil' && (
        <>
          {arma('left-0 top-3 animate-arma-disparo')}
          {fx.fuego && <Estrella size={40} className="absolute left-[88px] top-[22px] animate-arma-fogonazo" />}
          {(fx.proyectil === 'perdigones' ? [-14, 0, 14] : [0]).map(dy => (
            <span key={dy} className="absolute left-[92px] top-1/2 -translate-y-1/2 animate-arma-proyectil"
              style={{ '--dy': `${dy}px` }}>
              <Proyectil tipo={fx.proyectil} />
            </span>
          ))}
          <Estrella size={44} className="absolute left-[268px] top-[38px] animate-arma-impacto-lejos" />
        </>
      )}

      {fx.anim === 'red' && (
        <img src={src} alt="" className="absolute left-0 top-6 w-16 h-16 animate-arma-red"
          onError={e => { e.target.style.opacity = '0' }} />
      )}
    </div>
  )
}

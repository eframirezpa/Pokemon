import { useMemo } from 'react'

/* Efecto de brasas (evento fire) sobre toda la vista del trainer */
export function Embers({ count = 45 }) {
  const particles = useMemo(() => Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    size: 2 + Math.random() * 5,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 8,
    drift: `${Math.round((Math.random() - 0.5) * 120)}px`,
  })), [count])
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15]">
      {particles.map((p, i) => (
        <span key={i} style={{
          position: 'absolute',
          bottom: '-12px',
          left: `${p.left}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          borderRadius: '9999px',
          background: 'radial-gradient(circle, #ffe08a 0%, #ff7a18 65%, rgba(255,90,0,0) 100%)',
          boxShadow: '0 0 6px 1px rgba(255,110,0,0.75)',
          animation: `ember-rise ${p.duration}s linear ${p.delay}s infinite`,
          '--drift': p.drift,
        }} />
      ))}
    </div>
  )
}

/* Efecto de nieve (evento frost) sobre toda la vista del trainer */
export function Snow({ count = 60 }) {
  const flakes = useMemo(() => Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    size: 2 + Math.random() * 5,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 10,
    drift: `${Math.round((Math.random() - 0.5) * 160)}px`,
    blur: Math.random() < 0.5 ? 0.5 : 0,
  })), [count])
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15]">
      {flakes.map((f, i) => (
        <span key={i} style={{
          position: 'absolute',
          top: '-12px',
          left: `${f.left}%`,
          width: `${f.size}px`,
          height: `${f.size}px`,
          borderRadius: '9999px',
          background: 'radial-gradient(circle, #ffffff 0%, #dbeafe 70%, rgba(255,255,255,0) 100%)',
          boxShadow: '0 0 4px 1px rgba(255,255,255,0.7)',
          filter: f.blur ? `blur(${f.blur}px)` : undefined,
          animation: `snow-fall ${f.duration}s linear ${f.delay}s infinite`,
          '--drift': f.drift,
        }} />
      ))}
    </div>
  )
}

/* ── Climas de combate (lib/clima.js) ── */

// Pseudoaleatorio fijo por índice: cada partícula cae siempre igual, sin azar
// real en el render (que React no permite y movería todo en cada pintada).
const rnd = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}
const lista = (n, fn) => Array.from({ length: n }, (_, i) => fn(i))

/* Lluvia: trazos finos que caen en diagonal */
export function Rain({ count = 90 }) {
  const gotas = lista(count, i => ({
    left: rnd(i, 1) * 110 - 5,
    largo: 14 + rnd(i, 2) * 18,
    duration: 0.55 + rnd(i, 3) * 0.4,
    delay: rnd(i, 4) * 2,
    opacity: 0.25 + rnd(i, 5) * 0.4,
  }))
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15] bg-blue-950/10">
      {gotas.map((g, i) => (
        <span key={i} style={{
          position: 'absolute', top: '-40px', left: `${g.left}%`,
          width: '1.5px', height: `${g.largo}px`, opacity: g.opacity,
          background: 'linear-gradient(to bottom, rgba(191,219,254,0), rgba(191,219,254,0.9))',
          transform: 'rotate(12deg)',
          animation: `rain-fall ${g.duration}s linear ${g.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

/* Granizo: bolitas blancas que caen rápido */
export function Hail({ count = 50 }) {
  const piedras = lista(count, i => ({
    left: rnd(i, 6) * 100,
    size: 3 + rnd(i, 7) * 4,
    duration: 0.9 + rnd(i, 8) * 0.7,
    delay: rnd(i, 9) * 3,
  }))
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15] bg-sky-900/10">
      {piedras.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', top: '-12px', left: `${p.left}%`,
          width: `${p.size}px`, height: `${p.size}px`, borderRadius: '30%',
          background: 'radial-gradient(circle, #ffffff 0%, #e0f2fe 60%, #bae6fd 100%)',
          boxShadow: '0 0 3px rgba(255,255,255,0.8)',
          animation: `hail-fall ${p.duration}s linear ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

/* Tormenta de arena: granos que cruzan de lado sobre un velo ocre */
export function Sandstorm({ count = 110 }) {
  const granos = lista(count, i => ({
    top: rnd(i, 10) * 100,
    size: 1.5 + rnd(i, 11) * 3,
    duration: 1.2 + rnd(i, 12) * 1.6,
    delay: rnd(i, 13) * 3,
    caida: `${Math.round(20 + rnd(i, 14) * 60)}px`,
  }))
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15] animate-arena-velo"
      style={{ background: 'linear-gradient(100deg, rgba(180,120,50,0.18), rgba(214,160,80,0.28), rgba(180,120,50,0.18))' }}>
      {granos.map((g, i) => (
        <span key={i} style={{
          position: 'absolute', top: `${g.top}%`, left: '-10px',
          width: `${g.size}px`, height: `${g.size}px`, borderRadius: '9999px',
          background: '#d6a35a', opacity: 0.8,
          animation: `sand-drift ${g.duration}s linear ${g.delay}s infinite`,
          '--caida': g.caida,
        }} />
      ))}
    </div>
  )
}

/* Sol intenso: un resplandor cálido desde arriba que late despacio */
export function Sun() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15]">
      {/* El centrado va dentro de la animación (sol-pulso): una clase de
          translate aquí lo desplazaría dos veces. */}
      <div className="absolute left-1/2 w-[120vmax] h-[120vmax] rounded-full animate-sol-pulso"
        style={{ top: '-75vmax', background: 'radial-gradient(circle, rgba(254,240,138,0.75) 0%, rgba(253,186,116,0.38) 28%, rgba(251,146,60,0) 58%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(251,191,36,0.16), rgba(251,191,36,0.04) 60%, rgba(0,0,0,0))' }} />
    </div>
  )
}

/* Niebla: bancos grises que se desplazan lento */
export function Fog() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[15]">
      {[0, 1, 2].map(i => (
        <div key={i} className="absolute -inset-x-1/2 animate-niebla"
          style={{
            top: `${10 + i * 28}%`, height: '45%',
            background: 'radial-gradient(ellipse at center, rgba(209,213,219,0.42) 0%, rgba(209,213,219,0) 70%)',
            animationDuration: `${38 + i * 14}s`, animationDelay: `${-i * 9}s`,
            animationDirection: i % 2 ? 'reverse' : 'normal',
          }} />
      ))}
      <div className="absolute inset-0 bg-gray-300/15" />
    </div>
  )
}

/* El efecto que corresponde a cada clima */
export function ClimaEfecto({ clima }) {
  if (clima === 'lluvia') return <Rain />
  if (clima === 'granizo') return <Hail />
  if (clima === 'arena') return <Sandstorm />
  if (clima === 'sol') return <Sun />
  if (clima === 'niebla') return <Fog />
  if (clima === 'nieve') return <Snow count={80} />
  return null
}

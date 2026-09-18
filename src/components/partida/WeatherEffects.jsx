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

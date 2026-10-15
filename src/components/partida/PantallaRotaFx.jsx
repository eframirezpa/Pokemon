import { useState } from 'react'

// PRUEBA: ruptura de pantalla para el golpe crítico. Grietas que salen del
// centro al aterrizar el salto (0.6 s), se quedan ~5 s y se desvanecen.
// Las coordenadas van en un viewBox de 100×100 estirado a la pantalla; el
// grosor no se deforma gracias a vector-effect.

const CENTRO = 50
const RAYOS = 11
const ANILLOS = [7, 15, 26]

function generar() {
  const rnd = (a, b) => a + Math.random() * (b - a)
  const base = rnd(0, Math.PI * 2)
  // Cada rayo es una línea quebrada desde el centro hasta salir del recuadro
  const rayos = Array.from({ length: RAYOS }, (_, i) => {
    let ang = base + (i / RAYOS) * Math.PI * 2 + rnd(-0.18, 0.18)
    const pts = [[CENTRO, CENTRO]]
    let [x, y] = [CENTRO, CENTRO]
    let dist = 0
    while (dist < 85) {
      const paso = rnd(6, 13)
      ang += rnd(-0.28, 0.28)
      x += Math.cos(ang) * paso; y += Math.sin(ang) * paso
      dist += paso
      pts.push([x, y])
    }
    return pts
  })
  // Punto de un rayo a cierta distancia del centro (el primero que la supera)
  const enRadio = (pts, r) => pts.find(([x, y]) => Math.hypot(x - CENTRO, y - CENTRO) >= r) || pts[pts.length - 1]
  // Anillos: tramos que unen rayos vecinos, con un quiebre al medio; se saltan
  // algunos para que no quede una telaraña perfecta
  const anillos = []
  ANILLOS.forEach((r, ai) => {
    for (let i = 0; i < RAYOS; i++) {
      if (Math.random() < 0.3) continue
      const a = enRadio(rayos[i], r)
      const b = enRadio(rayos[(i + 1) % RAYOS], r * rnd(0.85, 1.15))
      const m = [(a[0] + b[0]) / 2 + rnd(-2, 2), (a[1] + b[1]) / 2 + rnd(-2, 2)]
      anillos.push({ pts: [a, m, b], ai })
    }
  })
  return { rayos, anillos }
}

const d = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')

export default function PantallaRotaFx() {
  // Una forma nueva cada vez que se monta (cada crítico)
  const [{ rayos, anillos }] = useState(generar)

  const grieta = (key, path, delay) => (
    <g key={key}>
      <path d={path} pathLength="1" className="crack-draw" style={{ animationDelay: `${delay}s` }}
        stroke="rgba(0,0,0,0.6)" strokeWidth="3.5" vectorEffect="non-scaling-stroke" />
      <path d={path} pathLength="1" className="crack-draw" style={{ animationDelay: `${delay}s` }}
        stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </g>
  )

  return (
    <div className="fixed inset-0 z-[95] pointer-events-none animate-pantalla-rota">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" fill="none"
        strokeLinejoin="round" strokeLinecap="round">
        {/* Vidrio astillado en el punto de impacto */}
        <circle cx={CENTRO} cy={CENTRO} r="3" fill="rgba(255,255,255,0.35)" />
        {rayos.map((pts, i) => grieta(`r${i}`, d(pts), 0.6))}
        {anillos.map(({ pts, ai }, i) => grieta(`a${i}`, d(pts), 0.7 + ai * 0.08))}
      </svg>
    </div>
  )
}

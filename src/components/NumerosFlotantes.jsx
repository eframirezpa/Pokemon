import { useState, useEffect, useRef } from 'react'

const DURACION_MS = 1400
let siguienteId = 0 // ids de los números, solo para las keys

/**
 * "−12" en rojo o "+7" en verde que sube y se desvanece cuando cambia la vida.
 * Va dentro de un contenedor `relative` (la tarjeta) y no captura clics.
 *
 * mostrarNumero=false es para quien no ve los HP de esa tarjeta (un trainer
 * mirando al Pokémon del máster): sale solo ▼ o ▲, sin delatar cuánto fue.
 */
export default function NumerosFlotantes({ valor, mostrarNumero = true, className = '' }) {
  const [previo, setPrevio] = useState(valor)
  const [items, setItems] = useState([])

  // Se compara con el valor anterior durante el render (el patrón de React
  // para "lo que cambió desde la última vez"): la primera carga no dispara nada.
  if (valor !== previo) {
    setPrevio(valor)
    const d = Number(valor) - Number(previo)
    if (previo != null && valor != null && Number.isFinite(d) && d !== 0) {
      setItems(xs => [...xs, { id: siguienteId++, d }])
    }
  }

  // Un temporizador por número, que no se cancela cuando llega otro: si la
  // vida cambia seguido, cada uno se borra a su tiempo y no se acumulan.
  const timers = useRef(new Map())
  useEffect(() => {
    for (const it of items) {
      if (timers.current.has(it.id)) continue
      timers.current.set(it.id, setTimeout(() => {
        timers.current.delete(it.id)
        setItems(xs => xs.filter(x => x.id !== it.id))
      }, DURACION_MS))
    }
  }, [items])
  useEffect(() => {
    const t = timers.current
    return () => { for (const id of t.values()) clearTimeout(id) }
  }, [])

  if (!items.length) return null
  return (
    <div className={`pointer-events-none absolute inset-0 z-20 flex items-start justify-center overflow-visible ${className}`}>
      {items.map((it, i) => (
        <span key={it.id}
          className={`absolute font-black text-lg animate-numero-flotante drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
            it.d < 0 ? 'text-red-500' : 'text-green-400'}`}
          // Arranca a media altura: las tarjetas chicas (party) recortan arriba
          style={{ top: '25%', marginLeft: `${(i % 3) * 30 - 30}px` }}>
          {mostrarNumero ? `${it.d > 0 ? '+' : '−'}${Math.abs(it.d)}` : (it.d < 0 ? '▼' : '▲')}
        </span>
      ))}
    </div>
  )
}

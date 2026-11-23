import { useSyncExternalStore } from 'react'

// ¿La ventana mide al menos 1024 px (el corte `lg` de Tailwind)? Sirve para
// montar el detalle en un solo sitio — panel al lado en escritorio, hoja
// inferior en el celular — en vez de montarlo dos veces y esconder uno.
const CONSULTA = '(min-width: 1024px)'

const suscribir = (avisar) => {
  const mq = window.matchMedia(CONSULTA)
  mq.addEventListener('change', avisar)
  return () => mq.removeEventListener('change', avisar)
}
const leer = () => window.matchMedia(CONSULTA).matches

export default function useEsEscritorio() {
  return useSyncExternalStore(suscribir, leer, () => true)
}

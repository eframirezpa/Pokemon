import PokeballIcon from './PokeballIcon'

// Indicador de carga de la app: la pokébola girando.
//
// Sustituye al spinner genérico en todos los sitios donde se espera algo, para
// que "cargando" se vea siempre igual. Hereda el color del texto, así que en un
// botón rojo va en blanco sin configurar nada.
//
// La animación (animate-pokeball-spin, en index.css) no se detiene con
// prefers-reduced-motion, solo se frena: es el único indicio de que algo está
// pasando y un icono quieto no diría nada.
export default function PokeballSpinner({ size = 18, className = '' }) {
  return (
    <span role="status" aria-label="Cargando" className={`animate-pokeball-spin ${className}`}>
      <PokeballIcon size={size} />
    </span>
  )
}

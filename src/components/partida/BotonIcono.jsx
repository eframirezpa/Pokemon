import { ICONO_REDONDO, ICONO_REDONDO_ACTIVO } from '../../lib/trainerCombatShared'

// Botón redondo de la sala (Party, mapa, notas, actividad…). Antes el mismo
// estilo estaba copiado a mano en cada botón; ahora sale de aquí.
//
//   activo    — encendido en morado (algo en curso)
//   tamano    — 'md' (40 px, la columna) o 'lg' (44 px, los de las esquinas)
//   className — posición (fixed left-3 top-16…) y clases extra
export default function BotonIcono({ activo = false, tamano = 'md', className = '', title, children, ...props }) {
  const lado = tamano === 'lg' ? 'w-11 h-11' : 'w-10 h-10'
  return (
    <button type="button" title={title} aria-label={props['aria-label'] ?? title} {...props}
      className={`${activo ? ICONO_REDONDO_ACTIVO : ICONO_REDONDO} ${lado} ${className}`}>
      {children}
    </button>
  )
}

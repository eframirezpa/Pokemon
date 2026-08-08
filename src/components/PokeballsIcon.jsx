// Cinturón: tres pokébolas en fila.
//
// Vive aparte porque lo usan la barra de la partida y las tarjetas de la
// femputadora, y las dos deben verse igual: es el icono con el que el jugador
// reconoce el cinturón.
export default function PokeballsIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round">
      {[5, 12, 19].map(cx => (
        <g key={cx}>
          <circle cx={cx} cy="12" r="3.4" />
          <line x1={cx - 3.4} y1="12" x2={cx + 3.4} y2="12" />
          <circle cx={cx} cy="12" r="0.9" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  )
}

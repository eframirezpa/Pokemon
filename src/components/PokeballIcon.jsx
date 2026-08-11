// Pokébola de una sola línea: el trazo toma el color del texto (currentColor),
// así que quien la usa decide el color con una clase.
//
// Vivía dentro de TrainerPartida, pero al convertirse en el indicador de carga
// de toda la app pasó a tener su propio archivo.
export default function PokeballIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h6M15 12h6" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

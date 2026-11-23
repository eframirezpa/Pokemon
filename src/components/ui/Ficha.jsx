// Dato con etiqueta en un cuadro: "AC 13", "STR 11 +0".
//
//   etiqueta — texto pequeño arriba (gris, en negrita)
//   valor    — número o texto grande
//   sub      — línea pequeña debajo (modificador, unidad…)
//   unidad   — texto pequeño al lado del valor ("d6", "ft")
//   sobreColor — va sobre una tarjeta de color (cabecera de la ficha): fondo
//                blanco translúcido y texto oscuro fijo en los dos modos
export default function Ficha({ etiqueta, valor, sub = null, unidad = null, sobreColor = false, className = '' }) {
  const fondo = sobreColor ? 'bg-white/75' : 'bg-superficie'
  const fuerte = sobreColor ? 'text-[#1C1C1E]' : 'text-texto'
  const suave = sobreColor ? 'text-[#4A4A50]' : 'text-texto-2'
  return (
    <div className={`${fondo} rounded-xl px-1.5 py-2 text-center leading-tight min-w-0 ${className}`}>
      <small className={`block text-[11px] font-semibold truncate ${suave}`}>{etiqueta}</small>
      <b className={`block text-xl font-bold tracking-[-.02em] tabular-nums truncate ${fuerte}`}>
        {valor}
        {unidad && <span className={`ml-1 text-xs font-medium tracking-normal ${suave}`}>{unidad}</span>}
      </b>
      {sub != null && <span className={`block text-xs tabular-nums truncate ${suave}`}>{sub}</span>}
    </div>
  )
}

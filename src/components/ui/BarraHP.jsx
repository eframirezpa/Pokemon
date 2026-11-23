// Barra de puntos de golpe con la etiqueta "HP" en amarillo, al estilo de los
// juegos. El relleno pasa de verde a amarillo (≤ 50 %) y a rojo (≤ 20 %).
//
//   <BarraHP valor={12} max={16} />            → etiqueta + barra
//   <BarraHP valor={12} max={16} numeros />    → además "12/16" a la derecha
//   <BarraHP valor={12} max={16} delgada />    → 5 px, para fichas pequeñas
export default function BarraHP({ valor, max, numeros = false, delgada = false, etiqueta = true, className = '' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0
  const color = pct <= 20 ? 'bg-peligro' : pct <= 50 ? 'bg-[#FFCC00]' : 'bg-ok'
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {etiqueta && <small className="text-[10px] font-extrabold tracking-[.04em] text-[#8A6100] [.modo-oscuro_&]:text-[#FFD60A]">HP</small>}
      <div className={`flex-1 rounded-full bg-pista overflow-hidden ${delgada ? 'h-[5px]' : 'h-2'}`}
        role="meter" aria-label="Puntos de golpe" aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor}>
        <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {numeros && <span className="text-xs font-medium text-texto-2 tabular-nums">{valor}/{max}</span>}
    </div>
  )
}

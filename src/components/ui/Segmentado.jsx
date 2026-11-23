// Control segmentado: opciones excluyentes en una cápsula gris; la elegida
// sale en blanco (gris claro en oscuro) con una sombra leve.
//
//   <Segmentado opciones={[{ valor: 'a', etiqueta: 'Mov.' }, …]} valor={tab} onChange={setTab} />
//
// Con `envolver` las opciones parten en varias líneas si no caben (el panel
// de combate en 360 px); si no, se reparten el ancho.
export default function Segmentado({ opciones, valor, onChange, envolver = false, className = '', etiqueta = null }) {
  return (
    <div role="tablist" aria-label={etiqueta ?? undefined}
      className={`flex ${envolver ? 'flex-wrap' : ''} p-0.5 rounded-[9px] bg-relleno ${className}`}>
      {opciones.map(o => {
        const on = o.valor === valor
        return (
          <button key={o.valor} type="button" role="tab" aria-selected={on}
            onClick={() => onChange(o.valor)} disabled={o.disabled}
            className={`flex-1 min-w-fit h-7 px-2.5 rounded-[7px] text-[13px] whitespace-nowrap transition-all
                        disabled:opacity-40 ${on
                          ? 'bg-superficie font-semibold text-texto shadow-[0_1px_3px_rgba(0,0,0,.16)] [.modo-oscuro_&]:bg-[#636366]'
                          : 'font-medium text-texto hover:bg-relleno'}`}>
            {o.etiqueta}
          </button>
        )
      })}
    </div>
  )
}

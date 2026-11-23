// Botón del sistema de diseño.
//
// variante:
//   relleno — acción principal: fondo morado, texto blanco.
//   tintado — acción secundaria: fondo gris translúcido, texto morado.
//   plano   — solo texto morado, sin fondo (enlaces, "Cancelar").
//   peligro — acción destructiva con el mismo formato que tintado.
// tamano: 'sm' (30 px, cápsula), 'md' (36 px), 'lg' (48 px, ancho de formulario).
//
// El resto de props va al <button> (onClick, disabled, type, title, aria-*…).
const VARIANTES = {
  relleno: 'bg-acento text-white hover:bg-acento-hover',
  tintado: 'bg-relleno text-tinte hover:bg-relleno-2',
  plano:   'text-tinte hover:opacity-75',
  peligro: 'bg-relleno text-peligro hover:bg-relleno-2',
}
const TAMANOS = {
  sm: 'h-[30px] px-3.5 text-[13px] gap-1.5 rounded-full',
  md: 'h-9 px-4 text-sm gap-1.5 rounded-full',
  lg: 'h-12 px-5 text-base gap-2 rounded-grupo w-full',
}

export default function Boton({ variante = 'relleno', tamano = 'md', className = '', type = 'button', children, ...props }) {
  return (
    <button type={type} {...props}
      className={`inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinte
                  ${VARIANTES[variante] ?? VARIANTES.relleno} ${TAMANOS[tamano] ?? TAMANOS.md} ${className}`}>
      {children}
    </button>
  )
}

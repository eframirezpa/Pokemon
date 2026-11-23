// Panel translúcido (cristal esmerilado) para flotar sobre la escena de la
// sala o sobre imágenes. El color sale del modo: blanco translúcido en claro,
// gris oscuro translúcido en oscuro.
//
// `as` cambia la etiqueta (div por defecto; 'button' para una cápsula tocable).
export default function Cristal({ as: Etiqueta = 'div', className = '', children, ...props }) {
  return (
    <Etiqueta {...props} className={`cristal text-texto ${className}`}>
      {children}
    </Etiqueta>
  )
}

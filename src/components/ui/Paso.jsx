import { Minus, Plus } from 'lucide-react'

// Pasos − / + (stepper). Rojo y verde conservan el significado de hoy en los
// contadores de la mesa: bajar y subir. Con `neutro` los dos van en el color
// del texto (para cantidades sin carga de "bueno/malo").
export default function Paso({ onMenos, onMas, puedeMenos = true, puedeMas = true, neutro = false,
                               etiquetaMenos = 'Bajar', etiquetaMas = 'Subir', className = '' }) {
  return (
    <div className={`inline-flex rounded-lg bg-relleno overflow-hidden divide-x divide-separador ${className}`}>
      <button type="button" onClick={onMenos} disabled={!puedeMenos} aria-label={etiquetaMenos}
        className={`w-10 h-[30px] grid place-items-center transition-colors hover:bg-relleno disabled:opacity-35
                    ${neutro ? 'text-texto' : 'text-peligro'}`}>
        <Minus size={16} strokeWidth={2.4} />
      </button>
      <button type="button" onClick={onMas} disabled={!puedeMas} aria-label={etiquetaMas}
        className={`w-10 h-[30px] grid place-items-center transition-colors hover:bg-relleno disabled:opacity-35
                    ${neutro ? 'text-texto' : 'text-ok'}`}>
        <Plus size={16} strokeWidth={2.4} />
      </button>
    </div>
  )
}

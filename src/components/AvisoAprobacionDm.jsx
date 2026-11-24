import { ShieldCheck } from 'lucide-react'
import Hoja from './ui/Hoja'
import Boton from './ui/Boton'

/**
 * Antes de editar al entrenador o entrenar un feat a mano a un Pokémon: la
 * mesa tiene que saber que el DM lo aprobó. Aceptar abre la edición.
 */
export default function AvisoAprobacionDm({ onAceptar, onCancelar }) {
  return (
    <Hoja z="z-[95]" ancho="sm:max-w-sm" onClose={onCancelar}
      titulo={<span className="flex items-center gap-2"><ShieldCheck size={18} className="text-tinte" /> Aprobación del DM</span>}
      pie={
        <div className="flex justify-end gap-2">
          <Boton variante="tintado" onClick={onCancelar}>Cancelar</Boton>
          <Boton onClick={onAceptar}>Aceptar</Boton>
        </div>
      }>
      <p className="text-[15px]">Esta acción debe estar aprobada por el DM.</p>
      <p className="text-[13px] text-texto-2 mt-1">Los feats que agregues quedan en el registro de la partida y en el resumen de la siguiente sesión.</p>
    </Hoja>
  )
}

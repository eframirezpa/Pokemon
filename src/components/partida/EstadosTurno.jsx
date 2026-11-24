import { useState } from 'react'
import { Hourglass } from 'lucide-react'
import Hoja from '../ui/Hoja'
import Boton from '../ui/Boton'
import BotonDado, { AvisoDesventaja } from '../dados/BotonDado'
import { EstadosChips } from '../EstadosControl'
import { resolverFinTurno, resolverInicioTurno, etiquetaEstado, desventajaSalvacion, CONFUSO_D8 } from '../../lib/estados'
import { tareasDe } from '../../lib/estadosTurno'

const signo = (n) => (n >= 0 ? `+${n}` : `${n}`)

/*
 * Estados al inicio y al final del turno (lib/estados.js). Los turnos son por
 * usuario: al terminar el del DM se procesan todos sus Pokémon y NPC; al
 * terminar el de un jugador, su entrenador y su Pokémon invocado. Cada quien
 * lo hace en su pantalla y confirma en una ventana a quién le cae, cuánto y
 * por qué; las tiradas (d20 de Dormido, STR de Congelado, d4 de Paralizado,
 * d8 de Confuso) se hacen ahí mismo.
 *
 * Criatura: { clave, tipo: 'trainer'|'pokemon'|'campo-pokemon'|'campo-npc',
 *   ids, nombre, claves, meta, hp, prof, bonoStr (null = lo escribe el DM),
 *   mods: { str, dex } | null }
 */

// ── Ventana ─────────────────────────────────────────────────────────────────

/**
 * fase: 'fin' | 'inicio' · criaturas: las que tienen algo que mostrar
 * onConfirmar([{ criatura, resultado }])
 */
export default function EstadosTurno({ fase, criaturas, esDm = false, onConfirmar }) {
  // valores[clave][estado] = lo escrito; struggle[clave] = daño a sí mismo; bonoNpc[clave]
  const [valores, setValores] = useState({})
  const [struggle, setStruggle] = useState({})
  const [bonos, setBonos] = useState({})
  const set = (c, e, v) => setValores(x => ({ ...x, [c]: { ...(x[c] || {}), [e]: v } }))

  const dadoValido = (dado, v) => {
    const caras = Number(dado.split('d')[1])
    const n = Number(v)
    return v !== '' && v != null && Number.isInteger(n) && n >= 1 && n <= caras
  }

  const filas = criaturas.map(c => {
    const t = tareasDe(c, fase)
    const bono = c.bonoStr ?? (Number(bonos[c.clave]) || 0)
    const v = valores[c.clave] || {}
    const completas = t.tiradas.every(ti => dadoValido(ti.dado, v[ti.estado]))
    // d8 de Confuso con 1: Struggle contra sí mismo
    const confuso1 = Number(v.confuso) === 1
    const struggleDef = 2 + Math.max(Number(c.mods?.str) || 0, Number(c.mods?.dex) || 0)
    return { c, t, bono, v, completas, confuso1, struggleDef }
  })
  const listo = filas.every(f => f.completas)

  const confirmar = () => {
    onConfirmar(filas.map(({ c, bono, v, confuso1, struggleDef }) => {
      const res = fase === 'fin'
        ? resolverFinTurno(c, { dormido: v.dormido, congelado: v.congelado != null && v.congelado !== '' ? Number(v.congelado) + bono : null })
        : resolverInicioTurno(c, { paralizado: v.paralizado, confuso: v.confuso,
            struggle: confuso1 ? (struggle[c.clave] === undefined || struggle[c.clave] === '' ? struggleDef : Number(struggle[c.clave])) : 0 })
      return { criatura: c, resultado: res }
    }))
  }

  return (
    <Hoja z="z-[88]" ancho="sm:max-w-md"
      titulo={<span className="flex items-center gap-2"><Hourglass size={18} className="text-tinte" />
        {fase === 'fin' ? 'Estados · final del turno' : 'Estados · inicio del turno'}</span>}
      pie={<div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-texto-2">{listo ? 'Se aplica a la vida y a los estados.' : 'Faltan tiradas.'}</p>
        <Boton disabled={!listo} onClick={confirmar}>Confirmar</Boton>
      </div>}>
      <div className="space-y-4">
        {filas.map(({ c, t, bono, v, confuso1, struggleDef }) => (
          <section key={c.clave} className="rounded-xl bg-superficie px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[15px] font-semibold">{c.nombre}</p>
              <EstadosChips estados={c.claves.join(',')} size="chico" />
              <span className="ml-auto text-[12px] text-texto-2 tabular-nums">vida {c.hp}</span>
            </div>

            {t.danos.map(d => (
              <p key={d.estado} className="text-[14px] text-peligro font-semibold">
                Pierde {d.cantidad} de vida por {etiquetaEstado(d.estado)}
                <span className="text-texto-2 font-normal text-[12px]"> ({d.estado === 'envenenado_grave' ? `2 × proficiencia ${c.prof}` : `proficiencia ${c.prof}`})</span>
              </p>
            ))}

            {t.avisos.map(a => <p key={a} className="text-[13px] text-texto-2">{a}</p>)}

            {t.tiradas.map(ti => {
              const desv = ti.salvacion ? desventajaSalvacion(c.claves, ti.salvacion) : null
              const val = v[ti.estado] ?? ''
              return (
                <div key={ti.estado} className="space-y-1">
                  <p className="text-[13px]"><b>{etiquetaEstado(ti.estado)}</b> · {ti.texto}</p>
                  <AvisoDesventaja motivo={desv} />
                  <div className="flex items-center gap-2">
                    <input type="number" inputMode="numeric" value={val} placeholder={ti.dado}
                      onChange={e => set(c.clave, ti.estado, e.target.value)} aria-label={`${ti.dado} de ${etiquetaEstado(ti.estado)} de ${c.nombre}`}
                      className="w-16 h-10 rounded-xl bg-relleno text-center text-[18px] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />
                    <BotonDado notacion={ti.dado} usar="dado" etiqueta={`${etiquetaEstado(ti.estado)} de ${c.nombre}`}
                      modo={desv ? 'desventaja' : null} motivo={desv}
                      onResultado={r => set(c.clave, ti.estado, String(r))} className="!w-10 !h-10 !rounded-xl" />
                    {ti.salvacion && (c.bonoStr != null
                      ? <span className="text-[16px] font-bold tabular-nums text-texto-2">{signo(bono)}</span>
                      : <input type="number" value={bonos[c.clave] ?? '0'} onChange={e => setBonos(x => ({ ...x, [c.clave]: e.target.value }))}
                          aria-label={`Bono de STR de ${c.nombre}`} title="Bono de salvación de STR"
                          className="w-14 h-10 rounded-xl bg-relleno text-center text-[16px] font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />)}
                    {ti.estado === 'confuso' && val !== '' && (
                      <span className="text-[12px] text-texto-2">{CONFUSO_D8[Number(val)] || ''}</span>
                    )}
                    {ti.estado === 'paralizado' && val !== '' && (
                      <span className="text-[12px] text-texto-2">{Number(val) === 1 ? 'No puede actuar este turno' : 'Puede actuar'}</span>
                    )}
                    {ti.estado === 'dormido' && val !== '' && (
                      <span className="text-[12px] text-texto-2">{Number(val) >= 11 ? 'Se despierta' : 'Sigue dormido'}</span>
                    )}
                    {ti.estado === 'congelado' && val !== '' && (
                      <span className="text-[12px] text-texto-2">{Number(val) + bono >= ti.meta ? `${Number(val) + bono}: se libera` : `${Number(val) + bono}: sigue congelado`}</span>
                    )}
                  </div>
                  {ti.estado === 'confuso' && confuso1 && (
                    <label className="flex items-center gap-2 text-[13px] text-peligro">
                      Struggle contra sí mismo (2 + STR o DEX):
                      <input type="number" min={0} value={struggle[c.clave] ?? String(struggleDef)}
                        onChange={e => setStruggle(x => ({ ...x, [c.clave]: e.target.value }))} aria-label={`Daño de Struggle a ${c.nombre}`}
                        className="w-14 h-8 rounded-lg bg-relleno text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-tinte/50" />
                    </label>
                  )}
                </div>
              )
            })}
          </section>
        ))}
        {esDm && <p className="text-[12px] text-texto-2">Turno del DM: aplica a todos tus Pokémon y NPC en el campo.</p>}
      </div>
    </Hoja>
  )
}

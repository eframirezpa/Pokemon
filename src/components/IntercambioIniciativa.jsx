import { useState, useEffect } from 'react'
import { ArrowLeftRight, Check, X } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

/**
 * El intercambio de iniciativa que dan Alert y Alert Pokemon: "immediately
 * after Initiative is rolled, you can swap Initiative with one willing
 * ally". Es puntual (una vez por combate, mientras se sigue pidiendo la
 * ronda) y necesita el sí del otro lado -de ahí la propuesta y la respuesta,
 * en vez de aplicarlo directo-.
 *
 * Vive fuera de IniciativaTirada porque no tiene que ver con tirar: aparece
 * DESPUÉS de tirar, y a cualquiera que ya tenga su feat listo, no solo a
 * quien todavía no ha tirado.
 */
export default function IntercambioIniciativa({
  partidaId, iniciativa, userId, swapPropuesta, setSwapPropuesta, swapRespuesta,
  sendSwapPropuesta, sendSwapRespuesta, onCambio,
}) {
  const [eligiendo, setEligiendo] = useState(false)
  const [propuestaEnviada, setPropuestaEnviada] = useState(null) // { aClave, aNombre } o null
  const [aviso, setAviso] = useState('') // resultado de mi propia propuesta
  const [busy, setBusy] = useState(false)

  const participantes = iniciativa?.participantes || []
  const yo = participantes.find(p => p.user_id === userId)
  const miClave = yo?.clave

  // Puedo ofrecer el intercambio: tengo el feat, ya tiré, y no lo he gastado.
  const puedoProponer = iniciativa?.estado === 'pidiendo' && yo?.con_alert && yo?.listo && !yo?.swap_usado
  const candidatos = participantes.filter(p => p.clave !== miClave && !p.es_master && p.listo)

  // La respuesta a lo que YO propuse: limpia el "esperando" y avisa el resultado.
  useEffect(() => {
    if (!swapRespuesta || !propuestaEnviada) return
    setAviso(swapRespuesta.aceptado
      ? `${propuestaEnviada.aNombre} aceptó el intercambio.`
      : `${propuestaEnviada.aNombre} rechazó el intercambio.`)
    setPropuestaEnviada(null)
    const t = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapRespuesta])

  const proponer = (destino) => {
    if (!yo) return
    sendSwapPropuesta({
      deClave: miClave, deNombre: yo.nombre, deTotal: yo.total,
      aClave: destino.clave, aNombre: destino.nombre, aTotal: destino.total,
    })
    setPropuestaEnviada({ aClave: destino.clave, aNombre: destino.nombre })
    setEligiendo(false)
  }

  const responder = async (aceptado) => {
    if (!swapPropuesta || busy) return
    setBusy(true)
    try {
      if (aceptado) {
        const res = await apiFetch(`/partida/${partidaId}/iniciativa/intercambio`, {
          method: 'PATCH',
          body: JSON.stringify({ con_clave: swapPropuesta.deClave }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'No se pudo intercambiar')
        onCambio?.(data.iniciativa)
      }
      sendSwapRespuesta({ paraClave: swapPropuesta.deClave, deClave: miClave, aceptado })
    } catch {
      // Si falló (p. ej. ya lo gastó, o el combate ya empezó), se avisa como
      // rechazado: el que propuso no se queda esperando para siempre.
      sendSwapRespuesta({ paraClave: swapPropuesta.deClave, deClave: miClave, aceptado: false })
    } finally {
      setBusy(false)
      setSwapPropuesta(null)
    }
  }

  return (
    <>
      {/* Botón flotante: solo mientras se puede ofrecer, y no si ya hay una en curso */}
      {puedoProponer && !propuestaEnviada && (
        <div className="fixed bottom-20 right-4 z-[90]">
          <button onClick={() => setEligiendo(true)}
            title="Intercambiar iniciativa (Alert)"
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold
                       px-3 py-2 rounded-full shadow-2xl transition-colors">
            <ArrowLeftRight size={14} /> Intercambiar iniciativa
          </button>
        </div>
      )}

      {propuestaEnviada && (
        <div className="fixed bottom-20 right-4 z-[90] flex items-center gap-2 bg-gray-900 border border-amber-500/40
                         text-amber-200 text-xs font-semibold px-3 py-2 rounded-full shadow-2xl">
          <PokeballSpinner size={13} /> Esperando a {propuestaEnviada.aNombre}...
        </div>
      )}

      {aviso && (
        <div className="fixed bottom-20 right-4 z-[90] bg-gray-900 border border-amber-500/40
                         text-amber-200 text-xs font-semibold px-3 py-2 rounded-full shadow-2xl">
          {aviso}
        </div>
      )}

      {/* Elegir a quién proponerle */}
      {eligiendo && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setEligiendo(false) }}>
          <div className="bg-gray-900 border border-amber-500/40 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">¿Con quién intercambias?</h3>
              <button onClick={() => setEligiendo(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="px-5 py-4 space-y-1.5">
              {candidatos.length === 0 && (
                <p className="text-xs text-gray-500 italic">Nadie más ha tirado todavía.</p>
              )}
              {candidatos.map(c => (
                <button key={c.clave} onClick={() => proponer(c)}
                  className="w-full flex items-center justify-between gap-2 bg-gray-800 hover:bg-gray-700
                             border border-gray-700 rounded-xl px-3 py-2 transition-colors text-left">
                  <span className="text-sm font-bold text-white truncate">{c.nombre}</span>
                  <span className="text-xs font-black tabular-nums text-amber-300 shrink-0">{c.total}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Propuesta que me llega a mí */}
      {swapPropuesta && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-gray-900 border border-amber-500/40 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2">
              <ArrowLeftRight size={18} className="text-amber-400 shrink-0" />
              <h3 className="font-bold text-white text-sm">Propuesta de intercambio</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-200">
                <span className="font-bold text-amber-300">{swapPropuesta.deNombre}</span> quiere darte su{' '}
                <span className="font-black tabular-nums">{swapPropuesta.deTotal}</span> a cambio de tu{' '}
                <span className="font-black tabular-nums">{swapPropuesta.aTotal}</span>.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-gray-700 flex items-center gap-2">
              <button onClick={() => responder(false)} disabled={busy}
                className="flex-1 text-sm font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700
                           disabled:opacity-40 px-3 py-2 rounded-xl transition-colors">
                Rechazar
              </button>
              <button onClick={() => responder(true)} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700
                           disabled:opacity-40 px-3 py-2 rounded-xl transition-colors">
                {busy ? <PokeballSpinner size={14} /> : <Check size={14} />} Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

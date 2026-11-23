import { useEffect, useState } from 'react'
import { AlertTriangle, MessageCircle, UserPlus } from 'lucide-react'
import { apiFetch } from '../../api'
import Hoja from '../ui/Hoja'
import Boton from '../ui/Boton'

/* Partes iguales que suman exacto el total; el resto va a los primeros
   (igual que repartoIgual en back/src/lib/xp.js). */
const repartoIgual = (total, n) => {
  if (!n) return []
  const base = Math.floor(total / n)
  const resto = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0))
}
const miles = (n) => Number(n || 0).toLocaleString('es')

/**
 * Experiencia en mesa, lado del DM (plan-xp-y-mesa, etapa 4 parte C).
 *
 * Un pop-up por cada Pokémon derrotado o atrapado. No sale con el combate en
 * curso: lo de la iniciativa se reparte al cerrarla, y una captura fuera de
 * combate sale en el momento. Cada vez que cambia `revisar`, pregunta al back
 * lo pendiente y si hay combate activo.
 *
 * El DM confirma qué entrenadores intervinieron (los detectados vienen
 * marcados; puede agregar a otro de la party) y cuánto le toca a cada uno;
 * después cada entrenador reparte su parte entre sus Pokémon.
 */
export default function RepartoXpDm({ partidaId, revisar, presentes = [], invocados = {}, onConfirmada }) {
  const [pendientes, setPendientes] = useState([])
  const [nombres, setNombres] = useState({})   // id_personaje → nombre
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    Promise.all([
      apiFetch(`/partida/${partidaId}/xp`).then(r => (r.ok ? r.json() : null)),
      apiFetch(`/partida/${partidaId}/iniciativa`).then(r => (r.ok ? r.json() : null)),
    ]).then(([xp, ini]) => {
      if (!vigente || !xp) return
      const enCombate = ini?.iniciativa?.estado === 'activa'
      setPendientes(enCombate ? [] : (xp.pendientes || []))
      setNombres(Object.fromEntries((xp.entrenadores || []).map(e => [String(e.id_personaje), e.nombre_personaje])))
    }).catch(() => {})
    return () => { vigente = false }
  }, [partidaId, revisar])

  const actual = pendientes[0]
  if (!actual) return null
  return (
    <VentanaReparto key={actual.id_xp} xp={actual} nombres={nombres} presentes={presentes} invocados={invocados}
      quedan={pendientes.length - 1} busy={busy} error={error}
      onManual={async () => {
        setBusy(true); setError('')
        const r = await apiFetch(`/partida/${partidaId}/xp/${actual.id_xp}/manual`, { method: 'POST' }).catch(() => null)
        setBusy(false)
        if (!r?.ok) { setError('No se pudo cerrar. Intenta de nuevo.'); return }
        setPendientes(p => p.slice(1))
      }}
      onConfirmar={async (reparto) => {
        setBusy(true); setError('')
        const r = await apiFetch(`/partida/${partidaId}/xp/${actual.id_xp}/confirmar`, {
          method: 'POST', body: JSON.stringify({ reparto }),
        }).catch(() => null)
        setBusy(false)
        if (!r?.ok) {
          const j = await r?.json().catch(() => ({}))
          setError(j?.error || 'No se pudo confirmar. Intenta de nuevo.'); return
        }
        onConfirmada?.(actual, reparto.filter(x => x.xp > 0).map(x => ({ ...x, nombre: nombres[String(x.id_personaje)] })))
        setPendientes(p => p.slice(1))
      }} />
  )
}

function VentanaReparto({ xp, nombres, presentes, invocados, quedan, busy, error, onManual, onConfirmar }) {
  const detectados = xp.intervinieron || []
  const infoDe = Object.fromEntries(detectados.map(d => [String(d.id_personaje), d]))

  // La party de la sesión: los entrenadores conectados con personaje. Los que
  // intervinieron van siempre, aunque se hayan desconectado.
  const conectados = []
  const vistos = new Set()
  for (const p of presentes) {
    if (p.role === 'master' || p.personaje_id == null) continue
    const k = String(p.personaje_id)
    if (vistos.has(k)) continue
    vistos.add(k); conectados.push(p)
  }
  const presentePor = Object.fromEntries(conectados.map(p => [String(p.personaje_id), p]))
  const ids = [...new Set([...detectados.map(d => String(d.id_personaje)), ...conectados.map(p => String(p.personaje_id))])]

  const [marcados, setMarcados] = useState(() => detectados.map(d => String(d.id_personaje)))
  // Cifras: iguales por defecto; si el DM escribe una a mano, se respeta hasta
  // que cambie quién recibe.
  const [cifras, setCifras] = useState(() => {
    const partes = repartoIgual(xp.xp_total, detectados.length)
    return Object.fromEntries(detectados.map((d, i) => [String(d.id_personaje), partes[i]]))
  })
  const alternar = (k) => {
    const nuevos = marcados.includes(k) ? marcados.filter(x => x !== k) : [...marcados, k]
    setMarcados(nuevos)
    const partes = repartoIgual(xp.xp_total, nuevos.length)
    setCifras(Object.fromEntries(nuevos.map((x, i) => [x, partes[i]])))
  }
  const suma = marcados.reduce((s, k) => s + (Number(cifras[k]) || 0), 0)
  const sobra = xp.xp_total - suma
  const valido = marcados.length > 0 && sobra >= 0 && marcados.every(k => Number.isInteger(Number(cifras[k])) && Number(cifras[k]) >= 0)

  const nombre = (k) => nombres[k] || presentePor[k]?.user_name || 'Entrenador'
  const sinInvocado = (k) => {
    const inv = k in invocados ? invocados[k] : presentePor[k]?.pokemon_invocado
    return inv == null
  }
  const resumen = (d) => [
    d.ataques ? `atacó ${d.ataques === 1 ? '1 vez' : `${d.ataques} veces`}` : null,
    d.pokebolas ? `${d.pokebolas === 1 ? 'lanzó Poké Ball' : `lanzó ${d.pokebolas} Poké Balls`}` : null,
  ].filter(Boolean).join(' · ')

  const accion = xp.xp_motivo === 'captura' ? 'fue atrapado' : 'fue derrotado'
  return (
    <Hoja z="z-[85]" ancho="sm:max-w-md"
      titulo={<span>{xp.xp_pokemon} <span className="text-texto-2 font-semibold">nv. {xp.xp_nivel}</span> {accion}</span>}
      pie={
        <div className="space-y-2">
          {error && <p className="text-[13px] text-peligro">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <Boton variante="plano" tamano="sm" onClick={onManual} disabled={busy}
              title="No se otorga nada por la app: el DM lo maneja a mano">
              Manual: cerrar e ignorar
            </Boton>
            <Boton onClick={() => onConfirmar(marcados.map(k => ({ id_personaje: Number(k), xp: Number(cifras[k]) || 0 })))}
              disabled={!valido || busy}>
              Confirmar
            </Boton>
          </div>
        </div>
      }>
      <div className="space-y-4">
        <div>
          <p className="text-[28px] font-bold tracking-[-.02em] tabular-nums leading-none">
            {miles(xp.xp_total)} <span className="text-[15px] font-semibold text-texto-2">XP</span>
          </p>
          <p className="text-[13px] text-texto-2 mt-1">
            {xp.xp_motivo === 'captura' ? '1/5 de la experiencia por atraparlo' : '200 × nivel × SR'}
            {quedan > 0 && ` · quedan ${quedan} más por repartir`}
          </p>
        </div>

        <p className="flex items-center gap-2 rounded-xl bg-tinte/10 px-3 py-2 text-[13px] text-texto">
          <MessageCircle size={15} className="text-tinte shrink-0" />
          Recuerda preguntar en la mesa quién intervino.
        </p>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-texto-2 mb-1.5">Entrenadores</p>
          {ids.length === 0 && (
            <p className="text-[13px] text-texto-2">Nadie de la party está conectado y nadie intervino.</p>
          )}
          <ul className="rounded-xl bg-superficie divide-y divide-separador overflow-hidden">
            {ids.map(k => {
              const on = marcados.includes(k)
              const d = infoDe[k]
              return (
                <li key={k} className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={on} onChange={() => alternar(k)} aria-label={`Dar experiencia a ${nombre(k)}`}
                      className="w-5 h-5 accent-[#7F00B2] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold truncate">{nombre(k)}</p>
                      <p className="text-[12px] text-texto-2 truncate flex items-center gap-1">
                        {d ? resumen(d) : <><UserPlus size={12} /> Agregar: no se detectó que interviniera</>}
                      </p>
                    </div>
                    {on && (
                      <input type="number" min={0} inputMode="numeric" value={cifras[k] ?? 0}
                        onChange={e => setCifras(c => ({ ...c, [k]: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))) }))}
                        aria-label={`Experiencia para ${nombre(k)}`}
                        className="w-24 h-9 px-2 rounded-lg bg-relleno text-right tabular-nums text-[15px] focus:outline-none focus:ring-2 focus:ring-tinte/50" />
                    )}
                  </div>
                  {on && sinInvocado(k) && (
                    <p className="mt-1.5 ml-8 flex items-start gap-1.5 text-[12px] text-aviso">
                      <AlertTriangle size={13} className="shrink-0 mt-px" />
                      No tiene ningún Pokémon invocado. ¿Merece la experiencia? Si lo dejas marcado, la recibe igual.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          {marcados.length > 0 && sobra !== 0 && (
            <p className={`text-[12px] mt-1.5 ${sobra < 0 ? 'text-peligro' : 'text-texto-2'}`}>
              {sobra < 0 ? `Te pasas por ${miles(-sobra)} XP del total.` : `Quedan ${miles(sobra)} XP sin repartir.`}
            </p>
          )}
        </div>
      </div>
    </Hoja>
  )
}

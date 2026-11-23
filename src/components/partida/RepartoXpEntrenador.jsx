import { useEffect, useState } from 'react'
import { Sparkles, ArrowUp, Archive, AlertTriangle } from 'lucide-react'
import { apiFetch } from '../../api'
import Hoja from '../ui/Hoja'
import Boton from '../ui/Boton'

const miles = (n) => Number(n || 0).toLocaleString('es')
const repartoIgual = (total, n) => {
  if (!n) return []
  const base = Math.floor(total / n)
  const resto = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0))
}
const spriteDe = (p) => (p.pokemon_is_shiny && p.pokemon_media_sprite_shiny) ? p.pokemon_media_sprite_shiny : (p.pokemon_media_sprite || p.pokemon_media_main)

/**
 * Experiencia en mesa, lado del entrenador (plan-xp-y-mesa, etapa 4 parte D).
 *
 * - Su parte (la que le asignó el DM) va al Pokémon invocado; si solo hay uno,
 *   solo confirma. Sin invocado (el DM se la dio igual) elige entre los del
 *   cinturón y puede repartirla.
 * - La app sube de a un nivel: lo que no cabe queda guardado y se ofrece otra
 *   vez cuando ese Pokémon completa las mejoras de su nivel. En el nivel 20 se
 *   pierde.
 * Todo vive en el back: si se cae la sesión, vuelve a salir al entrar.
 */
export default function RepartoXpEntrenador({ partidaId, personajeId, pokemonInvocado = null, revisar, onHecho }) {
  const [datos, setDatos] = useState(null)      // { pendientes, guardadas }
  const [cinturon, setCinturon] = useState([])
  const [resultado, setResultado] = useState(null) // tras confirmar: qué pasó con cada Pokémon
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!partidaId || !personajeId) return
    let vigente = true
    apiFetch(`/partida/${partidaId}/xp/personaje/${personajeId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!vigente || !d) return
        setDatos(d)
        if (d.pendientes?.length) {
          apiFetch(`/personaje/${personajeId}/pokemon?en_equipo=true`).then(r => r.json())
            .then(l => { if (vigente) setCinturon(Array.isArray(l) ? l : []) }).catch(() => {})
        }
      })
      .catch(() => {})
    return () => { vigente = false }
  }, [partidaId, personajeId, revisar, tick])

  const terminar = () => { setResultado(null); setTick(t => t + 1); onHecho?.() }

  if (resultado) {
    return (
      <Hoja z="z-[84]" ancho="sm:max-w-sm" titulo="Experiencia sumada"
        pie={<div className="flex justify-end"><Boton onClick={terminar}>Entendido</Boton></div>}>
        <ul className="space-y-3">
          {resultado.map(r => (
            <li key={r.id_personaje_pokemon} className="rounded-xl bg-superficie px-3 py-2.5 space-y-1">
              <p className="text-[15px] font-semibold">{r.nombre}</p>
              {r.error && <p className="text-[13px] text-peligro">No se pudo sumar: inténtalo de nuevo más tarde.</p>}
              {r.aplicar > 0 && <p className="text-[13px] text-ok">+{miles(r.aplicar)} XP</p>}
              {r.leveled_up && (
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-tinte">
                  <ArrowUp size={14} /> ¡Subió a nivel {r.pokemon_level}! Completa sus mejoras.
                </p>
              )}
              {r.guardar > 0 && (
                <p className="flex items-start gap-1.5 text-[13px] text-texto-2">
                  <Archive size={14} className="shrink-0 mt-px" />
                  {miles(r.guardar)} XP guardada: se sumará cuando complete las mejoras de su nivel.
                </p>
              )}
              {r.perder > 0 && (
                <p className="flex items-start gap-1.5 text-[13px] text-aviso">
                  <AlertTriangle size={14} className="shrink-0 mt-px" />
                  {miles(r.perder)} XP no se pueden sumar: ya está en el nivel 20.
                </p>
              )}
            </li>
          ))}
        </ul>
      </Hoja>
    )
  }

  const parte = datos?.pendientes?.[0]
  if (parte) {
    const invocado = pokemonInvocado != null ? cinturon.find(p => String(p.id_personaje_pokemon) === String(pokemonInvocado)) : null
    const candidatos = invocado ? [invocado] : cinturon
    return (
      <VentanaParte key={parte.id_reparto} parte={parte} candidatos={candidatos} conInvocado={!!invocado}
        quedan={datos.pendientes.length - 1} busy={busy} error={error}
        onConfirmar={async (asignacion) => {
          setBusy(true); setError('')
          const r = await apiFetch(`/partida/${partidaId}/xp/reparto/${parte.id_reparto}/asignar`, {
            method: 'POST', body: JSON.stringify({ asignacion }),
          }).catch(() => null)
          setBusy(false)
          const j = await r?.json().catch(() => null)
          if (!r?.ok) { setError(j?.error || 'No se pudo sumar. Intenta de nuevo.'); return }
          const nombre = Object.fromEntries(cinturon.map(p => [String(p.id_personaje_pokemon), p.pokemon_apodo]))
          setResultado((j.resultados || []).map(x => ({ ...x, nombre: nombre[String(x.id_personaje_pokemon)] || 'Tu Pokémon' })))
        }} />
    )
  }

  // Experiencia guardada de un Pokémon que ya completó las mejoras de su nivel
  const guardada = datos?.guardadas?.find(g => !g.bloqueada)
  if (guardada) {
    return (
      <Hoja z="z-[84]" ancho="sm:max-w-sm" titulo="Experiencia guardada"
        pie={
          <div className="space-y-2">
            {error && <p className="text-[13px] text-peligro">{error}</p>}
            <div className="flex justify-end">
              <Boton disabled={busy} onClick={async () => {
                setBusy(true); setError('')
                const r = await apiFetch(`/partida/${partidaId}/xp/personaje/${personajeId}/guardada/${guardada.id_personaje_pokemon}`, { method: 'POST' }).catch(() => null)
                setBusy(false)
                const j = await r?.json().catch(() => null)
                if (!r?.ok) { setError(j?.error || 'No se pudo sumar. Intenta de nuevo.'); return }
                setResultado([{ ...j.resultado, nombre: guardada.pokemon_apodo }])
              }}>Sumar a {guardada.pokemon_apodo}</Boton>
            </div>
          </div>
        }>
        <p className="text-[15px]">
          <b>{guardada.pokemon_apodo}</b> (nv. {guardada.pokemon_level}) tiene <b>{miles(guardada.xp_guardada)} XP</b> guardada
          de un reparto anterior. Ya completó las mejoras de su nivel, así que se puede sumar.
        </p>
      </Hoja>
    )
  }
  return null
}

function VentanaParte({ parte, candidatos, conInvocado, quedan, busy, error, onConfirmar }) {
  const total = Number(parte.reparto_xp)
  const [marcados, setMarcados] = useState(() => candidatos.length === 1 ? [String(candidatos[0].id_personaje_pokemon)] : [])
  const [cifras, setCifras] = useState(() => candidatos.length === 1 ? { [String(candidatos[0].id_personaje_pokemon)]: total } : {})
  // El cinturón llega después de la parte: con un solo candidato se marca solo
  const unico = candidatos.length === 1 ? String(candidatos[0].id_personaje_pokemon) : null
  if (unico && !marcados.includes(unico) && marcados.length === 0) {
    setMarcados([unico]); setCifras({ [unico]: total })
  }
  const alternar = (k) => {
    const nuevos = marcados.includes(k) ? marcados.filter(x => x !== k) : [...marcados, k]
    setMarcados(nuevos)
    const partes = repartoIgual(total, nuevos.length)
    setCifras(Object.fromEntries(nuevos.map((x, i) => [x, partes[i]])))
  }
  const suma = marcados.reduce((s, k) => s + (Number(cifras[k]) || 0), 0)
  const valido = marcados.length > 0 && suma === total

  const motivo = parte.xp_motivo === 'captura' ? 'por atrapar a' : 'por'
  return (
    <Hoja z="z-[84]" ancho="sm:max-w-md"
      titulo={<span className="flex items-center gap-2"><Sparkles size={18} className="text-tinte" /> ¡Ganaste experiencia!</span>}
      pie={
        <div className="space-y-2">
          {error && <p className="text-[13px] text-peligro">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[12px] ${suma === total ? 'text-texto-2' : 'text-aviso'}`}>
              {candidatos.length > 1 && (suma === total ? 'Repartida completa' : `Repartida ${miles(suma)} de ${miles(total)}`)}
            </p>
            <Boton disabled={!valido || busy}
              onClick={() => onConfirmar(marcados.map(k => ({ id_personaje_pokemon: Number(k), xp: Number(cifras[k]) || 0 })))}>
              Confirmar
            </Boton>
          </div>
        </div>
      }>
      <div className="space-y-4">
        <div>
          <p className="text-[28px] font-bold tracking-[-.02em] tabular-nums leading-none">
            {miles(total)} <span className="text-[15px] font-semibold text-texto-2">XP</span>
          </p>
          <p className="text-[13px] text-texto-2 mt-1">
            {motivo} {parte.xp_pokemon} (nv. {parte.xp_nivel}){quedan > 0 && ` · tienes ${quedan} más por repartir`}
          </p>
        </div>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-texto-2 mb-1.5">
            {conInvocado ? 'Va para tu Pokémon invocado'
              : candidatos.length === 1 ? 'Sin Pokémon invocado: va para el de tu cinturón'
              : candidatos.length ? 'Sin Pokémon invocado: elige entre tu cinturón' : 'Cargando tus Pokémon…'}
          </p>
          <ul className="rounded-xl bg-superficie divide-y divide-separador overflow-hidden">
            {candidatos.map(p => {
              const k = String(p.id_personaje_pokemon)
              const on = marcados.includes(k)
              return (
                <li key={k} className="flex items-center gap-3 px-3 py-2">
                  {candidatos.length > 1 && (
                    <input type="checkbox" checked={on} onChange={() => alternar(k)} aria-label={`Dar experiencia a ${p.pokemon_apodo}`}
                      className="w-5 h-5 accent-[#7F00B2] shrink-0" />
                  )}
                  <img src={spriteDe(p)} alt="" className="w-10 h-10 object-contain shrink-0" onError={e => { e.target.style.opacity = '0.2' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate">{p.pokemon_apodo}</p>
                    <p className="text-[12px] text-texto-2">Nivel {p.pokemon_level}</p>
                  </div>
                  {on && candidatos.length > 1 && (
                    <input type="number" min={0} inputMode="numeric" value={cifras[k] ?? 0}
                      onChange={e => setCifras(c => ({ ...c, [k]: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))) }))}
                      aria-label={`Experiencia para ${p.pokemon_apodo}`}
                      className="w-24 h-9 px-2 rounded-lg bg-relleno text-right tabular-nums text-[15px] focus:outline-none focus:ring-2 focus:ring-tinte/50" />
                  )}
                </li>
              )
            })}
          </ul>
          <p className="text-[12px] text-texto-2 mt-1.5">
            Se suma de a un nivel: si sobra, queda guardada hasta que completes las mejoras de su nivel.
          </p>
        </div>
      </div>
    </Hoja>
  )
}

import { useEffect, useState } from 'react'
import { Check, Dices, X } from 'lucide-react'
import { apiFetch } from '../api'
import { construirSkillsTrainer, statModPokemon } from '../lib/trainerStats'
import { claveBola, CONDICION_BOLA, SKILL_BOLA, NOTA_BOLA } from '../lib/captura'
import { useDados } from './dados/dadosContext'
import PokeballSpinner from './PokeballSpinner'
import { desventajaPrueba } from '../lib/estados'

const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`)

/**
 * Ventana de la captura automática. Sale después de elegir la pokébola y
 * antes de lanzarla: el jugador mete su d20 (o lo tira con los dados 3D) y
 * el servidor resuelve contra la DC. La DC no se muestra antes de tirar.
 *
 * El bono es el Animal Handling de la ficha, con feats, especialidades y ruta
 * (construirSkillsTrainer, lo mismo que usa el panel de combate).
 */
export default function CapturaTirada({ partidaId, personajeId, pokemonInvocado = null, target, ball, onCancelar, onResultado }) {
  const clave = claveBola(ball?.item_name)
  const esMaster = clave === 'master'
  const condicion = CONDICION_BOLA[clave] || null
  const skillBola = SKILL_BOLA[clave] || null
  const dados = useDados()

  const [cargando, setCargando] = useState(true)
  const [animal, setAnimal] = useState(0)
  const [bonoBola, setBonoBola] = useState(0)
  const [ventaja, setVentaja] = useState(false)
  // Envenenado / Retroceso: la prueba va con desventaja (se anulan con la ventaja)
  const [desvEstado, setDesvEstado] = useState(null)
  const [cumple, setCumple] = useState(false)
  const [turnos, setTurnos] = useState('0')
  const [d20, setD20] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Dormido es un estado alterado: con la Dream Ball, marcarlo también da ventaja
  const conVentaja = ventaja || (clave === 'dream' && cumple)

  useEffect(() => {
    let cancelado = false
    const pedirFicha = apiFetch(`/personaje/${personajeId}/full`).then(r => r.json()).then(d => {
      if (cancelado) return
      const { skills } = construirSkillsTrainer(d)
      const mod = (nombre) => skills.find(s => s.name?.toLowerCase() === nombre.toLowerCase())?.mod ?? 0
      setAnimal(mod('Animal Handling'))
      setDesvEstado(desventajaPrueba(d.personaje_estados))
      if (skillBola) setBonoBola(mod(skillBola))
    })
    const pedirPoke = (clave === 'love' && pokemonInvocado != null)
      ? apiFetch(`/personaje/${personajeId}/pokemon/${pokemonInvocado}`).then(r => r.json())
          .then(d => { if (!cancelado) setBonoBola(2 * statModPokemon(d, 'cha')) })
      : Promise.resolve()
    Promise.all([pedirFicha, pedirPoke])
      .catch(() => { if (!cancelado) setError('No se pudo leer tu ficha: el bono queda en 0') })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [personajeId, pokemonInvocado, clave, skillBola])

  const dado = Number(d20)
  const valido = esMaster || (Number.isInteger(dado) && dado >= 1 && dado <= 20)

  const tirarDado = () => {
    if (!dados) return
    dados.tirar('1d20', { etiqueta: 'captura', modo: conVentaja && !desvEstado ? 'ventaja' : !conVentaja && desvEstado ? 'desventaja' : null })
      .then(r => setD20(String(r.usados.reduce((a, v) => a + v, 0))))
      .catch(() => {})
  }

  const lanzar = async () => {
    if (!valido || busy || cargando) return
    setBusy(true); setError('')
    try {
      const res = await apiFetch(`/partida/${partidaId}/captura`, {
        method: 'POST',
        body: JSON.stringify({
          id_campo: target.uid, id_personaje: personajeId, id_personaje_equipo: ball.id_personaje_equipo,
          d20: esMaster ? 0 : dado, bono: animal, ventaja: conVentaja && !desvEstado,
          condicion: cumple, turnos: Number(turnos) || 0, bono_bola: bonoBola,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo lanzar la pokébola')
      onResultado(data)
    } catch (e) {
      setError(e.message || 'No se pudo lanzar la pokébola')
      setBusy(false)
    }
  }

  const nombre = target?.hidden ? '???' : target?.name

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 animate-velo">
      <div className="bg-fondo text-texto border border-peligro/40 animate-hoja rounded-t-hoja sm:rounded-hoja w-full max-w-xs shadow-hoja overflow-hidden">
        <div className="px-5 py-4 border-b border-separador flex items-center gap-3">
          {ball?.item_media_sprite
            ? <img src={ball.item_media_sprite} alt="" className="w-8 h-8 object-contain shrink-0" />
            : <Dices size={18} className="text-tinte shrink-0" />}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-sm leading-tight">Captura</h3>
            <p className="text-[11px] text-texto-2 truncate">{ball?.item_name} a {nombre}</p>
          </div>
          <button onClick={onCancelar} disabled={busy} title="Cancelar" className="shrink-0 text-texto-2 hover:text-white disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-10 text-texto-2 text-sm">
            <PokeballSpinner size={16} className="mr-2" /> Leyendo tu ficha...
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {NOTA_BOLA[clave] && <p className="text-[11px] text-texto-2">{NOTA_BOLA[clave]}</p>}

            {!esMaster && (
              <>
                <label className="flex items-start gap-2 text-xs text-texto cursor-pointer">
                  <input type="checkbox" checked={conVentaja} disabled={clave === 'dream' && cumple}
                    onChange={e => setVentaja(e.target.checked)} className="mt-0.5 accent-red-600" />
                  <span>El Pokémon tiene un estado alterado <span className="text-texto-2">(tiras con ventaja)</span></span>
                </label>

                {condicion && (
                  <label className="flex items-start gap-2 text-xs text-texto cursor-pointer">
                    <input type="checkbox" checked={cumple} onChange={e => setCumple(e.target.checked)} className="mt-0.5 accent-red-600" />
                    <span>{condicion.texto} <span className="text-texto-2">(DC −{condicion.descuento})</span></span>
                  </label>
                )}

                {clave === 'timer' && (
                  <label className="flex items-center justify-between gap-2 text-xs text-texto">
                    <span>Turnos concentrado</span>
                    <input type="number" min="0" max="10" value={turnos}
                      onChange={e => setTurnos(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-16 px-2 py-1 text-center text-white bg-superficie border border-separador rounded-lg" />
                  </label>
                )}

                {(skillBola || clave === 'love') && (
                  <p className="text-[11px] text-texto-2">
                    {clave === 'love'
                      ? (pokemonInvocado == null ? 'No tienes un Pokémon invocado: la Love Ball no descuenta nada.' : `Tu Pokémon descuenta ${fmt(bonoBola)} a la DC.`)
                      : `Tu ${skillBola} descuenta ${fmt(bonoBola)} a la DC.`}
                  </p>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-texto-2 uppercase tracking-wide mb-1">Resultado del d20</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" max="20" value={d20} autoFocus
                      onChange={e => setD20(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={e => { if (e.key === 'Enter' && valido) lanzar() }}
                      placeholder="1 - 20"
                      className="w-full px-3 py-2 text-lg font-black text-center text-white bg-superficie border border-separador rounded-xl focus:outline-none focus:ring-2 focus:ring-tinte/60" />
                    {dados && (
                      <button type="button" onClick={tirarDado} disabled={dados.tirando}
                        title={conVentaja ? 'Tirar 2d20 y quedarse con el mayor' : 'Tirar 1d20'}
                        className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-lg bg-acento hover:bg-acento-hover text-white shadow disabled:opacity-40 transition-colors">
                        <Dices size={18} />
                      </button>
                    )}
                  </div>
                  {conVentaja && !desvEstado && <p className="mt-1 text-[11px] text-tinte">Con ventaja: tira dos d20 y anota el mayor.</p>}
                  {desvEstado && !conVentaja && <p className="mt-1 text-[11px] text-amber-300">⬇ Desventaja · {desvEstado}: tira dos d20 y anota el menor.</p>}
                  {desvEstado && conVentaja && <p className="mt-1 text-[11px] text-texto-2">Ventaja y desventaja ({desvEstado}) se anulan: un solo d20.</p>}
                </div>

                <p className="text-[11px] text-texto-2">
                  Tu Animal Handling es <span className="font-bold text-tinte">{fmt(animal)}</span>, se suma solo.
                </p>
                <div className="flex items-center justify-center gap-2 py-1">
                  <span className="text-[11px] text-texto-2">Total</span>
                  <span className={`text-2xl font-black tabular-nums ${valido ? 'text-tinte' : 'text-texto-2'}`}>
                    {valido ? dado + animal : '—'}
                  </span>
                </div>
              </>
            )}

            {error && <p className="text-xs text-tinte font-medium">{error}</p>}
          </div>
        )}

        <div className="px-5 py-3 border-t border-separador flex gap-2">
          <button onClick={onCancelar} disabled={busy}
            className="flex-1 text-sm font-bold text-texto bg-superficie hover:bg-relleno-2 disabled:opacity-40 px-4 py-2 rounded-xl transition-colors">
            Cancelar
          </button>
          <button onClick={lanzar} disabled={!valido || busy || cargando}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-acento hover:bg-acento-hover
                       disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors">
            {busy ? <PokeballSpinner size={15} /> : <Check size={15} />} Lanzar
          </button>
        </div>
      </div>
    </div>
  )
}

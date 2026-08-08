import { useEffect, useState } from 'react'
import { X, BedDouble, Loader2 } from 'lucide-react'
import { apiFetch } from '../api'

// Ventana de descanso del entrenador.
//
// El DM aprueba el descanso en la mesa, no en la app: por eso ambos botones
// pasan primero por una confirmación que solo deja seguir si dice que sí.
//
// El largo lo pueden tomar varios a la vez (casillas); el corto lo toma uno
// solo (radio) y además gasta dados de golpe con una tirada que escribe el
// jugador, igual que en la subida de nivel.
//
// Pasos: menu → confirma → elige → [corto: dados → tirada] → listo
export default function DescansoModal({ personajeId, onClose, onDone }) {
  const [paso, setPaso]   = useState('menu')
  const [tipo, setTipo]   = useState(null)      // 'long' | 'short'
  const [data, setData]   = useState(null)      // { entrenador, pokemons }
  const [sel, setSel]     = useState([])        // ids elegidos (largo)
  const [uno, setUno]     = useState(null)      // elegido (corto)
  const [dados, setDados] = useState(1)
  const [tirada, setTirada] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState(null)

  useEffect(() => {
    let vivo = true
    apiFetch(`/personaje/${personajeId}/rest`)
      .then(r => r.json())
      .then(d => { if (vivo) setData(d) })
      .catch(() => { if (vivo) setError('No se pudo cargar el grupo') })
    return () => { vivo = false }
  }, [personajeId])

  const ENTRENADOR = 'trainer'
  const nombreDe = clave => clave === ENTRENADOR
    ? (data?.entrenador?.nombre || 'Entrenador')
    : (data?.pokemons.find(p => p.id === clave)?.apodo || 'Pokémon')

  // Dado y disponibles del elegido en el descanso corto
  const elegido = uno === ENTRENADOR ? data?.entrenador : data?.pokemons.find(p => p.id === uno)
  const maxTirada = Math.max(1, dados) * (elegido?.cara || 6)

  const toggle = clave => setSel(prev => prev.includes(clave) ? prev.filter(x => x !== clave) : [...prev, clave])

  const empezar = t => { setTipo(t); setError(''); setPaso('confirma') }

  const confirmarDM = si => {
    if (!si) return onClose()
    setSel([]); setUno(null); setDados(1); setTirada(''); setError('')
    setPaso('elige')
  }

  const enviarLargo = async () => {
    setEnviando(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/rest/long`, {
        method: 'POST',
        body: JSON.stringify({
          entrenador: sel.includes(ENTRENADOR),
          pokemons: sel.filter(x => x !== ENTRENADOR),
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error || 'No se pudo aplicar el descanso'); return }
      setHecho({ tipo: 'long', ...j })
      setPaso('listo')
      onDone?.()
    } catch { setError('No se pudo aplicar el descanso') }
    finally { setEnviando(false) }
  }

  const enviarCorto = async () => {
    const n = Number(tirada)
    if (!Number.isFinite(n) || n < dados || n > maxTirada) {
      setError(`La tirada debe estar entre ${dados} y ${maxTirada}`)
      return
    }
    setEnviando(true); setError('')
    try {
      const res = await apiFetch(`/personaje/${personajeId}/rest/short`, {
        method: 'POST',
        body: JSON.stringify({
          objetivo: uno === ENTRENADOR ? 'trainer' : 'pokemon',
          idpp: uno === ENTRENADOR ? null : uno,
          dados, resultado: n,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error || 'No se pudo aplicar el descanso'); return }
      setHecho({ tipo: 'short', nombre: nombreDe(uno), ...j })
      setPaso('listo')
      onDone?.()
    } catch { setError('No se pudo aplicar el descanso') }
    finally { setEnviando(false) }
  }

  const titulo = paso === 'dados' || paso === 'tirada' ? 'Short rest'
    : paso === 'listo' ? 'Descanso aplicado'
    : 'Tomar un descanso'

  const filas = data ? [
    { clave: ENTRENADOR, nombre: data.entrenador.nombre, sub: `Entrenador · ${data.entrenador.dados}/${data.entrenador.dados_max} dados` },
    ...data.pokemons.map(p => ({ clave: p.id, nombre: p.apodo, sub: `${p.dados}/${p.dados_max} dados` })),
  ] : []

  // En el corto solo tiene sentido quien conserve algún dado
  const filasCorto = filas.filter(f => (f.clave === ENTRENADOR ? data.entrenador.dados : data.pokemons.find(p => p.id === f.clave)?.dados) > 0)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <BedDouble size={18} className="text-gray-500" />
            {titulo}
            {(paso === 'dados' || paso === 'tirada') && (
              <span className="text-gray-500 font-normal truncate">· {nombreDe(uno)}</span>
            )}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          {!data && !error && (
            <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cargando…</p>
          )}

          {/* Menú */}
          {paso === 'menu' && data && (
            <div className="space-y-2">
              <button onClick={() => empezar('long')}
                className="w-full text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg transition-colors">
                Long rest
              </button>
              <button onClick={() => empezar('short')}
                className="w-full text-sm font-bold text-gray-800 bg-gray-200 hover:bg-gray-300 px-4 py-2.5 rounded-lg transition-colors">
                Short rest
              </button>
            </div>
          )}

          {/* Visto bueno del DM */}
          {paso === 'confirma' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-800">
                ¿El {tipo === 'long' ? 'long' : 'short'} rest está aprobado por el DM?
              </p>
              <div className="flex gap-2">
                <button onClick={() => confirmarDM(true)}
                  className="flex-1 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors">Sí</button>
                <button onClick={() => confirmarDM(false)}
                  className="flex-1 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg transition-colors">No</button>
              </div>
            </div>
          )}

          {/* Quiénes descansan */}
          {paso === 'elige' && data && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">
                {tipo === 'long' ? 'Quiénes tomarán el descanso largo' : 'Quién toma el descanso corto'}
              </p>
              <div className="space-y-1">
                {(tipo === 'long' ? filas : filasCorto).map(f => (
                  <label key={f.clave} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type={tipo === 'long' ? 'checkbox' : 'radio'}
                      name="descansante"
                      checked={tipo === 'long' ? sel.includes(f.clave) : uno === f.clave}
                      onChange={() => tipo === 'long' ? toggle(f.clave) : setUno(f.clave)}
                      className="shrink-0 accent-indigo-600" />
                    <span className="min-w-0">
                      <span className="block text-sm text-gray-900 truncate">{f.nombre}</span>
                      <span className="block text-[11px] text-gray-500">{f.sub}</span>
                    </span>
                  </label>
                ))}
                {tipo === 'short' && filasCorto.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Nadie conserva dados de golpe.</p>
                )}
              </div>
            </div>
          )}

          {/* Corto: cuántos dados */}
          {paso === 'dados' && elegido && (
            <div className="space-y-3">
              <p className="text-sm text-gray-800">¿Cuántos hit dice va a usar?</p>
              <input type="number" min={1} max={elegido.dados} value={dados}
                onChange={e => setDados(Math.min(elegido.dados, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                className="w-full px-3 py-2 text-sm text-center text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <p className="text-[11px] text-gray-500">Disponibles: {elegido.dados}</p>
            </div>
          )}

          {/* Corto: la tirada */}
          {paso === 'tirada' && elegido && (
            <div className="space-y-3">
              <p className="text-sm text-gray-800">
                Lanza <span className="font-bold">{dados}</span> {dados === 1 ? 'dado' : 'dados'} de{' '}
                <span className="font-bold">{elegido.hit_dice || `d${elegido.cara}`}</span>
              </p>
              <input type="number" min={dados} max={maxTirada} value={tirada} autoFocus
                onChange={e => setTirada(e.target.value)}
                placeholder={`Entre ${dados} y ${maxTirada}`}
                className="w-full px-3 py-2 text-sm text-center text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <p className="text-[11px] text-gray-500">El resultado se suma a los puntos de golpe, sin pasar del máximo.</p>
            </div>
          )}

          {/* Resultado */}
          {paso === 'listo' && hecho && (
            <div className="space-y-2 text-sm text-gray-800">
              {hecho.tipo === 'long' ? (
                <>
                  <p>Descanso largo aplicado.</p>
                  <ul className="text-[12px] text-gray-600 list-disc pl-5 space-y-0.5">
                    {hecho.entrenador && <li>{data.entrenador.nombre} recuperado</li>}
                    {hecho.pokemons?.length > 0 && <li>{hecho.pokemons.length} Pokémon recuperados</li>}
                    {hecho.movimientos > 0 && <li>{hecho.movimientos} movimientos con sus PP al tope</li>}
                    {hecho.recursos > 0 && <li>{hecho.recursos} recursos de ruta al máximo</li>}
                  </ul>
                </>
              ) : (
                <>
                  <p><span className="font-semibold">{hecho.nombre}</span> recuperó {hecho.curado} PV.</p>
                  <p className="text-[12px] text-gray-600">Queda en {hecho.current_hp}/{hecho.max_hp} · {hecho.dados} dados sin usar.</p>
                </>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600 font-medium mt-3">{error}</p>}
        </div>

        {/* Pie */}
        {paso !== 'confirma' && paso !== 'menu' && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
            {paso === 'listo' ? (
              <button onClick={onClose}
                className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors">Cerrar</button>
            ) : (
              <>
                <button onClick={onClose} className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
                {paso === 'elige' && tipo === 'long' && (
                  <button onClick={enviarLargo} disabled={sel.length === 0 || enviando}
                    className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
                    {enviando ? 'Aplicando…' : 'Confirmar'}
                  </button>
                )}
                {paso === 'elige' && tipo === 'short' && (
                  <button onClick={() => { setPaso('dados'); setDados(1) }} disabled={uno == null}
                    className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
                    Confirmar
                  </button>
                )}
                {paso === 'dados' && (
                  <button onClick={() => { setPaso('tirada'); setTirada('') }}
                    className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors">
                    Continuar
                  </button>
                )}
                {paso === 'tirada' && (
                  <button onClick={enviarCorto} disabled={enviando || tirada === ''}
                    className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors">
                    {enviando ? 'Aplicando…' : 'Confirmar'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

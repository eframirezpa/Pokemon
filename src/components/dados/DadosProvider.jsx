import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { X, Dices } from 'lucide-react'
import { DadosContext } from './dadosContext'
import { CARAS, parseNotacion, resolver, detalle, tiradaPlana, notacion as armarNotacion } from '../../lib/dados'

const CONTENEDOR_ID = 'dados-3d'
const VISIBLE_MS = 2600 // lo que quedan los dados y el resultado en pantalla

/**
 * Tirador de dados de la partida. Los dados 3D (@3d-dice/dice-box, sobre
 * BabylonJS) se cargan recién en la primera tirada: es una librería pesada y
 * la mayoría de las sesiones no la necesitaría al entrar. Si el navegador no
 * puede con ella (sin WebGL...), se tira igual sin animación.
 *
 * onTirada recibe cada tirada pública para avisar a la mesa y registrarla;
 * las ocultas (solo el máster) se quedan aquí.
 */
export default function DadosProvider({ children, nombre, puedeOcultar = false, onTirada }) {
  const cajaRef = useRef(null)     // instancia de DiceBox, o false si no se pudo cargar
  const cargaRef = useRef(null)    // promesa de carga en curso
  const ocultarRef = useRef(null)
  const [tirando, setTirando] = useState(false)
  const [resultado, setResultado] = useState(null) // { etiqueta, r, oculta }
  const [bandeja, setBandeja] = useState(false)

  const cargarCaja = useCallback(() => {
    if (cajaRef.current !== null) return Promise.resolve(cajaRef.current)
    if (!cargaRef.current) {
      cargaRef.current = import('@3d-dice/dice-box')
        .then(async ({ default: DiceBox }) => {
          const caja = new DiceBox({
            container: `#${CONTENEDOR_ID}`,
            assetPath: '/dice-box/',
            theme: 'default',
            themeColor: '#dc2626',
            scale: 6,
          })
          await caja.init()
          cajaRef.current = caja
          return caja
        })
        .catch((e) => {
          console.warn('Dados 3D no disponibles, se tira sin animación:', e)
          cajaRef.current = false
          return false
        })
    }
    return cargaRef.current
  }, [])

  const tirar = useCallback(async (texto, { etiqueta = null, oculta = false, modo = null } = {}) => {
    const n = parseNotacion(texto)
    if (!n) throw new Error(`Tirada no válida: ${texto}`)
    // Ventaja / desventaja: dos d20 y se queda uno
    const conModo = modo && n.caras === 20 && n.cantidad === 1
    const cantidad = conModo ? 2 : n.cantidad

    setTirando(true)
    if (ocultarRef.current) clearTimeout(ocultarRef.current)
    setResultado(null)
    try {
      const caja = await cargarCaja()
      let valores
      if (caja) {
        caja.clear()
        const dados = await caja.roll(`${cantidad}d${n.caras}`)
        valores = (Array.isArray(dados) ? dados : []).map(d => Number(d.value)).filter(Number.isFinite)
        if (valores.length !== cantidad) valores = tiradaPlana(cantidad, n.caras)
      } else {
        valores = tiradaPlana(cantidad, n.caras)
      }
      const r = resolver(n, valores, conModo ? modo : null)
      setResultado({ etiqueta, r, oculta })
      if (!oculta) {
        const motivo = etiqueta ? ` ${etiqueta}` : ''
        onTirada?.({ nombre, etiqueta, total: r.total, detalle: detalle(r), texto: `${nombre} tiró${motivo}: ${detalle(r)}` })
      }
      ocultarRef.current = setTimeout(() => {
        setResultado(null)
        if (cajaRef.current) cajaRef.current.clear()
      }, VISIBLE_MS)
      return r
    } finally {
      setTirando(false)
    }
  }, [cargarCaja, nombre, onTirada])

  useEffect(() => () => { if (ocultarRef.current) clearTimeout(ocultarRef.current) }, [])

  const valor = useMemo(() => ({ tirar, tirando, abrirBandeja: () => setBandeja(true) }), [tirar, tirando])

  return (
    <DadosContext.Provider value={valor}>
      {children}

      {/* Lienzo de los dados: encima de todo, pero sin tapar los clics */}
      <div id={CONTENEDOR_ID} className="fixed inset-0 z-[200] pointer-events-none [&>canvas]:w-full [&>canvas]:h-full" />

      {resultado && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[201] pointer-events-none animate-event-pop">
          <div className="bg-gray-900/95 border border-gray-600 rounded-2xl px-6 py-3 shadow-2xl text-center">
            {resultado.etiqueta && <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">{resultado.etiqueta}</p>}
            <p className="text-4xl font-black text-white tabular-nums leading-tight">{resultado.r.total}</p>
            <p className="text-xs text-gray-300">{detalle(resultado.r)}</p>
            {resultado.oculta && <p className="text-[10px] font-bold text-purple-300 mt-0.5">Tirada oculta: solo tú la ves</p>}
          </div>
        </div>
      )}

      {bandeja && (
        <BandejaDados puedeOcultar={puedeOcultar} tirando={tirando}
          onCerrar={() => setBandeja(false)}
          onTirar={(n, opciones) => { setBandeja(false); tirar(n, opciones).catch(() => {}) }} />
      )}
    </DadosContext.Provider>
  )
}

/** La bandeja: elegir dado, cantidad, modificador y, en el d20, ventaja. */
function BandejaDados({ puedeOcultar, tirando, onCerrar, onTirar }) {
  const [caras, setCaras] = useState(20)
  const [cantidad, setCantidad] = useState(1)
  const [mod, setMod] = useState(0)
  const [modo, setModo] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [oculta, setOculta] = useState(false)
  const conModo = caras === 20 && cantidad === 1

  const tirar = () => onTirar(armarNotacion({ cantidad, caras, mod }), {
    etiqueta: motivo.trim() || null, oculta: puedeOcultar && oculta, modo: conModo ? modo : null,
  })

  const paso = (set, v, min, max) => set(x => Math.max(min, Math.min(max, x + v)))
  const btn = 'w-8 h-8 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700 font-black'

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2"><Dices size={16} className="text-red-500" /> Tirar dados</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-7 gap-1.5">
            {CARAS.map(c => (
              <button key={c} onClick={() => setCaras(c)}
                className={`py-2 rounded-lg text-xs font-black border transition-colors ${caras === c
                  ? 'bg-red-600 border-red-500 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                d{c}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-gray-400 w-16">Cantidad</span>
              <button className={btn} onClick={() => paso(setCantidad, -1, 1, 10)}>−</button>
              <span className="w-6 text-center text-white font-bold tabular-nums">{cantidad}</span>
              <button className={btn} onClick={() => paso(setCantidad, 1, 1, 10)}>+</button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-gray-400">Mod</span>
              <button className={btn} onClick={() => paso(setMod, -1, -20, 30)}>−</button>
              <span className="w-8 text-center text-white font-bold tabular-nums">{mod > 0 ? `+${mod}` : mod}</span>
              <button className={btn} onClick={() => paso(setMod, 1, -20, 30)}>+</button>
            </div>
          </div>
          {conModo && (
            <div className="grid grid-cols-3 gap-1.5">
              {[[null, 'Normal'], ['ventaja', 'Ventaja'], ['desventaja', 'Desventaja']].map(([v, l]) => (
                <button key={l} onClick={() => setModo(v)}
                  className={`py-1.5 rounded-lg text-xs font-bold border ${modo === v
                    ? 'bg-amber-500 border-amber-400 text-gray-900' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
          <input value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={40} placeholder="Motivo (opcional): Percepción, daño..."
            className="w-full px-3 py-1.5 text-sm text-gray-100 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400" />
          {puedeOcultar && (
            <label className="flex items-center gap-2 text-xs text-gray-300 select-none cursor-pointer">
              <input type="checkbox" checked={oculta} onChange={e => setOculta(e.target.checked)} className="accent-purple-500" />
              Tirada oculta (solo la ves tú, no va al registro)
            </label>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-sm font-black text-gray-300">{armarNotacion({ cantidad, caras, mod })}{conModo && modo ? ` · ${modo}` : ''}</span>
          <button onClick={tirar} disabled={tirando}
            className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-5 py-2 rounded-lg">
            <Dices size={15} /> Tirar
          </button>
        </div>
      </div>
    </div>
  )
}

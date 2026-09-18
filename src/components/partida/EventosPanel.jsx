import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Minus, Plus, X } from 'lucide-react'
import { apiFetch } from '../../api'
import { TONE } from '../../lib/partidaShared'

/* Panel de eventos del master — toggle protegido por contraseña */
const EVENT_PASSWORD = 'ravecalvitomaster'
const EVENTOS = [
  { label: 'Fire',   url: '/evento0/fire.png' },
  { label: 'Forest', url: '/evento0/forest.png' },
  { label: 'Frost',  url: '/evento0/frost.png' },
]

export function EventosPanel({ onBackground, partidaId, onUnlock, counterCfg, counters, onCounter, onLuchar, onLimpiar, presentes = [], onPremiar, onHit, onHeal }) {
  const [open, setOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [asking, setAsking] = useState(false)
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState(false)
  const [chars, setChars] = useState([])          // personajes de la partida
  const [selected, setSelected] = useState([])    // personajes elegidos (máx 2)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [prizeChar, setPrizeChar] = useState(null)     // personaje a premiar (uno)
  const [prizePickerOpen, setPrizePickerOpen] = useState(false)

  // Sonido de ambiente del evento (solo en el dispositivo del master, en loop)
  const audioRef = useRef(null)
  const stopSound = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }
  const playLoop = (src) => {
    stopSound()
    const a = new Audio(src)
    a.loop = true
    a.play().catch(() => {})
    audioRef.current = a
  }
  useEffect(() => () => stopSound(), [])
  const handleEvento = (ev) => {
    onBackground(ev.url)
    if (ev.label === 'Fire') playLoop('/evento0/fuego.mp3')
    else if (ev.label === 'Frost') playLoop('/evento0/nieve.mp3')
    else if (ev.label === 'Forest') stopSound()
  }

  const toggle = () => {
    if (open) { setOpen(false); return }
    if (unlocked) { setOpen(true); return }
    setAsking(true); setErr(false); setPwd('')
  }
  const submit = () => {
    if (pwd === EVENT_PASSWORD) {
      setUnlocked(true); setOpen(true); setAsking(false); setPwd(''); setErr(false)
      onUnlock?.()
    } else { setErr(true) }
  }

  useEffect(() => {
    if (!unlocked || !partidaId) return
    apiFetch(`/personaje/party?id_partida=${partidaId}`)
      .then(r => r.json())
      .then(d => setChars(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [unlocked, partidaId])

  const addChar = (c) => {
    setSelected(prev => (prev.length >= 2 || prev.some(x => x.id_personaje === c.id_personaje)) ? prev : [...prev, c])
    setPickerOpen(false)
  }
  const removeChar = (id) => setSelected(prev => prev.filter(c => c.id_personaje !== id))
  // Personajes activos y conectados a la partida (para luchar y premiar)
  const conectados = chars.filter(c => presentes.some(p => String(p.personaje_id) === String(c.id_personaje)))
  const disponibles = conectados.filter(c => !selected.some(s => s.id_personaje === c.id_personaje))

  return (
    <div className="shrink-0 px-4 pt-3">
      <button onClick={toggle}
        className="w-full flex items-center justify-between gap-1.5 py-2 bg-gray-800 hover:bg-gray-700
                   border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-colors">
        <span>Eventos</span>
        <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {asking && !unlocked && (
        <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contraseña</p>
          <div className="flex items-center gap-2">
            <input type="password" value={pwd} autoFocus
              onChange={e => { setPwd(e.target.value); setErr(false) }}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Contraseña"
              className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50" />
            <button onClick={submit} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shrink-0">Entrar</button>
          </div>
          {err && <p className="text-[11px] text-red-400 mt-1">Contraseña incorrecta</p>}
        </div>
      )}

      {open && unlocked && (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {EVENTOS.map(ev => (
              <button key={ev.url} onClick={() => handleEvento(ev)}
                className="py-2 bg-gray-700 hover:bg-red-600 border border-gray-600 text-gray-200 text-xs font-semibold rounded-xl transition-colors">
                {ev.label}
              </button>
            ))}
          </div>

          {/* Contadores del evento (fire/frost) — solo master */}
          {counterCfg && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['up', 'down'].map(k => {
                const cfg = counterCfg[k]; const t = TONE[cfg.tone]
                return (
                  <div key={k} className={`flex items-center justify-between gap-1 border rounded-xl px-2 py-1.5 ${t.box}`}>
                    <button onClick={() => onCounter(k, -1)} className={`w-7 h-7 shrink-0 rounded-lg text-white flex items-center justify-center ${t.btn}`}><Minus size={14} /></button>
                    <div className="text-center leading-none min-w-0">
                      <p className={`text-[9px] font-black uppercase whitespace-nowrap ${t.text}`}>{cfg.label}</p>
                      <p className={`text-lg font-black ${t.text}`}>{counters[k]}</p>
                    </div>
                    <button onClick={() => onCounter(k, 1)} className={`w-7 h-7 shrink-0 rounded-lg text-white flex items-center justify-center ${t.btn}`}><Plus size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Personajes para luchar (máx. 2) */}
          <div className="mt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Personajes</p>
            <div className="flex items-center gap-2 flex-wrap">
              {selected.map(c => (
                <span key={c.id_personaje} className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-gray-100">
                  {c.nombre_personaje || 'Sin nombre'}
                  <button onClick={() => removeChar(c.id_personaje)} className="text-gray-400 hover:text-red-400" title="Quitar"><X size={12} /></button>
                </span>
              ))}

              {selected.length < 2 && (
                <div className="relative">
                  <button onClick={() => setPickerOpen(o => !o)}
                    className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200">
                    <Plus size={12} /> Personaje
                  </button>
                  {pickerOpen && (
                    <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                      {disponibles.length === 0 ? (
                        <p className="text-[11px] text-gray-500 px-3 py-2 italic">Sin personajes</p>
                      ) : disponibles.map(c => (
                        <button key={c.id_personaje} onClick={() => addChar(c)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                          {c.nombre_personaje || 'Sin nombre'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => { if (selected.length > 0) onLuchar?.(selected) }}
                  disabled={selected.length === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  Luchar
                </button>
                <button
                  onClick={() => { setSelected([]); onLimpiar?.() }}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  Limpiar
                </button>
              </div>
            </div>

            {/* Hit / Heal — resta / suma 1 HP a los que están en combate */}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => onHit?.()}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                Hit
              </button>
              <button
                onClick={() => onHeal?.()}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                Heal
              </button>
            </div>
          </div>

          {/* Premios — entregar item a un personaje (uno) */}
          <div className="mt-3 border-t border-gray-700 pt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Premios</p>
            <div className="flex items-center gap-2 flex-wrap">
              {prizeChar ? (
                <span className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-gray-100">
                  {prizeChar.nombre_personaje || 'Sin nombre'}
                  <button onClick={() => setPrizeChar(null)} className="text-gray-400 hover:text-red-400" title="Quitar"><X size={12} /></button>
                </span>
              ) : (
                <div className="relative">
                  <button onClick={() => setPrizePickerOpen(o => !o)}
                    className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200">
                    <Plus size={12} /> Personaje
                  </button>
                  {prizePickerOpen && (
                    <div className="absolute z-20 mt-1 w-48 max-h-56 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                      {conectados.length === 0 ? (
                        <p className="text-[11px] text-gray-500 px-3 py-2 italic">Sin personajes conectados</p>
                      ) : conectados.map(c => (
                        <button key={c.id_personaje} onClick={() => { setPrizeChar(c); setPrizePickerOpen(false) }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                          {c.nombre_personaje || 'Sin nombre'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="ml-auto">
                <button
                  onClick={() => { if (prizeChar) { onPremiar?.(prizeChar); setPrizeChar(null) } }}
                  disabled={!prizeChar}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  Premiar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

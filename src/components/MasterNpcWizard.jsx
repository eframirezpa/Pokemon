import { useState, useEffect } from 'react'
import { X, Check, Shuffle } from 'lucide-react'
import { apiFetch } from '../api'
import PokeballSpinner from './PokeballSpinner'

const NIVEL_MIN = 1
const NIVEL_MAX = 20
const CARAS = 20   // face1.png … face20.png
const CARAS_LISTA = Array.from({ length: CARAS }, (_, i) => `face${i + 1}.png`)

const urlCara = (archivo) => `/avatars/${archivo}`

/* Rejilla de caras: la misma idea que el selector de avatar del jugador, pero
   sobre los archivos y no sobre la tabla avatar, que solo tiene 14 de las 20. */
function SelectorCara({ actual, onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Elige una cara</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto">
          {CARAS_LISTA.map(cara => (
            <button key={cara} onClick={() => { onPick(cara); onClose() }}
              className={`rounded-xl overflow-hidden border-2 transition-colors ${
                cara === actual ? 'border-red-500 ring-2 ring-red-300' : 'border-transparent hover:border-gray-300'}`}>
              <img src={urlCara(cara)} alt={cara} className="w-full aspect-square object-cover bg-gray-100"
                onError={e => { e.currentTarget.style.opacity = '0.2' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Alta, edición y clonado de un NPC del máster.
 *
 * Al crear se pide primero el nivel, porque de él sale la vida: base 6 más un
 * d6 y un punto por cada nivel por encima del primero. Esa tirada la hace el
 * servidor -para que no dependa del navegador ni se pueda amañar- y llega junto
 * con un apodo y una cara al azar. Todo es editable después menos el nivel: la
 * vida ya se tiró con él y cambiarlo dejaría una vida que no corresponde.
 */
export default function MasterNpcWizard({ mode = 'create', sourceId = null, onClose, onSaved }) {
  const editando = mode === 'edit'
  const [pidiendoNivel, setPidiendoNivel] = useState(mode === 'create')
  const [nivelInput, setNivelInput] = useState('1')
  const [cargando, setCargando] = useState(mode !== 'create')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [eligiendoCara, setEligiendoCara] = useState(false)

  const [level, setLevel]   = useState(1)
  const [apodo, setApodo]   = useState('')
  const [hp, setHp]         = useState('')
  const [avatar, setAvatar] = useState('face1.png')

  // Editar / clonar: se parte del NPC existente
  useEffect(() => {
    if (mode === 'create' || !sourceId) return
    apiFetch(`/master/npc/${sourceId}`).then(r => r.json())
      .then(d => {
        if (!d || !d.id_master_npc) return
        setLevel(Number(d.master_npc_level) || 1)
        setApodo((d.master_npc_apodo || '') + (mode === 'clone' ? ' clon' : ''))
        setHp(String(d.master_npc_hp ?? ''))
        setAvatar(d.master_npc_avatar || 'face1.png')
      })
      .finally(() => setCargando(false))
  }, [mode, sourceId])

  // Nivel aceptado → el servidor propone vida, apodo y cara
  const aceptarNivel = async () => {
    const n = Number(nivelInput)
    if (!Number.isInteger(n) || n < NIVEL_MIN || n > NIVEL_MAX) return
    setCargando(true); setPidiendoNivel(false)
    try {
      const d = await apiFetch(`/master/npc/sugerencia?level=${n}`).then(r => r.json())
      setLevel(d.level ?? n)
      setHp(String(d.hp ?? ''))
      setApodo(d.apodo || '')
      setAvatar(d.avatar || 'face1.png')
    } catch {
      setLevel(n); setError('No se pudo proponer los datos; complétalos a mano')
    } finally {
      setCargando(false)
    }
  }

  // Otro apodo al azar sin tocar el resto
  const otroApodo = async () => {
    try {
      const d = await apiFetch(`/master/npc/sugerencia?level=${level}`).then(r => r.json())
      if (d.apodo) setApodo(d.apodo)
    } catch { /* se queda el que estaba */ }
  }

  const valido = apodo.trim() && String(hp).trim() !== '' && Number(hp) >= 0

  const guardar = async () => {
    if (!valido || guardando) return
    setGuardando(true); setError('')
    try {
      const cuerpo = { apodo: apodo.trim(), hp: Number(hp), avatar, level }
      const res = editando
        ? await apiFetch(`/master/npc/${sourceId}`, { method: 'PATCH', body: JSON.stringify(cuerpo) })
        : await apiFetch('/master/npc', { method: 'POST', body: JSON.stringify(cuerpo) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'No se pudo guardar el NPC')
      onSaved?.(d)
    } catch (e) {
      setError(e.message || 'No se pudo guardar el NPC')
    } finally {
      setGuardando(false)
    }
  }

  // ── Paso previo: el nivel (solo al crear) ──
  if (pidiendoNivel) {
    const n = Number(nivelInput)
    const invalido = !Number.isInteger(n) || n < NIVEL_MIN || n > NIVEL_MAX
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="bg-white rounded-2xl w-full max-w-xs flex flex-col shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Nivel del NPC</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs text-gray-500">De él sale la vida, y no podrá cambiarse después.</p>
            <input type="number" min={NIVEL_MIN} max={NIVEL_MAX} value={nivelInput} autoFocus
              onChange={e => setNivelInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !invalido) aceptarNivel() }}
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
            {invalido && <p className="text-xs text-red-600">El nivel debe estar entre {NIVEL_MIN} y {NIVEL_MAX}.</p>}
          </div>
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button onClick={onClose}
              className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg">Cancelar</button>
            <button onClick={aceptarNivel} disabled={invalido}
              className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
              Aceptar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const titulo = editando ? 'Editar NPC' : mode === 'clone' ? 'Clonar NPC' : 'Nuevo NPC'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !guardando) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[88vh]">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">{titulo}</h3>
          <button onClick={onClose} disabled={guardando} className="text-gray-400 hover:text-gray-700 disabled:opacity-40"><X size={18} /></button>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <PokeballSpinner size={18} className="mr-2" /> Cargando...
          </div>
        ) : (
          <>
            <div className="px-5 py-4 space-y-3 overflow-y-auto">
              {/* Cara: se pulsa para cambiarla, como el avatar del jugador */}
              <div className="flex items-center gap-3">
                <button onClick={() => setEligiendoCara(true)} title="Cambiar la cara"
                  className="shrink-0 rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-red-400 transition-colors">
                  <img src={urlCara(avatar)} alt="Avatar del NPC" className="w-20 h-20 object-cover bg-gray-100"
                    onError={e => { e.currentTarget.style.opacity = '0.2' }} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-600">Avatar</p>
                  <p className="text-[11px] text-gray-400 leading-snug">Pulsa la imagen para elegir otra de las {CARAS}.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Apodo</label>
                <div className="flex items-center gap-2">
                  <input value={apodo} onChange={e => setApodo(e.target.value)} maxLength={60}
                    className="flex-1 min-w-0 px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                  <button onClick={otroApodo} title="Otro nombre al azar"
                    className="shrink-0 p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors">
                    <Shuffle size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nivel</label>
                  {/* No editable: la vida se tiró con este nivel */}
                  <div className="px-3 py-2 text-sm font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded-xl">
                    {level}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Vida</label>
                  <input type="number" min="0" value={hp}
                    onChange={e => setHp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            </div>

            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
              <button onClick={onClose} disabled={guardando}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg disabled:opacity-40">Cancelar</button>
              <button onClick={guardar} disabled={!valido || guardando}
                className="flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-4 py-1.5 rounded-lg transition-colors">
                {guardando ? <PokeballSpinner size={15} /> : <Check size={15} />} Confirmar
              </button>
            </div>
          </>
        )}
      </div>

      {eligiendoCara && (
        <SelectorCara actual={avatar} onPick={setAvatar} onClose={() => setEligiendoCara(false)} />
      )}
    </div>
  )
}

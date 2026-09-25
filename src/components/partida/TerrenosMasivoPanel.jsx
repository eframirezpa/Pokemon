import { useState, useEffect } from 'react'
import { apiFetch } from '../../api'

/* Acciones masivas de terreno: dejar a todos los entrenadores y sus Pokémon sin
   terreno, o ponerles el mismo a todos. Pide un segundo clic para confirmar:
   es fácil de disparar por error en plena partida y afecta a toda la mesa. */
export function TerrenosMasivoPanel({ partidaId, onAfterChange }) {
  const [terrenos, setTerrenos] = useState([])
  const [elegido, setElegido]   = useState('')
  const [confirmar, setConfirmar] = useState(null) // 'quitar' | 'poner' | null
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiFetch('/partida/terrenos').then(r => r.json()).then(d => setTerrenos(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const aplicar = async (terreno) => {
    setBusy(true)
    try {
      const res = await apiFetch(`/partida/${partidaId}/terreno/todos`, { method: 'PATCH', body: JSON.stringify({ terreno }) })
      if (res.ok) onAfterChange?.()
    } finally { setBusy(false); setConfirmar(null) }
  }

  const btn = 'text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <div className="shrink-0 px-4 pt-3">
      <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5">
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Terrenos (entrenadores y sus Pokémon)</p>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={elegido} onChange={e => { setElegido(e.target.value); setConfirmar(null) }}
            className="text-xs text-gray-100 bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400">
            <option value="">Elige un terreno...</option>
            {terrenos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button disabled={!elegido || busy}
            onClick={() => confirmar === 'poner' ? aplicar(elegido) : setConfirmar('poner')}
            className={`${btn} ${confirmar === 'poner' ? 'bg-amber-500 text-gray-900' : 'bg-green-700 hover:bg-green-600 text-white'}`}>
            {confirmar === 'poner' ? '¿Confirmar?' : 'Poner a todos'}
          </button>
          <button disabled={busy}
            onClick={() => confirmar === 'quitar' ? aplicar(null) : setConfirmar('quitar')}
            className={`${btn} ${confirmar === 'quitar' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'}`}>
            {confirmar === 'quitar' ? '¿Confirmar?' : 'Quitar a todos'}
          </button>
        </div>
      </div>
    </div>
  )
}

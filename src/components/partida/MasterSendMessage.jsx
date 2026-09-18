import { useState } from 'react'
import { Send } from 'lucide-react'

/* Componente de envío de mensaje — visible solo para el master */
// compact: variante sin tarjeta ni título, para vivir dentro de la barra superior
export function MasterSendMessage({ onSend, compact = false }) {
  const [text, setText] = useState('')
  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="Escribe un mensaje para los jugadores..."
          className="flex-1 min-w-0 bg-gray-700 text-white text-sm rounded-full px-4 py-1.5
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="w-9 h-9 shrink-0 rounded-full bg-green-500 hover:bg-green-600
                     disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center
                     text-white transition-all shadow-md"
          title="Enviar"
        >
          <Send size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="shrink-0 px-4 pt-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-3 shadow-lg">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enviar mensaje</p>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Escribe un mensaje para los jugadores..."
            className="flex-1 bg-gray-700 text-white text-sm rounded-full px-4 py-2.5
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="w-11 h-11 shrink-0 rounded-full bg-green-500 hover:bg-green-600
                       disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center
                       text-white transition-all shadow-md"
            title="Enviar"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

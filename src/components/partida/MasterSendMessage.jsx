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
          className="flex-1 min-w-0 bg-transparent text-white text-[15px] rounded-full px-3 py-1.5
                     placeholder:text-texto-2 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="w-9 h-9 shrink-0 rounded-full bg-acento hover:bg-acento-hover
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
      <div className="bg-superficie border border-separador rounded-2xl p-3 shadow-lg">
        <p className="text-[10px] font-bold text-texto-2 uppercase tracking-widest mb-2">Enviar mensaje</p>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Escribe un mensaje para los jugadores..."
            className="flex-1 bg-superficie text-texto text-[15px] rounded-full px-4 py-2.5
                       placeholder:text-texto-2 focus:outline-none focus:ring-2 focus:ring-tinte/50"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="w-11 h-11 shrink-0 rounded-full bg-acento hover:bg-acento-hover
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

import { Component } from 'react'

// Un chunk lazy que ya no existe (se desplegó una versión nueva con la pestaña
// abierta) o falló la red: recargar trae el index nuevo y lo arregla.
const esErrorDeChunk = (e) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i
    .test(String(e?.message || e))

const YA_RECARGO = 'eb-recarga-por-chunk'

/* Evita la pantalla en blanco: ante un error de render muestra el mensaje y un
   botón para recargar. Si el error es de un chunk viejo, recarga sola una vez
   (la marca en sessionStorage evita el bucle si el fallo persiste). */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error) {
    console.error('Error de render:', error)
    if (!esErrorDeChunk(error)) return
    try {
      if (sessionStorage.getItem(YA_RECARGO)) return
      sessionStorage.setItem(YA_RECARGO, '1')
    } catch { /* sin sessionStorage: se muestra el mensaje */ return }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-900">
        <div className="max-w-sm text-center">
          <p className="text-white font-bold mb-2">Algo salió mal al cargar la pantalla</p>
          <p className="text-xs text-gray-400 mb-4 break-words">{String(this.state.error?.message || this.state.error)}</p>
          <button onClick={() => { try { sessionStorage.removeItem(YA_RECARGO) } catch { /* noop */ } window.location.reload() }}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-xl">
            Recargar
          </button>
        </div>
      </div>
    )
  }
}

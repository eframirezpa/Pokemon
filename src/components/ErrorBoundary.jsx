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
      <div className="min-h-dvh flex items-center justify-center p-6 bg-fondo text-texto">
        <div className="max-w-sm w-full bg-superficie rounded-hoja px-6 py-7 text-center flex flex-col items-center gap-2">
          <p className="text-[17px] font-bold tracking-[-.02em]">Algo salió mal al cargar la pantalla</p>
          <p className="text-[13px] text-texto-2 mb-3 break-words">{String(this.state.error?.message || this.state.error)}</p>
          <button type="button" onClick={() => { try { sessionStorage.removeItem(YA_RECARGO) } catch { /* noop */ } window.location.reload() }}
            className="h-12 w-full rounded-grupo bg-acento hover:bg-acento-hover text-white text-base font-semibold">
            Recargar
          </button>
        </div>
      </div>
    )
  }
}

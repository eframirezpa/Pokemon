import { useEffect } from 'react'

/**
 * Ajustes del navegador mientras se está en la sala de juego:
 *
 * - Pantalla encendida (Screen Wake Lock): entre turno y turno el celular no
 *   se apaga solo. El navegador suelta el bloqueo al pasar a otra app o
 *   pestaña, así que se vuelve a pedir al regresar. Sin soporte, no pasa nada.
 * - Sin "deslizar para recargar": en la app instalada, tirar hacia abajo
 *   recargaba la página en pleno combate. Se desactiva solo dentro de la sala.
 */
export function useSalaDeJuego() {
  useEffect(() => {
    let bloqueo = null
    let activa = true
    const pedir = async () => {
      if (!activa || document.visibilityState !== 'visible' || !navigator.wakeLock) return
      try {
        bloqueo = await navigator.wakeLock.request('screen')
      } catch { /* sin permiso o sin batería suficiente: se apaga como siempre */ }
    }
    pedir()
    document.addEventListener('visibilitychange', pedir)

    const html = document.documentElement
    const antes = [html.style.overscrollBehavior, document.body.style.overscrollBehavior]
    html.style.overscrollBehavior = 'none'
    document.body.style.overscrollBehavior = 'none'

    return () => {
      activa = false
      document.removeEventListener('visibilitychange', pedir)
      bloqueo?.release().catch(() => {})
      html.style.overscrollBehavior = antes[0]
      document.body.style.overscrollBehavior = antes[1]
    }
  }, [])
}

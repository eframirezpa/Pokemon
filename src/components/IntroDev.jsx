import { useEffect, useState } from 'react'

// Atajo de desarrollo para ver el intro sin entrar a una partida.
//
// El intro cuelga de PartidaPresentacion, que solo aparece al pulsar la tarjeta
// de una partida en el panel. Recargando o entrando por URL no se ve, y para
// ajustar tiempos o añadir clips hace falta repetirlo muchas veces.
//
// Con ?intro=1 en cualquier URL se reproduce entero; al terminar se quita el
// parámetro y la app sigue como estaba.
//
// Solo existe en desarrollo: quien lo monta comprueba import.meta.env.DEV y el
// reproductor entra por import() dinámico, así el empaquetador se lleva todo
// esto del bundle de producción.
export default function IntroDev() {
  // Se lee una sola vez, al montar: si se hiciera en un efecto habría que
  // llamar a setState en su cuerpo y React encadena renders de más.
  const [pedido] = useState(() =>
    new URLSearchParams(window.location.search).get('intro'))
  const [Intro, setIntro] = useState(null)

  useEffect(() => {
    if (!pedido) return
    let vivo = true
    import('./IntroVideos')
      .then(m => { if (vivo) setIntro(() => m.default) })
      .catch(() => {})   // sin reproductor, la app sigue su curso
    return () => { vivo = false }
  }, [pedido])

  const cerrar = () => {
    // Fuera el parámetro, para que un refresco no lo repita sin querer
    const url = new URL(window.location.href)
    url.searchParams.delete('intro')
    window.history.replaceState({}, '', url)
    setIntro(null)
  }

  return Intro ? <Intro onFinish={cerrar} /> : null
}

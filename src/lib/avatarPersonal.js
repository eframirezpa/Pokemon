// Sprite personal de un usuario: public/avatars/<user_name>.png
//
// Si el archivo existe, ese avatar gana sobre el del catálogo al iniciar
// sesión. Dar de alta uno es dejar el PNG en la carpeta con el nombre exacto
// del usuario; no hace falta tocar la base de datos ni el backend.
//
// POR QUÉ SE COMPRUEBA CARGANDO LA IMAGEN Y NO CON fetch:
// vercel.json reescribe todo lo que no encuentra hacia /index.html, así que un
// avatar inexistente NO responde 404 — responde 200 con text/html. Mirar
// res.ok daría por bueno cualquier nombre. El navegador, en cambio, no puede
// decodificar ese HTML como imagen y dispara onerror, que es la señal fiable.
// De paso queda cacheada y el avatar aparece sin parpadeo.

const CARPETA = '/avatars'

// Si el servidor tarda, se sigue sin sprite personal: nunca vale la pena
// retrasar un login por un avatar.
const TIMEOUT_MS = 2500

/** Ruta donde viviría el sprite de ese usuario (null si el nombre viene vacío) */
export const rutaSpritePersonal = (userName) => {
  const nombre = String(userName || '').trim()
  if (!nombre) return null
  // encodeURIComponent por los nombres con espacios o acentos
  return `${CARPETA}/${encodeURIComponent(nombre)}.png`
}

/**
 * Busca el sprite personal del usuario.
 * @returns Promise<string|null> la ruta si existe, null si no
 */
export const buscarSpritePersonal = (userName) => new Promise(resolve => {
  const url = rutaSpritePersonal(userName)
  if (!url || typeof Image === 'undefined') return resolve(null)

  const img = new Image()
  let resuelto = false
  const terminar = (valor) => {
    if (resuelto) return
    resuelto = true
    img.onload = null
    img.onerror = null
    resolve(valor)
  }

  const reloj = setTimeout(() => terminar(null), TIMEOUT_MS)
  // naturalWidth > 0 descarta un archivo que exista pero esté corrupto
  img.onload  = () => { clearTimeout(reloj); terminar(img.naturalWidth > 0 ? url : null) }
  img.onerror = () => { clearTimeout(reloj); terminar(null) }
  img.src = url
})

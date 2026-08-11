const BASE      = import.meta.env.VITE_API_URL  ?? '/api'
export const API_BASE_URL = BASE.replace(/\/api$/, '')

// Marca que deja apiFetch para que Home avise y abra el login al recargar
export const AVISO_SESION = 'sesion_expirada'

// El token dura 8 h. Al vencer, el backend responde 401 a todo, pero el usuario
// seguía "dentro": auth_user vive en localStorage y nadie lo borraba. Cada
// pantalla recibía entonces {error:'Token inválido o expirado'} donde esperaba
// una lista o un número, y de ahí salían las vidas en negativo y las imágenes
// rotas hasta cerrar sesión a mano.
//
// Se corta aquí, en el único sitio por el que pasan todas las llamadas. La
// redirección es una recarga completa a propósito: así se tira también el estado
// viejo que ya está en pantalla.
let redirigiendo = false

function sesionCaducada() {
  if (redirigiendo) return   // varias peticiones en vuelo → una sola redirección
  redirigiendo = true
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  try { sessionStorage.setItem(AVISO_SESION, '1') } catch { /* modo privado */ }
  window.location.replace('/')
}

export function apiFetch(path, options = {}) {
  const token      = localStorage.getItem('auth_token')
  const isFormData = options.body instanceof FormData
  const headers    = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }
  return fetch(`${BASE}${path}`, { ...options, headers }).then(res => {
    // Solo se echa a quien TENÍA sesión. Sin token el 401 es lo normal (una
    // pantalla pública pidiendo algo privado), y redirigir ahí encadenaría
    // recargas infinitas: al limpiar el token la siguiente llamada volvería a
    // dar 401.
    // El login también responde 401 con credenciales malas: ahí el 401 es la
    // respuesta esperada y debe llegar a la pantalla, no echar a nadie.
    if (res.status === 401 && token && !path.startsWith('/auth/login')) sesionCaducada()
    return res
  })
}

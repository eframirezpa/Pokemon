import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

// Vite avisa cuando falla la precarga de un chunk (típico tras un despliegue con
// la pestaña abierta): se recarga una vez para traer la versión nueva.
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('eb-recarga-por-chunk')) return
    sessionStorage.setItem('eb-recarga-por-chunk', '1')
  } catch { return }
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// Si la app arrancó bien, el próximo fallo de chunk vuelve a poder recargar.
setTimeout(() => { try { sessionStorage.removeItem('eb-recarga-por-chunk') } catch { /* noop */ } }, 10000)

import { createContext, useContext, useState } from 'react'
import { buscarSpritePersonal } from '../lib/avatarPersonal'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')) } catch { return null }
  })

  // En CADA inicio de sesión se mira si el usuario tiene su propio sprite en
  // public/avatars/<user_name>.png. Si está, manda sobre el del catálogo.
  //
  // Se conserva avatar_id para que el selector siga marcando su elección; lo
  // único que se pisa es la imagen que se muestra. Si elige otro avatar, el
  // cambio vale durante la sesión y el sprite personal vuelve en el siguiente
  // login, que es el comportamiento pedido.
  //
  // No hace falta guardarlo en el servidor: el avatar que ven los demás en la
  // partida sale de la presencia, y cada cliente publica el suyo.
  const login = async ({ token, user }) => {
    const personal = await buscarSpritePersonal(user?.user_name)
    const final = personal
      ? { ...user, avatar_face_url: personal, avatar_personal: true }
      : user
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(final))
    setUser(final)
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setUser(null)
  }

  // Elegir del catálogo deja sin efecto el sprite personal hasta el próximo login
  const updateAvatar = (avatar_id, avatar_face_url) => {
    const updated = { ...user, avatar_id, avatar_face_url, avatar_personal: false }
    localStorage.setItem('auth_user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

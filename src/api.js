const BASE      = import.meta.env.VITE_API_URL  ?? '/api'
export const API_BASE_URL = BASE.replace(/\/api$/, '')

export function apiFetch(path, options = {}) {
  const token      = localStorage.getItem('auth_token')
  const isFormData = options.body instanceof FormData
  const headers    = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }
  return fetch(`${BASE}${path}`, { ...options, headers })
}

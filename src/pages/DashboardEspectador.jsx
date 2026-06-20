import { useAuth } from '../context/AuthContext'

export default function DashboardEspectador() {
  const { user } = useAuth()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <h1 className="text-2xl font-bold text-gray-800">Bienvenido, {user?.user_name}</h1>
      <span className="px-3 py-1 bg-gray-500 text-white text-sm font-medium rounded-full">Espectador</span>
    </div>
  )
}

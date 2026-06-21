import PartidaRoom from '../components/PartidaRoom'

export default function EspectadorPartida() {
  return (
    <PartidaRoom roleLabel="Espectador">
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 text-sm">Panel del Espectador — próximamente</p>
      </div>
    </PartidaRoom>
  )
}

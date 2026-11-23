import { useParams, useNavigate } from 'react-router-dom'
import FichaPokemonCompleta from '../components/pokedex/FichaPokemonCompleta'

// Página de consulta /pokemon/:id
export default function PokemonDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  return (
    <FichaPokemonCompleta id={id} onVolver={() => navigate('/pokemon')}
      onIrA={(otro) => navigate(`/pokemon/${otro}`)} />
  )
}

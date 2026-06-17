import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PokemonList from './pages/PokemonList'
import PokemonDetail from './pages/PokemonDetail'
import ItemsList from './pages/ItemsList'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pokemon" element={<PokemonList />} />
          <Route path="pokemon/:id" element={<PokemonDetail />} />
          <Route path="items"   element={<ItemsList />} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import PokemonList from './pages/PokemonList'
import PokemonDetail from './pages/PokemonDetail'
import ItemsList from './pages/ItemsList'
import NaturesList from './pages/NaturesList'
import FeatsList from './pages/FeatsList'
import BackgroundsList from './pages/BackgroundsList'
import OriginsList from './pages/OriginsList'
import SpecializationsList from './pages/SpecializationsList'
import BondsList from './pages/BondsList'
import ArmorTypesList from './pages/ArmorTypesList'
import WeaponTypesList from './pages/WeaponTypesList'
import WeaponPropertiesList from './pages/WeaponPropertiesList'
import MovesList from './pages/MovesList'
import DashboardMaster from './pages/DashboardMaster'
import DashboardTrainer from './pages/DashboardTrainer'
import DashboardEspectador from './pages/DashboardEspectador'
import TrainerPartida from './pages/TrainerPartida'
import MasterPartida from './pages/MasterPartida'
import EspectadorPartida from './pages/EspectadorPartida'
import PartidaLobby from './pages/PartidaLobby'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Páginas con header/footer */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pokemon" element={<PokemonList />} />
          <Route path="pokemon/:id" element={<PokemonDetail />} />
          <Route path="items" element={<ItemsList />} />
          <Route path="natures" element={<NaturesList />} />
          <Route path="feats" element={<FeatsList />} />
          <Route path="backgrounds" element={<BackgroundsList />} />
          <Route path="origins" element={<OriginsList />} />
          <Route path="specializations" element={<SpecializationsList />} />
          <Route path="bonds" element={<BondsList />} />
          <Route path="armor-types" element={<ArmorTypesList />} />
          <Route path="weapon-types" element={<WeaponTypesList />} />
          <Route path="weapon-properties" element={<WeaponPropertiesList />} />
          <Route path="moves" element={<MovesList />} />

          <Route path="dashboard/master" element={
            <ProtectedRoute role="master"><DashboardMaster /></ProtectedRoute>
          } />
          <Route path="dashboard/trainer" element={
            <ProtectedRoute role="trainer"><DashboardTrainer /></ProtectedRoute>
          } />
          <Route path="dashboard/espectador" element={
            <ProtectedRoute role="espectador"><DashboardEspectador /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Salas de partida — pantalla completa sin header */}
        <Route path="partida-lobby/:id" element={
          <ProtectedRoute role="trainer"><PartidaLobby /></ProtectedRoute>
        } />
        <Route path="trainer-partida/:id" element={
          <ProtectedRoute role="trainer"><TrainerPartida /></ProtectedRoute>
        } />
        <Route path="master-partida/:id" element={
          <ProtectedRoute role="master"><MasterPartida /></ProtectedRoute>
        } />
        <Route path="espectador-partida/:id" element={
          <ProtectedRoute role="espectador"><EspectadorPartida /></ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  )
}

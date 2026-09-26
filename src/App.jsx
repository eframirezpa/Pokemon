import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingOverlay from './components/LoadingOverlay'
import Home from './pages/Home'
import IntroDev from './components/IntroDev'

// Todo lo demás va perezoso: cada página se baja en su propio chunk solo
// cuando se visita, en vez de sumarse al bundle inicial. Home y el shell
// (Layout/ProtectedRoute/IntroDev) van eager porque los pisa cualquier visita.
import ErrorBoundary from './components/ErrorBoundary'
const PokemonList          = lazy(() => import('./pages/PokemonList'))
const PokemonDetail        = lazy(() => import('./pages/PokemonDetail'))
const ItemsList            = lazy(() => import('./pages/ItemsList'))
const NaturesList          = lazy(() => import('./pages/NaturesList'))
const FeatsList            = lazy(() => import('./pages/FeatsList'))
const BackgroundsList      = lazy(() => import('./pages/BackgroundsList'))
const OriginsList          = lazy(() => import('./pages/OriginsList'))
const SpecializationsList  = lazy(() => import('./pages/SpecializationsList'))
const PathsList            = lazy(() => import('./pages/PathsList'))
const BondsList            = lazy(() => import('./pages/BondsList'))
const ArmorTypesList       = lazy(() => import('./pages/ArmorTypesList'))
const WeaponTypesList      = lazy(() => import('./pages/WeaponTypesList'))
const WeaponPropertiesList = lazy(() => import('./pages/WeaponPropertiesList'))
const MovesList            = lazy(() => import('./pages/MovesList'))
const DashboardMaster      = lazy(() => import('./pages/DashboardMaster'))
const DashboardTrainer     = lazy(() => import('./pages/DashboardTrainer'))
const DashboardEspectador  = lazy(() => import('./pages/DashboardEspectador'))
const TrainerPartida       = lazy(() => import('./pages/TrainerPartida'))
const MasterPartida        = lazy(() => import('./pages/MasterPartida'))
const EspectadorPartida    = lazy(() => import('./pages/EspectadorPartida'))
const PartidaLobby         = lazy(() => import('./pages/PartidaLobby'))

export default function App() {
  return (
    <BrowserRouter>
      {/* Atajo de desarrollo: ?intro=1 reproduce el intro sobre cualquier
          pantalla. En produccion la rama es falsa y desaparece del bundle. */}
      {import.meta.env.DEV && <IntroDev />}
      <ErrorBoundary>
      <Suspense fallback={<LoadingOverlay label="Cargando" />}>
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
          <Route path="paths" element={<PathsList />} />
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
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Nav           from './components/Nav'
import Login         from './pages/Login'
import CommandCenter from './pages/CommandCenter'
import DeckPortal    from './pages/DeckPortal'
import PitchArena    from './pages/PitchArena'
import Scorecard     from './pages/Scorecard'
import Optimizer     from './pages/Optimizer'

function Guard({ children }) {
  const { user } = useApp()
  return user ? children : <Navigate to="/" replace />
}

function Layout({ children }) {
  return <><Nav />{children}</>
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Login />} />
        <Route path="/setup"     element={<Guard><Layout><CommandCenter /></Layout></Guard>} />
        <Route path="/deck"      element={<Guard><Layout><DeckPortal /></Layout></Guard>} />
        <Route path="/arena"     element={<Guard><Layout><PitchArena /></Layout></Guard>} />
        <Route path="/scorecard" element={<Guard><Layout><Scorecard /></Layout></Guard>} />
        <Route path="/optimize"  element={<Guard><Layout><Optimizer /></Layout></Guard>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
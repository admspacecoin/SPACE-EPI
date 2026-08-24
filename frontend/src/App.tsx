import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { RequireAuth, RequireRole } from './features/auth/RouteGuards'
import { Sidebar } from './components/Sidebar'
import { MobileHeader } from './components/MobileHeader'
import Login from './pages/Login'

// Code-splitting por rota: cada página vira um chunk separado, carregado sob
// demanda. Evita que todo mundo baixe o Recharts (Dashboard) ou o gerador de
// CSV (Relatórios) só para ver a tela de Login ou a Ficha de um EPI.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Colaboradores = lazy(() => import('./pages/Colaboradores'))
const ColaboradorNovo = lazy(() => import('./pages/ColaboradorNovo'))
const ColaboradorFicha = lazy(() => import('./pages/ColaboradorFicha'))
const Epis = lazy(() => import('./pages/Epis'))
const EpiNovo = lazy(() => import('./pages/EpiNovo'))
const EpiFicha = lazy(() => import('./pages/EpiFicha'))
const Estoque = lazy(() => import('./pages/Estoque'))
const Entrega = lazy(() => import('./pages/Entrega'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const Alertas = lazy(() => import('./pages/Alertas'))
const Administracao = lazy(() => import('./pages/Administracao'))

function PageFallback() {
  return <p className="p-6 text-sm text-steel-400">Carregando…</p>
}

function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader onOpenMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-steel-50 p-4 sm:p-6">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/colaboradores" element={<Colaboradores />} />
              <Route path="/colaboradores/novo" element={<ColaboradorNovo />} />
              <Route path="/colaboradores/:id" element={<ColaboradorFicha />} />
              <Route path="/epis" element={<Epis />} />
              <Route path="/epis/novo" element={<EpiNovo />} />
              <Route path="/epis/:id" element={<EpiFicha />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/entrega" element={<Entrega />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/alertas" element={<Alertas />} />
              <Route
                path="/administracao"
                element={
                  <RequireRole roles={['admin', 'seguranca']}>
                    <Administracao />
                  </RequireRole>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

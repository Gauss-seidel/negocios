import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { BranchProvider } from './contexts/BranchContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import SuperAdminLayout from './layouts/SuperAdminLayout'
import BarberLayout from './layouts/BarberLayout'

// Páginas lazy-loaded
const Marketplace = lazy(() => import('./pages/public/Marketplace'))
const BarberiaPage = lazy(() => import('./pages/barberia/BarberiaPage'))
const BookingPage = lazy(() => import('./pages/barberia/BookingPage'))

const Login = lazy(() => import('./pages/admin/Login'))
const SuperDashboard = lazy(() => import('./pages/admin/SuperDashboard'))
const BusinessDashboard = lazy(() => import('./pages/admin/BusinessDashboard'))
const ServicesPage = lazy(() => import('./pages/admin/ServicesPage'))
const BarbersPage = lazy(() => import('./pages/admin/BarbersPage'))
const HoursPage = lazy(() => import('./pages/admin/HoursPage'))
const AppointmentsPage = lazy(() => import('./pages/admin/AppointmentsPage'))
const ClientsPage = lazy(() => import('./pages/admin/ClientsPage'))
const CashPage = lazy(() => import('./pages/admin/CashPage'))
const InventoryPage = lazy(() => import('./pages/admin/InventoryPage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const ConfigPage = lazy(() => import('./pages/admin/ConfigPage'))
const AppearancePage = lazy(() => import('./pages/admin/AppearancePage'))
const PlansPage = lazy(() => import('./pages/admin/PlansPage'))
const SucursalesPage = lazy(() => import('./pages/admin/SucursalesPage'))
const SuperPlanesPage = lazy(() => import('./pages/admin/PlanesPage'))
const SuperConfigPage = lazy(() => import('./pages/admin/SuperConfigPage'))
const SuperBarberosPage = lazy(() => import('./pages/admin/SuperBarberosPage'))
const BarberDashboard = lazy(() => import('./pages/barber/BarberDashboard'))
const BarberProfile = lazy(() => import('./pages/barber/BarberProfile'))

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="text-center">
        <p className="text-[var(--color-accent)] font-bold text-7xl lg:text-8xl tracking-tight leading-[1.1]">
          404
        </p>
        <h1 className="text-xl lg:text-2xl font-semibold text-[var(--color-text)] mt-4">
          Página no encontrada
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-2 max-w-sm mx-auto">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-[var(--color-accent)] text-white font-medium hover:brightness-110 transition-all active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BranchProvider>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Páginas públicas */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Marketplace />} />
            <Route path="/barberia/:slug" element={<BarberiaPage />} />
            <Route path="/barberia/:slug/reservar" element={<BookingPage />} />
          </Route>

          {/* Login (sin layout) */}
          <Route path="/admin" element={<Login />} />

          {/* Super Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SuperDashboard />} />
            <Route path="barberias" element={<SuperDashboard />} />
            <Route path="planes" element={<SuperPlanesPage />} />
            <Route path="barberos" element={<SuperBarberosPage />} />
            <Route path="config" element={<SuperConfigPage />} />
          </Route>

          {/* Barber */}
          <Route
            path="/admin/mi-trabajo"
            element={
              <ProtectedRoute allowedRoles={['barber']}>
                <BarberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<BarberDashboard />} />
            <Route path="perfil" element={<BarberProfile />} />
          </Route>

          {/* Business Admin */}
          <Route
            path="/admin/mi-negocio"
            element={
              <ProtectedRoute allowedRoles={['business_admin', 'super_admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<BusinessDashboard />} />
            <Route path="servicios" element={<ServicesPage />} />
            <Route path="barberos" element={<BarbersPage />} />
            <Route path="horarios" element={<HoursPage />} />
            <Route path="reservas" element={<AppointmentsPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="caja" element={<CashPage />} />
            <Route path="inventario" element={<InventoryPage />} />
            <Route path="reportes" element={<ReportsPage />} />
            <Route path="sucursales" element={<SucursalesPage />} />
            <Route path="config" element={<ConfigPage />} />
            <Route path="apariencia" element={<AppearancePage />} />
            <Route path="planes" element={<PlansPage />} />
          </Route>

          {/* 404 - Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

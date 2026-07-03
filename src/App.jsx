import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { BranchProvider } from './contexts/BranchContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import SuperAdminLayout from './layouts/SuperAdminLayout'
import BarberLayout from './layouts/BarberLayout'

// Páginas públicas
import Marketplace from './pages/public/Marketplace'
import BarberiaPage from './pages/barberia/BarberiaPage'
import BookingPage from './pages/barberia/BookingPage'

// Admin
import Login from './pages/admin/Login'
import SuperDashboard from './pages/admin/SuperDashboard'
import BusinessDashboard from './pages/admin/BusinessDashboard'
import ServicesPage from './pages/admin/ServicesPage'
import BarbersPage from './pages/admin/BarbersPage'
import HoursPage from './pages/admin/HoursPage'
import AppointmentsPage from './pages/admin/AppointmentsPage'
import ClientsPage from './pages/admin/ClientsPage'
import CashPage from './pages/admin/CashPage'
import InventoryPage from './pages/admin/InventoryPage'
import ReportsPage from './pages/admin/ReportsPage'
import ConfigPage from './pages/admin/ConfigPage'
import AppearancePage from './pages/admin/AppearancePage'
import PlansPage from './pages/admin/PlansPage'
import SucursalesPage from './pages/admin/SucursalesPage'
import SuperPlanesPage from './pages/admin/PlanesPage'
import SuperConfigPage from './pages/admin/SuperConfigPage'
import SuperBarberosPage from './pages/admin/SuperBarberosPage'
import BarberDashboard from './pages/barber/BarberDashboard'
import BarberProfile from './pages/barber/BarberProfile'

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BranchProvider>
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
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

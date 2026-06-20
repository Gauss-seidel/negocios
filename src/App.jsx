import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import SuperAdminLayout from './layouts/SuperAdminLayout'

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="planes" element={<SuperDashboard />} />
            <Route path="config" element={<SuperDashboard />} />
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
            <Route path="config" element={<ConfigPage />} />
            <Route path="apariencia" element={<AppearancePage />} />
            <Route path="planes" element={<PlansPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

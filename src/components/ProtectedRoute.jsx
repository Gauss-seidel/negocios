import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, userRole, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" state={{ from: location }} replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    if (userRole === 'super_admin') {
      return <Navigate to="/admin/dashboard" replace />
    }
    if (userRole === 'barber') {
      return <Navigate to="/admin/mi-trabajo" replace />
    }
    return <Navigate to="/admin/mi-negocio" replace />
  }

  return children
}

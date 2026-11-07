import { Link, useLocation } from 'react-router-dom'

const LABELS = {
  'mi-negocio': 'Mi Negocio',
  'mi-trabajo': 'Mi Trabajo',
  'reservas': 'Reservas',
  'servicios': 'Servicios',
  'barberos': 'Barberos',
  'horarios': 'Horarios',
  'clientes': 'Clientes',
  'caja': 'Caja',
  'inventario': 'Inventario',
  'reportes': 'Reportes',
  'sucursales': 'Sucursales',
  'config': 'Configuración',
  'apariencia': 'Apariencia',
  'planes': 'Planes',
  'dashboard': 'Dashboard',
  'barberias': 'Barberías',
}

export default function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length <= 2) return null

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/')
    return { label: LABELS[seg] || seg, path }
  })

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm text-gray-400">
        {crumbs.map((crumb, i) => (
          <li key={crumb.path} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-gray-700">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="transition-colors hover:text-gray-600">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

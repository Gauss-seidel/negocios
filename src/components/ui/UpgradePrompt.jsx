import { Link } from 'react-router-dom'
import Card from './Card'
import Button from './Button'

export default function UpgradePrompt({ feature = 'este modulo', requiredPlan = 'Profesional', features = [] }) {
  return (
    <Card>
      <div className="flex flex-col items-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">Funcion no disponible</h3>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          {feature} esta disponible solo en el plan {requiredPlan} o superior.
        </p>
        {features.length > 0 && (
          <ul className="mt-3 max-w-sm space-y-1.5 text-left">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        )}
        <Link to="/admin/mi-negocio/planes">
          <Button className="mt-4">Ver Planes</Button>
        </Link>
      </div>
    </Card>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'

const PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    price: 100000,
    desc: 'Perfecto para empezar. Incluye gestión de reservas y clientes.',
    popular: false,
    features: [
      { text: 'Gestión de reservas', included: true },
      { text: 'Gestión de clientes', included: true },
      { text: 'Inventario', included: false },
      { text: 'Reportes', included: false },
      { text: 'Notificaciones WhatsApp', included: false },
      { text: 'Soporte prioritario', included: false },
      { text: 'Todas las plantillas', included: false },
    ],
    limits: [
      { label: 'Empleados', value: '3' },
      { label: 'Sucursales', value: '1' },
      { label: 'Reservas/mes', value: '100' },
    ],
  },
  {
    id: 'professional',
    name: 'Profesional',
    price: 150000,
    desc: 'Para barberías en crecimiento. Incluye inventario y reportes.',
    popular: true,
    features: [
      { text: 'Gestión de reservas', included: true },
      { text: 'Gestión de clientes', included: true },
      { text: 'Inventario', included: true },
      { text: 'Reportes', included: true },
      { text: 'Notificaciones WhatsApp', included: true },
      { text: 'Soporte prioritario', included: false },
      { text: 'Todas las plantillas', included: false },
    ],
    limits: [
      { label: 'Empleados', value: '10' },
      { label: 'Sucursales', value: '3' },
      { label: 'Reservas/mes', value: '500' },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 200000,
    desc: 'Todo incluido. Sin límites. Prioridad en soporte.',
    popular: false,
    features: [
      { text: 'Gestión de reservas', included: true },
      { text: 'Gestión de clientes', included: true },
      { text: 'Inventario', included: true },
      { text: 'Reportes', included: true },
      { text: 'Notificaciones WhatsApp', included: true },
      { text: 'Soporte prioritario', included: true },
      { text: 'Todas las plantillas', included: true },
    ],
    limits: [
      { label: 'Empleados', value: 'Ilimitados' },
      { label: 'Sucursales', value: 'Ilimitadas' },
      { label: 'Reservas/mes', value: 'Ilimitadas' },
    ],
  },
]

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  )
}

function PlanCard({ plan, isCurrent }) {
  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all ${
      plan.popular
        ? 'border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10'
        : 'border-gray-200 hover:border-gray-300'
    } ${isCurrent ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
    style={isCurrent ? { borderColor: 'var(--color-accent)' } : {}}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
          Más popular
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
          Plan actual
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{plan.name}</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{plan.desc}</p>
      </div>

      <div className="mb-5">
        <span className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>₲ {plan.price}</span>
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>/mes</span>
      </div>

      {/* Límites */}
      <div className="mb-5 space-y-1.5">
        {plan.limits.map(l => (
          <div key={l.label} className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--color-text-secondary)' }}>{l.label}</span>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{l.value}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="space-y-2.5 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        {plan.features.map(f => (
          <div key={f.text} className="flex items-center gap-3 text-sm">
            {f.included ? <CheckIcon /> : <MinusIcon />}
            <span style={{ color: f.included ? 'var(--color-text)' : 'var(--color-text-secondary)', opacity: f.included ? 1 : 0.6 }}>
              {f.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PlansPage() {
  const { businessId } = useAuth()
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    supabase.from('businesses').select('plan').eq('id', businessId).single()
      .then(({ data, error }) => {
        if (!error && data) setCurrentPlan(data.plan)
      })
      .finally(() => setLoading(false))
  }, [businessId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Planes</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {loading
            ? 'Cargando...'
            : currentPlan
              ? `Actualmente estás en el plan ${PLANS.find(p => p.id === currentPlan)?.name || currentPlan}.`
              : 'Compara los planes disponibles para tu negocio.'}
        </p>
      </div>

      {/* Planes en grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={!loading && currentPlan === plan.id}
          />
        ))}
      </div>

      {/* Tabla comparativa desktop */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <th className="pb-3 pr-6 font-medium">Característica</th>
                {PLANS.map(p => (
                  <th key={p.id} className={`pb-3 pr-6 text-center ${currentPlan === p.id ? 'text-[var(--color-accent)]' : ''}`}>
                    {p.name}
                    {currentPlan === p.id && <span className="ml-1.5 text-[10px]">(actual)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              <tr className="border-b font-semibold" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-3 pr-6" style={{ color: 'var(--color-text)' }}>Precio</td>
                {PLANS.map(p => (
                  <td key={p.id} className="py-3 pr-6 text-center" style={{ color: 'var(--color-text)' }}>₲ {p.price}/mes</td>
                ))}
              </tr>
              {PLANS[0].limits.map((_, i) => (
                <tr key={i}>
                  <td className="py-3 pr-6" style={{ color: 'var(--color-text-secondary)' }}>{PLANS[0].limits[i].label}</td>
                  {PLANS.map(p => (
                    <td key={p.id} className="py-3 pr-6 text-center font-medium" style={{ color: 'var(--color-text)' }}>{p.limits[i].value}</td>
                  ))}
                </tr>
              ))}
              {PLANS[0].features.map((_, i) => (
                <tr key={i}>
                  <td className="py-3 pr-6" style={{ color: 'var(--color-text-secondary)' }}>{PLANS[0].features[i].text}</td>
                  {PLANS.map(p => (
                    <td key={p.id} className="py-3 pr-6 text-center">
                      {p.features[i].included
                        ? <CheckIcon />
                        : <MinusIcon />
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

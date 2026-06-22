import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { fmtCurrency } from '../../utils/format'
import Card from '../../components/ui/Card'
import { useMediaQuery } from '../../hooks/useMediaQuery'

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

function formatLimit(value, label) {
  if (label === 'Empleados' || label === 'Barberos') {
    return value >= 999 ? 'Ilimitados' : String(value)
  }
  if (label === 'Sucursales' || label === 'Sucursal') {
    return value >= 999 ? 'Ilimitadas' : String(value)
  }
  if (label === 'Reservas/mes' || label === 'Reservas') {
    return value >= 999999 ? 'Ilimitadas' : value.toLocaleString()
  }
  return value >= 999 ? 'Ilimitado' : String(value)
}

const LIMIT_LABELS = [
  { key: 'max_barbers', label: 'Empleados' },
  { key: 'max_branches', label: 'Sucursales' },
  { key: 'max_monthly_bookings', label: 'Reservas/mes' },
]

function PlanCard({ plan, isCurrent }) {
  const features = Array.isArray(plan.features) ? plan.features : []

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 px-6 pb-6 pt-10 transition-all ${
      isCurrent
        ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10'
        : 'border-gray-300 hover:border-gray-400'
    }`}
    >
      {isCurrent && (
        <div className="absolute left-0 right-0 top-0 flex -translate-y-1/2 items-center justify-center px-6">
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm">
            Plan actual
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{plan.name}</h3>
        {plan.description && (
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{plan.description}</p>
        )}
      </div>

      <div className="mb-5">
        <span className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{fmtCurrency(plan.price)}</span>
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>/mes</span>
      </div>

      {/* Límites */}
      <div className="mb-5 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--color-text-secondary)' }}>Empleados</span>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{formatLimit(plan.max_barbers, 'Empleados')}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--color-text-secondary)' }}>Sucursales</span>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{formatLimit(plan.max_branches, 'Sucursales')}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--color-text-secondary)' }}>Reservas/mes</span>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{formatLimit(plan.max_monthly_bookings, 'Reservas/mes')}</span>
        </div>
      </div>

      {/* Features */}
      {features.length > 0 && (
        <div className="space-y-2.5 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <CheckIcon />
              <span style={{ color: 'var(--color-text)' }}>{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlansPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { businessId } = useAuth()
  const [plans, setPlans] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('plan')
          .eq('id', businessId)
          .single()
        if (cancelled) return

        const slug = biz?.plan || null
        if (slug) setCurrentPlan(slug)

        const { data: plansData } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true })
        if (cancelled) return

        setPlans(plansData || [])
      } catch {
        // Silently fail — show empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (businessId) {
      load()
    } else {
      // Even without businessId, load plans for display
      supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
        .then(({ data }) => {
          if (!cancelled) {
            setPlans(data || [])
            setLoading(false)
          }
        })
    }

    return () => { cancelled = true }
  }, [businessId])

  const currentPlanName = plans.find(p => p.slug === currentPlan)?.name || currentPlan || ''

  /* ─── Tabla comparativa: juntar todas las features únicas ─── */
  const allFeatures = [...new Set(plans.flatMap(p => Array.isArray(p.features) ? p.features : []))]

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Planes</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {currentPlan
            ? `Actualmente estás en el plan ${currentPlanName}.`
            : 'Compara los planes disponibles para tu negocio.'}
        </p>
      </div>

      {/* Planes en grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.slug || plan.id}
            plan={plan}
            isCurrent={currentPlan === plan.slug}
          />
        ))}
        {plans.length === 0 && (
          <div className="col-span-full py-16 text-center" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="text-sm">No hay planes disponibles actualmente.</p>
          </div>
        )}
      </div>

      {/* Tabla comparativa — solo desktop */}
      {!isMobile && plans.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th className="pb-3 pr-6 font-medium">Característica</th>
                  {plans.map(p => (
                    <th key={p.slug || p.id} className={`pb-3 pr-6 text-center ${currentPlan === p.slug ? 'text-[var(--color-accent)]' : ''}`}>
                      {p.name}
                      {currentPlan === p.slug && <span className="ml-1.5 text-[10px]">(actual)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {/* Precio */}
                <tr className="border-b font-semibold" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="py-3 pr-6" style={{ color: 'var(--color-text)' }}>Precio</td>
                  {plans.map(p => (
                    <td key={p.slug || p.id} className="py-3 pr-6 text-center" style={{ color: 'var(--color-text)' }}>{fmtCurrency(p.price)}/mes</td>
                  ))}
                </tr>

                {/* Límites */}
                {LIMIT_LABELS.map(({ key, label }) => (
                  <tr key={key}>
                    <td className="py-3 pr-6" style={{ color: 'var(--color-text-secondary)' }}>{label}</td>
                    {plans.map(p => (
                      <td key={p.slug || p.id} className="py-3 pr-6 text-center font-medium" style={{ color: 'var(--color-text)' }}>
                        {formatLimit(p[key], label)}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Features */}
                {allFeatures.map((feature, i) => (
                  <tr key={i}>
                    <td className="py-3 pr-6" style={{ color: 'var(--color-text-secondary)' }}>{feature}</td>
                    {plans.map(p => {
                      const has = Array.isArray(p.features) && p.features.includes(feature)
                      return (
                        <td key={p.slug || p.id} className="py-3 pr-6 text-center">
                          {has ? <CheckIcon /> : <MinusIcon />}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

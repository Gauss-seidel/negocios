import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PLAN_FEATURES = {
  basic: ['Gestion de reservas', 'Gestion de clientes'],
  professional: ['Gestion de reservas', 'Gestion de clientes', 'Inventario', 'Reportes', 'WhatsApp'],
  premium: ['Gestion de reservas', 'Gestion de clientes', 'Inventario', 'Reportes avanzados', 'WhatsApp', 'Soporte prioritario', 'Todas las plantillas'],
}

const PLAN_LIMITS = {
  basic: { max_barbers: 3, max_branches: 1, max_monthly_bookings: 100 },
  professional: { max_barbers: 10, max_branches: 3, max_monthly_bookings: 500 },
  premium: { max_barbers: 999, max_branches: 999, max_monthly_bookings: 999999 },
}

const PLAN_NAMES = {
  basic: 'Basico',
  professional: 'Profesional',
  premium: 'Premium',
}

export function usePlan() {
  const { businessId } = useAuth()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!businessId) {
      setLoading(false)
      return
    }

    supabase
      .from('businesses')
      .select('plan')
      .eq('id', businessId)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else if (data) {
          setPlan(data.plan)
        }
        setLoading(false)
      })
  }, [businessId])

  const features = plan ? (PLAN_FEATURES[plan] || []) : []
  const limits = plan ? (PLAN_LIMITS[plan] || { max_barbers: 0, max_branches: 0, max_monthly_bookings: 0 }) : { max_barbers: 0, max_branches: 0, max_monthly_bookings: 0 }
  const planName = plan ? (PLAN_NAMES[plan] || plan) : ''

  const hasFeature = useCallback((feature) => {
    return features.includes(feature)
  }, [features])

  const isPremium = plan === 'premium'
  const isProfessional = plan === 'professional' || plan === 'premium'

  return { plan, planName, loading, error, features, limits, hasFeature, isPremium, isProfessional }
}

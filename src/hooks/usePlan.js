import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* ─── Module-level cache for plans ─── */
let plansCache = null
let plansCachePromise = null

async function fetchAllPlans() {
  if (plansCache) return plansCache
  if (plansCachePromise) return plansCachePromise

  plansCachePromise = supabase
    .from('plans')
    .select('*')
    .order('price', { ascending: true })
    .then(({ data, error }) => {
      if (error) throw error
      plansCache = data || []
      return plansCache
    })
    .finally(() => { plansCachePromise = null })

  return plansCachePromise
}

/* ─── Hook ─── */

export function usePlan() {
  const { businessId } = useAuth()
  const [plan, setPlan] = useState(null)       // slug del plan (e.g. 'basic')
  const [planData, setPlanData] = useState(null) // objeto completo desde DB
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!businessId) {
      setLoading(false)
      return
    }

    let cancelled = false

    supabase
      .from('businesses')
      .select('plan')
      .eq('id', businessId)
      .single()
      .then(async ({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setLoading(false)
          return
        }
        if (data) {
          const slug = data.plan
          setPlan(slug)

          try {
            const plans = await fetchAllPlans()
            if (cancelled) return
            const found = plans.find(p => p.slug === slug)
            setPlanData(found || null)
          } catch (e) {
            if (!cancelled) setError(e.message)
          }
        }
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [businessId])

  const features = Array.isArray(planData?.features) ? planData.features : []
  const limits = planData
    ? {
        max_barbers: planData.max_barbers,
        max_branches: planData.max_branches,
        max_monthly_bookings: planData.max_monthly_bookings,
      }
    // ponytail: no plan = generous defaults so UI isn't blocked
    : { max_barbers: 999, max_branches: 999, max_monthly_bookings: 999 }

  const planName = planData?.name || plan || ''

  const hasFeature = useCallback((feature) => {
    return features.includes(feature)
  }, [features])

  const isPremium = plan === 'premium'
  const isProfessional = plan === 'professional' || plan === 'premium'

  return { plan, planName, loading, error, features, limits, hasFeature, isPremium, isProfessional }
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

const STEPS = [
  { key: 'config', label: 'Completar configuración del negocio', path: '/admin/mi-negocio/config', done: (d) => d.name && d.address },
  { key: 'hours', label: 'Configurar horarios de atención', path: '/admin/mi-negocio/horarios', done: (d) => d.has_hours },
  { key: 'branch', label: 'Crear al menos una sucursal', path: '/admin/mi-negocio/sucursales', done: (d) => d.branch_count > 0 },
  { key: 'barber', label: 'Agregar barberos al equipo', path: '/admin/mi-negocio/barberos', done: (d) => d.barber_count > 0 },
  { key: 'services', label: 'Crear servicios disponibles', path: '/admin/mi-negocio/servicios', done: (d) => d.service_count > 0 },
]

export default function OnboardingChecklist() {
  const { businessId } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    setLoading(true)
    Promise.allSettled([
      supabase.from('businesses').select('name, address').eq('id', businessId).single(),
      supabase.from('business_hours').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('branches').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('barbers').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    ]).then(([biz, hrs, br, bb, sv]) => {
      setData({
        name: biz.status === 'fulfilled' ? biz.value.data?.name : '',
        address: biz.status === 'fulfilled' ? biz.value.data?.address : '',
        has_hours: hrs.status === 'fulfilled' ? (hrs.value.count ?? 0) > 0 : false,
        branch_count: br.status === 'fulfilled' ? (br.value.count ?? 0) : 0,
        barber_count: bb.status === 'fulfilled' ? (bb.value.count ?? 0) : 0,
        service_count: sv.status === 'fulfilled' ? (sv.value.count ?? 0) : 0,
      })
      setLoading(false)
    })
  }, [businessId])

  if (loading || !data) return null

  const completedCount = STEPS.filter(s => s.done(data)).length
  const allDone = completedCount === STEPS.length

  if (allDone) return null

  return (
    <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
          <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Configurá tu barbería</h3>
          <p className="text-xs text-gray-500">{completedCount} de {STEPS.length} pasos completados</p>
        </div>
        <div className="ml-auto h-2 w-24 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = step.done(data)
          return (
            <Link
              key={step.key}
              to={step.path}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                done
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {done ? (
                <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-[10px] font-bold text-gray-400">
                  {STEPS.indexOf(step) + 1}
                </span>
              )}
              <span className={done ? 'line-through opacity-60' : ''}>{step.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

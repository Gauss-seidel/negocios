import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useBranch } from '../../contexts/BranchContext'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
import Card from '../../components/ui/Card'
import { APPOINTMENT_STATUS } from '../../lib/constants'
import { fmtCurrency } from '../../utils/format'

const METRICS = [
  { key: 'todayAppointments', label: 'Reservas de hoy', color: 'text-blue-500', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'pending', label: 'Pendientes', color: 'text-amber-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'confirmed', label: 'Confirmadas', color: 'text-emerald-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'revenue', label: 'Ingresos del día', color: 'text-violet-500', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'newClients', label: 'Clientes nuevos hoy', color: 'text-rose-500', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
]
const fmtTime = (t) => t ? (t.split(':').slice(0, 2).join(':')) : '--:--'
const fmtShortDate = (d) => d ? new Intl.DateTimeFormat('es-PY', { day: 'numeric', month: 'short' }).format(new Date(d + 'T12:00:00')) : '—'

function getTodayRange() {
  const s = new Date(); s.setHours(0, 0, 0, 0)
  const e = new Date(); e.setHours(23, 59, 59, 999)
  return { start: s.toISOString(), end: e.toISOString() }
}

function StatusBadge({ status }) {
  const map = {
    [APPOINTMENT_STATUS.PENDING]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
    [APPOINTMENT_STATUS.CONFIRMED]: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmada' },
    [APPOINTMENT_STATUS.IN_PROGRESS]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En curso' },
    [APPOINTMENT_STATUS.COMPLETED]: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Completada' },
    [APPOINTMENT_STATUS.CANCELLED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
    [APPOINTMENT_STATUS.NO_SHOW]: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'No asistió' },
  }
  const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
}

export default function BusinessDashboard() {
  const { businessId } = useAuth()
  const [metrics, setMetrics] = useState({ todayAppointments: 0, pending: 0, confirmed: 0, revenue: 0, newClients: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const audioCtxRef = useRef(null)
  const isFirstLoad = useRef(true)
  const toastTimerRef = useRef(null)

  const { currentBranch } = useBranch()
  const { isMobile } = useResponsiveTable()

  const fetchDashboard = useCallback(async () => {
    if (!currentBranch?.id) return
    if (isFirstLoad.current) setLoading(true)
    setError(null)
    try {
      const { start, end } = getTodayRange()
      const [aR, tR, cR, pR, rR, clR] = await Promise.allSettled([
        supabase.from('appointments').select(`id, date, start_time, status, total, client:client_id(name), barber:barber_id(name)`).eq('business_id', businessId).eq('branch_id', currentBranch.id).order('date', { ascending: false }).order('start_time', { ascending: false }).limit(10),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('branch_id', currentBranch.id).gte('date', start).lte('date', end),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('branch_id', currentBranch.id).eq('status', APPOINTMENT_STATUS.CONFIRMED).gte('date', start).lte('date', end),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('branch_id', currentBranch.id).eq('status', APPOINTMENT_STATUS.PENDING).gte('date', start).lte('date', end),
        supabase.from('appointments').select('total').eq('business_id', businessId).eq('branch_id', currentBranch.id).gte('date', start).lte('date', end),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('branch_id', currentBranch.id).gte('created_at', start),
      ])
      if (aR.status === 'fulfilled') setRecent(aR.value.data || [])
      setMetrics({
        todayAppointments: tR.status === 'fulfilled' ? tR.value.count ?? 0 : 0,
        pending: pR.status === 'fulfilled' ? pR.value.count ?? 0 : 0,
        confirmed: cR.status === 'fulfilled' ? cR.value.count ?? 0 : 0,
        revenue: rR.status === 'fulfilled' ? (rR.value.data || []).reduce((s, a) => s + (Number(a.total) || 0), 0) : 0,
        newClients: clR.status === 'fulfilled' ? clR.value.count ?? 0 : 0,
      })
    } catch (err) { setError(err?.message || 'Error al cargar') }
    finally {
      if (isFirstLoad.current) {
        isFirstLoad.current = false
      }
      setLoading(false)
    }
  }, [businessId, currentBranch?.id])

  // ── Carga inicial ──
  useEffect(() => { if (businessId) fetchDashboard() }, [businessId, fetchDashboard])

  // ── Realtime: notificar al admin cuando alguien reserva ──
  useEffect(() => {
    if (!businessId) return

    // Solicitar permiso de notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const channel = supabase
      .channel(`admin-dashboard-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`,
        },
        async (payload) => {
          try {
            const { new: newAppt } = payload

            // Obtener nombre del cliente
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', newAppt.client_id)
              .single()

            // Obtener nombre del servicio
            const { data: svc } = await supabase
              .from('appointment_services')
              .select('service:services(name)')
              .eq('appointment_id', newAppt.id)
              .maybeSingle()

            const clientName = client?.name || 'Un cliente'
            const serviceName = svc?.service?.name || 'un servicio'
            const timeStr = newAppt.start_time?.substring(0, 5) || ''

            // Sonido sutil con Web Audio API
            try {
              if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
              }
              if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume()
              }
              const osc = audioCtxRef.current.createOscillator()
              const gain = audioCtxRef.current.createGain()
              osc.connect(gain)
              gain.connect(audioCtxRef.current.destination)
              osc.frequency.value = 880
              osc.type = 'sine'
              gain.gain.value = 0.08
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.3)
              osc.start()
              osc.stop(audioCtxRef.current.currentTime + 0.3)
            } catch (audioErr) {
              console.warn('[Realtime] Error al reproducir sonido:', audioErr)
            }

            // Toast en pantalla
            setToast({
              id: newAppt.id,
              clientName,
              serviceName,
              time: timeStr,
            })
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
            toastTimerRef.current = setTimeout(
              () => setToast((t) => (t?.id === newAppt.id ? null : t)),
              7000
            )

            // Notificación del navegador (si la pestaña no está activa)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('📅 Nueva reserva', {
                body: `${clientName} — ${serviceName} a las ${timeStr || '—'}`,
                tag: `appt-${newAppt.id}`,
              })
            }

            // Refrescar datos (sin mostrar el spinner de carga)
            fetchDashboard()
          } catch (err) {
            console.error('[Realtime] Error al procesar notificación:', err)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
    }
  }, [businessId, fetchDashboard])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center py-32">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
          <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">Error al cargar</h3>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
        <button onClick={fetchDashboard} className="mt-4 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110">Reintentar</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Resumen de actividad de tu negocio</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {METRICS.map(m => {
          let val = metrics[m.key]
          if (m.key === 'revenue') val = fmtCurrency(val)
          else val = (val ?? 0).toLocaleString('es-PY')
          return (
            <Card key={m.key} hover>
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${m.color.replace('text-', 'bg-').replace('500', '100')}`}>
                  <svg className={`h-6 w-6 ${m.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{m.label}</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{val}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Recent appointments */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Reservas recientes</h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Últimas 10 reservas registradas</p>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="h-12 w-12" style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-4 text-base font-medium" style={{ color: 'var(--color-text)' }}>No hay reservas aún</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Las reservas aparecerán aquí cuando los clientes agenden citas.</p>
          </div>
        ) : isMobile ? (
          /* ── Mobile card layout ── */
          <div className="mt-4 space-y-3">
            {recent.map(a => (
              <div key={a.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{a.client?.name || '—'}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-400">Barbero</span>
                    <p className="text-gray-700">{a.barber?.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Fecha</span>
                    <p className="text-gray-700">{fmtShortDate(a.date)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Hora</span>
                    <p className="text-gray-700">{fmtTime(a.start_time)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Total</span>
                    <p className="font-medium text-gray-900">{a.total ? fmtCurrency(a.total) : '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop table ── */
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th className="pb-3 pr-4">Cliente</th>
                  <th className="pb-3 pr-4">Barbero</th>
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3 pr-4">Hora</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {recent.map(a => (
                  <tr key={a.id} className="transition-colors hover:bg-black/[0.02]">
                    <td className="py-3 pr-4 font-medium" style={{ color: 'var(--color-text)' }}>{a.client?.name || '—'}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--color-text-secondary)' }}>{a.barber?.name || '—'}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--color-text-secondary)' }}>{fmtShortDate(a.date)}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--color-text-secondary)' }}>{fmtTime(a.start_time)}</td>
                    <td className="py-3 pr-4 font-medium" style={{ color: 'var(--color-text)' }}>{a.total ? fmtCurrency(a.total) : '—'}</td>
                    <td className="py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-2xl bg-gray-900 px-5 py-4 text-white shadow-2xl ring-1 ring-white/10 transition-all"
          style={{ animation: 'slideUpIn 0.35s ease-out' }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Nueva reserva</p>
            <p className="text-xs text-white/60 truncate max-w-[260px]">
              {toast.clientName} · {toast.serviceName}{toast.time ? ` · ${toast.time}` : ''}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-2 shrink-0 rounded-full p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Keyframes para toast ── */}
      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

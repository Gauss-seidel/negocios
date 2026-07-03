import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/* ─── Status badges ─── */

function StatusBadge({ status }) {
  const config = {
    pending:      { label: 'Pendiente',  bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    confirmed:    { label: 'Confirmado', bg: 'bg-blue-500/10',  text: 'text-blue-400',  dot: 'bg-blue-400' },
    in_progress:  { label: 'En curso',   bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    completed:    { label: 'Completado', bg: 'bg-white/5',     text: 'text-white/40',  dot: 'bg-white/20' },
  }
  const c = config[status] || config.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

/* ─── Appointment card ─── */

function AppointmentCard({ appointment, isInProgress, isCompleted }) {
  const barberName = appointment.barber?.name || '—'
  const services = (appointment.services || [])
    .map(s => s.service?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className={`
        rounded-2xl border transition-all duration-500
        ${isInProgress
          ? 'border-emerald-500/30 bg-emerald-500/5 scale-[1.02] shadow-lg shadow-emerald-500/10'
          : isCompleted
            ? 'border-white/[0.04] bg-white/[0.02] opacity-50'
            : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'
        }
      `}
    >
      <div className={`p-5 sm:p-6 ${isInProgress ? 'sm:p-8' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          {/* Time + name */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`font-mono font-bold tracking-tight ${isInProgress ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}
                style={{ color: isInProgress ? '#34d399' : 'var(--tv-text, #f1f5f9)' }}
              >
                {appointment.start_time?.slice(0, 5)}
              </span>
              <StatusBadge status={appointment.status} />
            </div>
            <h2
              className={`font-bold leading-tight mt-2 ${isInProgress ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}
              style={{ color: 'var(--tv-text, #f1f5f9)' }}
            >
              {appointment.client_name || '—'}
            </h2>
          </div>
        </div>

        {/* Meta */}
        <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 ${isInProgress ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`} style={{ color: 'var(--tv-text-secondary, #94a3b8)' }}>
          {barberName !== '—' && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {barberName}
            </span>
          )}
          {services && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              {services}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ─── */

export default function TVQueue() {
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    loadData()
    intervalRef.current = setInterval(loadData, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [slug])

  async function loadData() {
    try {
      if (!slug) throw new Error('Slug no proporcionado')

      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .select('id, name, address, phone, template_colors, template_id')
        .eq('slug', slug)
        .single()
      if (bizErr) throw new Error('Barbería no encontrada')
      if (!biz) throw new Error('Barbería no encontrada')
      setBusiness(biz)

      const today = new Date().toISOString().split('T')[0]
      const { data: appts, error: apptErr } = await supabase
        .from('appointments')
        .select(`
          id, date, start_time, end_time, status, client_name,
          barber:barber_id(id, name),
          services:appointment_services(service:service_id(name))
        `)
        .eq('business_id', biz.id)
        .eq('date', today)
        .in('status', ['pending', 'confirmed', 'in_progress', 'completed'])
        .order('start_time', { ascending: true })
      if (apptErr) throw apptErr
      setAppointments(appts || [])
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('TVQueue error:', err)
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  /* ─── Derived colors ─── */
  const templateColors = business?.template_colors || {}
  const defaultColors = {
    primary: '#0a0a0f',
    accent: '#e94560',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
  }
  const tvColors = {
    primary:   templateColors.primary || defaultColors.primary,
    accent:    templateColors.accent || defaultColors.accent,
    text:      templateColors.text || defaultColors.text,
    textSecondary: templateColors.textSecondary || defaultColors.textSecondary,
  }

  /* ─── Grouped appointments ─── */
  const inProgress = appointments.filter(a => a.status === 'in_progress')
  const upcoming = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')
  const completed = appointments.filter(a => a.status === 'completed')

  /* ─── Render ─── */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: tvColors.primary }}>
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: tvColors.accent, animationDelay: '0ms' }} />
          <span className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: tvColors.accent, animationDelay: '150ms' }} />
          <span className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: tvColors.accent, animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5 mb-4">
            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white/80">Pantalla no disponible</h2>
          <p className="mt-2 text-sm text-white/40">{error || 'La barbería no existe o no está disponible.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen overflow-hidden flex flex-col select-none"
      style={{
        backgroundColor: tvColors.primary,
        '--tv-text': tvColors.text,
        '--tv-text-secondary': tvColors.textSecondary,
        '--tv-accent': tvColors.accent,
      }}
    >
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-8 sm:py-5 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: `${tvColors.accent}20`, color: tvColors.accent }}
          >
            {business.name?.charAt(0) || 'B'}
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-lg sm:text-xl truncate" style={{ color: tvColors.text }}>
              {business.name}
            </h1>
            <p className="text-xs sm:text-sm truncate" style={{ color: tvColors.textSecondary }}>
              {business.address || 'Fila de turnos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: tvColors.textSecondary }}>
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative rounded-full w-2.5 h-2.5 bg-emerald-400" />
            </span>
            <span className="hidden sm:inline">En vivo</span>
          </div>

          {/* Clock */}
          <div className="font-mono text-sm sm:text-base font-semibold tabular-nums" style={{ color: tvColors.text }}>
            <ClockDisplay />
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
        {appointments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/[0.03] mb-4">
              <svg className="w-8 h-8" style={{ color: tvColors.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-semibold" style={{ color: tvColors.text }}>Sin turnos hoy</p>
            <p className="text-sm mt-1" style={{ color: tvColors.textSecondary }}>
              No hay turnos agendados para hoy. La pantalla se actualiza automáticamente.
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* In progress */}
            {inProgress.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#34d399' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  En curso
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {inProgress.map(a => (
                    <AppointmentCard key={a.id} appointment={a} isInProgress />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: tvColors.textSecondary }}>
                  Próximos turnos ({upcoming.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map(a => (
                    <AppointmentCard key={a.id} appointment={a} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <section>
                <details className="group">
                  <summary className="text-xs font-semibold uppercase tracking-widest cursor-pointer py-2 flex items-center gap-2" style={{ color: tvColors.textSecondary }}>
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Completados ({completed.length})
                  </summary>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 mt-3">
                    {completed.map(a => (
                      <AppointmentCard key={a.id} appointment={a} isCompleted />
                    ))}
                  </div>
                </details>
              </section>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between px-6 py-3 sm:px-8 border-t border-white/[0.04] text-xs flex-shrink-0" style={{ color: tvColors.textSecondary }}>
        <span>TV Mode — {business.name}</span>
        <span className="tabular-nums">
          {lastRefresh
            ? `Última actualización: ${lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : '—'}
        </span>
      </footer>
    </div>
  )
}

/* ─── Live clock ─── */

function ClockDisplay() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <>{time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</>
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTemplateConfig } from '../../templates/registry'

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
        rounded-2xl border transition duration-500
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
              {appointment.client?.name || '—'}
            </h2>
          </div>
        </div>

        {/* Meta */}
        <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 ${isInProgress ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`} style={{ color: 'var(--tv-text-secondary, #94a3b8)' }}>
          {barberName !== '—' && (
            <span className="inline-flex items-center gap-1.5">
              <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {barberName}
            </span>
          )}
          {services && (
            <span className="inline-flex items-center gap-1.5">
              <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const intervalRef = useRef(null)
  const branchRef = useRef(null)
  const branchInitRef = useRef(false)
  const hasLoadedRef = useRef(false)

  function selectBranch(id) {
    branchRef.current = id
    branchInitRef.current = true
    setSelectedBranchId(id)
    // Re-fetch inmediato con la nueva sucursal
    loadData({ showLoader: true })
  }

  const loadData = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true)
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

      // Cargar sucursales activas
      const { data: branchList } = await supabase
        .from('branches')
        .select('id, name')
        .eq('business_id', biz.id)
        .eq('is_active', true)
        .order('name')
      const activeBranches = branchList || []
      setBranches(activeBranches)

      // Auto-seleccionar primera sucursal si no hay selección
      if (activeBranches.length > 0 && !branchInitRef.current) {
        branchInitRef.current = true
        branchRef.current = activeBranches[0].id
        setSelectedBranchId(activeBranches[0].id)
      }

      // Fecha local (no UTC): evita mostrar el día equivocado después de las 21:00.
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      // Filtrar por sucursal si hay selección
      const branchFilter = branchRef.current || (activeBranches.length > 0 ? activeBranches[0].id : null)

      // Cola vía RPC: anon ya no puede leer clients/appointments directamente.
      const { data: appts, error: apptErr } = await supabase.rpc('get_public_queue', {
        p_business_id: biz.id,
        p_branch_id: branchFilter,
        p_date: today,
      })
      if (apptErr) throw apptErr

      // Mostrar nombre de sucursal en cada turno
      const enriched = (appts || []).map(a => ({
        ...a,
        branch_name: activeBranches.find(b => b.id === a.branch_id)?.name || '',
      }))
      setAppointments(enriched)
      setError(null)
      setLastRefresh(new Date())
      hasLoadedRef.current = true
    } catch (err) {
      console.error('TVQueue error:', err)
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadData({ showLoader: true })
    intervalRef.current = setInterval(() => loadData(), 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [slug, loadData])

  /* ─── Derived colors ─── */
  const rawTemplateColors = business?.template_colors
  const parsedTemplateColors = typeof rawTemplateColors === 'string'
    ? (() => { try { return JSON.parse(rawTemplateColors) } catch { return {} } })()
    : (rawTemplateColors || {})
  const templateConfig = getTemplateConfig(business?.template_id, parsedTemplateColors)
  const tvEffective = {
    primary: parsedTemplateColors?.primary ? templateConfig.colors.primary : '#0a0a0f',
    accent: parsedTemplateColors?.accent ? templateConfig.colors.accent : (templateConfig.colors.accent || '#e94560'),
    text: parsedTemplateColors?.text ? templateConfig.colors.text : '#f1f5f9',
    textSecondary: parsedTemplateColors?.textSecondary ? templateConfig.colors.textSecondary : '#94a3b8',
    background: parsedTemplateColors?.background ? templateConfig.colors.background : '#0a0a0f',
    secondary: templateConfig.colors.secondary || '#16213e',
  }
  // on-colors derived for effective TV palette (contrast-safe)
  const tvOnAccent = templateConfig.colors.onAccent
  const tvOnPrimary = templateConfig.colors.onPrimary
  const tvColors = {
    ...templateConfig.colors,
    ...tvEffective,
    onAccent: tvOnAccent,
    onPrimary: tvOnPrimary,
  }
  const tvFontHeading = templateConfig.fonts?.heading
  const tvFontBody = templateConfig.fonts?.body
  const tvFontGoogle = templateConfig.fonts?.google

  useEffect(() => {
    const href = tvFontGoogle
    const id = 'barber-font-preset'
    let link = document.getElementById(id)
    if (!href) { if (link) link.remove(); return }
    if (!link) { link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'; document.head.appendChild(link) }
    if (link.href !== href) link.href = href
  }, [tvFontGoogle])

  /* ─── Grouped appointments ─── */
  const inProgress = appointments.filter(a => a.status === 'in_progress')
  const upcoming = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')
  const completed = appointments.filter(a => a.status === 'completed')

  /* ─── Render ─── */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: tvColors.primary }}>
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full animate-pulse-soft" style={{ backgroundColor: tvColors.accent, animationDelay: '0ms' }} />
          <span className="w-3 h-3 rounded-full animate-pulse-soft" style={{ backgroundColor: tvColors.accent, animationDelay: '150ms' }} />
          <span className="w-3 h-3 rounded-full animate-pulse-soft" style={{ backgroundColor: tvColors.accent, animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5 mb-4">
            <svg aria-hidden="true" focusable="false" className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
        fontFamily: tvFontBody || undefined,
        '--tv-text': tvColors.text,
        '--tv-text-secondary': tvColors.textSecondary,
        '--tv-accent': tvColors.accent,
        '--tv-on-accent': tvColors.onAccent,
        '--tv-font-heading': tvFontHeading || 'inherit',
        '--tv-font-body': tvFontBody || 'inherit',
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
          {/* Branch selector */}
          {branches.length > 1 && (
            <div className="flex items-center gap-1.5">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => selectBranch(b.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    (selectedBranchId || branches[0]?.id) === b.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

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
              <svg aria-hidden="true" focusable="false" className="w-8 h-8" style={{ color: tvColors.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
                    <svg aria-hidden="true" focusable="false" className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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

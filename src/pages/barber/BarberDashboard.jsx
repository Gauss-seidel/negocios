import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import CompleteAppointmentModal from '../../components/CompleteAppointmentModal'

/* ─── Helpers ─── */

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return new Intl.DateTimeFormat('es-PY', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

/* ─── Main ─── */

export default function BarberDashboard() {
  const { user, businessId } = useAuth()
  const [barberId, setBarberId] = useState(null)
  const [barberName, setBarberName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [date, setDate] = useState(todayStr)

  // My appointments
  const [myApps, setMyApps] = useState([])
  // Unassigned appointments (barber_id = null)
  const [unassignedApps, setUnassignedApps] = useState([])
  // Other barbers' appointments available for transfer
  const [otherBarberApps, setOtherBarberApps] = useState([])
  const [transferringId, setTransferringId] = useState(null)
  const [completingApp, setCompletingApp] = useState(null)

  useEffect(() => {
    if (user?.id && businessId) fetchAll()
  }, [user?.id, businessId, date])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      // Get barber profile linked to this user
      const { data: staff, error: se } = await supabase
        .from('business_staff')
        .select('barber_id')
        .eq('user_id', user.id)
        .eq('role', 'barber')
        .single()

      if (se || !staff?.barber_id) {
        setLoading(false)
        return
      }

      const bid = staff.barber_id
      setBarberId(bid)

      // Get barber name
      const { data: barber } = await supabase
        .from('barbers')
        .select('name')
        .eq('id', bid)
        .single()
      if (barber) setBarberName(barber.name)

      // Fetch all in parallel
      const [myRes, unassignedRes, otherBarbersRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, client:client_id(name, phone), services:appointment_services( id, price, service:services(name, price) ), products:appointment_products( id, quantity, price, product:inventory_products(name, price, current_stock) )')
          .eq('barber_id', bid)
          .eq('business_id', businessId)
          .gte('date', date)
          .lte('date', date)
          .order('start_time'),
        supabase
          .from('appointments')
          .select('*, services:appointment_services( id, price, service:services(name, price) ), products:appointment_products( id, quantity, price, product:inventory_products(name, price, current_stock) )')
          .is('barber_id', null)
          .eq('business_id', businessId)
          .gte('date', date)
          .lte('date', date)
          .order('start_time'),
        supabase
          .from('appointments')
          .select('*, client:client_id(name, phone), barber:barber_id(name), services:appointment_services( id, price, service:services(name, price) ), products:appointment_products( id, quantity, price, product:inventory_products(name, price, current_stock) )')
          .eq('business_id', businessId)
          .eq('date', date)
          .in('status', ['pending', 'confirmed'])
          .not('barber_id', 'is', null)
          .neq('barber_id', bid)
          .order('start_time'),
      ])

      if (myRes.error) throw myRes.error
      if (unassignedRes.error) throw unassignedRes.error
      if (otherBarbersRes.error) throw otherBarbersRes.error

      setMyApps(myRes.data || [])
      setUnassignedApps(unassignedRes.data || [])
      setOtherBarberApps(otherBarbersRes.data || [])
    } catch (err) {
      setError(err?.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(appointmentId, newStatus) {
    try {
      const { error: ue } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)
      if (ue) throw ue
      await fetchAll()
    } catch (err) {
      setError(err?.message || 'Error al actualizar estado')
    }
  }

  async function handleClaimAppointment(appointmentId) {
    if (!barberId) return
    try {
      const { error: ue } = await supabase
        .from('appointments')
        .update({ barber_id: barberId, status: 'confirmed' })
        .eq('id', appointmentId)
        .is('barber_id', null)
      if (ue) throw ue
      await fetchAll()
    } catch (err) {
      setError(err?.message || 'Error al tomar la reserva')
    }
  }

  async function handleTransferAppointment(appointmentId) {
    if (transferringId) return
    setTransferringId(appointmentId)
    try {
      const { data, error } = await supabase.rpc('transfer_appointment', {
        p_appointment_id: appointmentId,
      })

      if (error) throw error

      if (!data?.success) {
        setError(data.error)
        return
      }

      await fetchAll()
    } catch (err) {
      setError(err?.message || 'Error al transferir la reserva')
    } finally {
      setTransferringId(null)
    }
  }

  function handleCompleteOpen(appointment) {
    setCompletingApp(appointment)
  }

  async function handleCompleteConfirm(appointmentId, completedItems) {
    try {
      const { data, error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_completed_products: completedItems.products || [],
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Error al completar')

      setCompletingApp(null)
      await fetchAll()
    } catch (err) {
      setError(err?.message || 'Error al completar la reserva')
    }
  }

  const isToday = date === todayStr()
  const pendingApps = myApps.filter(a => a.status === 'pending' || a.status === 'confirmed')
  const inProgressApps = myApps.filter(a => a.status === 'in_progress')
  const completedApps = myApps.filter(a => a.status === 'completed')

  function goDay(delta) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().split('T')[0])
  }

  function renderAppointmentRow(a) {
    const timeStr = a.start_time?.substring(0, 5) || '—'
    const statusColors = {
      pending: 'border-l-amber-400',
      confirmed: 'border-l-blue-400',
      in_progress: 'border-l-violet-400',
      completed: 'border-l-emerald-400',
      cancelled: 'border-l-red-400',
      no_show: 'border-l-gray-500',
    }
    const borderColor = statusColors[a.status] || 'border-l-white/10'
    const clientName = a.client?.name || a.client_name || 'Cliente'

    return (
      <div key={a.id} className={`border-l-4 ${borderColor} px-6 py-4 transition-colors hover:bg-white/[0.02]`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-lg font-bold text-[var(--color-accent)]">
              {timeStr}
            </div>
            <div>
              <p className="font-medium text-white">{clientName}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {a.services?.length > 0 && a.services[0]?.service?.name && (
                  <span className="text-xs text-white/40">{a.services[0].service.name}</span>
                )}
                {a.total && (
                  <>
                    <span className="text-white/20">•</span>
                    <span className="text-xs text-white/50">₲ {Number(a.total).toLocaleString('es-PY')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              a.status === 'pending' || a.status === 'confirmed'
                ? 'bg-amber-500/10 text-amber-400'
                : a.status === 'in_progress'
                ? 'bg-blue-500/10 text-blue-400'
                : a.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-gray-500/10 text-gray-400'
            }`}>
              {a.status === 'pending' ? 'Pendiente'
                : a.status === 'confirmed' ? 'Confirmada'
                : a.status === 'in_progress' ? 'En curso'
                : a.status === 'completed' ? 'Completada'
                : a.status}
            </span>
            {a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'no_show' && (
              <div className="flex gap-1">
                {(a.status === 'pending' || a.status === 'confirmed') && (
                  <button
                    onClick={() => handleStatusChange(a.id, 'in_progress')}
                    className="rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-400 transition-all hover:bg-blue-500/20"
                    title="Iniciar"
                  >
                    Iniciar
                  </button>
                )}
                {a.status === 'in_progress' && (
                  <button
                    onClick={() => handleCompleteOpen(a)}
                    className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
                    title="Completar"
                  >
                    Completar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  /* ── No profile ── */
  if (!barberId) return (
    <div className="flex items-center justify-center py-32">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Perfil no encontrado</h3>
        <p className="mt-2 text-sm text-white/40">Tu usuario aún no está vinculado a un perfil de barbero. Contactá al administrador de tu barbería.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header + Date nav */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Hola, {barberName || 'Barbero'}
          </h1>
          <p className="mt-1 text-sm text-white/40 capitalize">{formatDate(date)}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goDay(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/40 transition-all hover:bg-white/5 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white transition-all focus:border-white/20 focus:bg-white/5 focus:outline-none [color-scheme:dark]"
          />

          <button
            onClick={() => goDay(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-white/40 transition-all hover:bg-white/5 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {!isToday && (
            <button
              onClick={() => setDate(todayStr())}
              className="rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/10 px-3 py-2 text-xs font-medium text-[var(--color-accent)] transition-all hover:bg-[var(--color-accent)]/20"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card dark hover>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-white/40">Pendientes</p>
              <p className="text-lg font-bold text-amber-400">{pendingApps.length}</p>
            </div>
          </div>
        </Card>
        <Card dark hover>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-white/40">En curso</p>
              <p className="text-lg font-bold text-blue-400">{inProgressApps.length}</p>
            </div>
          </div>
        </Card>
        <Card dark hover>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-white/40">Completados</p>
              <p className="text-lg font-bold text-emerald-400">{completedApps.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* My appointments */}
      <Card dark padding={false}>
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Mis Reservas</h2>
          <p className="mt-0.5 text-sm text-white/40">{myApps.length} {myApps.length === 1 ? 'reserva' : 'reservas'}</p>
        </div>

        {myApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12">
            <svg className="h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-white/60">Sin reservas para este día</h3>
            <p className="mt-1 text-sm text-white/30">No tenés reservas asignadas para esta fecha.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {myApps.map(renderAppointmentRow)}
          </div>
        )}
      </Card>

      {/* Unassigned appointments */}
      {unassignedApps.length > 0 && (
        <Card dark padding={false}>
          <div className="border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Reservas Sin Asignar</h2>
            </div>
            <p className="mt-0.5 text-sm text-white/40">{unassignedApps.length} {unassignedApps.length === 1 ? 'reserva esperando barbero' : 'reservas esperando barbero'}</p>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {unassignedApps.map(a => {
              const timeStr = a.start_time?.substring(0, 5) || '—'
              const clientName = a.client_name || (a.client?.name) || 'Cliente'

              return (
                <div key={a.id} className="border-l-4 border-l-amber-400/50 px-6 py-4 transition-colors hover:bg-white/[0.02]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-lg font-bold text-amber-400">
                        {timeStr}
                      </div>
                      <div>
                        <p className="font-medium text-white">{clientName}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          {a.services?.length > 0 && a.services[0]?.service?.name && (
                            <span className="text-xs text-white/40">{a.services[0].service.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleClaimAppointment(a.id)}
                    >
                      Tomar Reserva
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Otros barberos — reservas transferibles */}
      {otherBarberApps.length > 0 && (
        <Card dark padding={false}>
          <div className="border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Reservas de Otros Barberos</h2>
            </div>
            <p className="mt-0.5 text-sm text-white/40">
              {otherBarberApps.length} {otherBarberApps.length === 1 ? 'reserva disponible' : 'reservas disponibles'} para tomar
            </p>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {otherBarberApps.map(a => {
              const timeStr = a.start_time?.substring(0, 5) || '—'
              const clientName = a.client?.name || 'Cliente'
              const barberName = a.barber?.name || 'Otro barbero'

              return (
                <div key={a.id} className="border-l-4 border-l-violet-400/50 px-6 py-4 transition-colors hover:bg-white/[0.02]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-lg font-bold text-violet-400">
                        {timeStr}
                      </div>
                      <div>
                        <p className="font-medium text-white">{clientName}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-white/50">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                            {barberName}
                          </span>
                          {a.services?.length > 0 && a.services[0]?.service?.name && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="text-xs text-white/40">{a.services[0].service.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        a.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {a.status === 'pending' ? 'Pendiente' : 'Confirmada'}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTransferAppointment(a.id)}
                        loading={transferringId === a.id}
                      >
                        Tomar Reserva
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {completingApp && (
        <CompleteAppointmentModal
          appointment={completingApp}
          services={completingApp.services || []}
          products={completingApp.products || []}
          onConfirm={(items) => handleCompleteConfirm(completingApp.id, items)}
          onClose={() => setCompletingApp(null)}
        />
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { usePlan } from '../../hooks/usePlan'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import CompleteAppointmentModal from '../../components/CompleteAppointmentModal'
import { APPOINTMENT_STATUS } from '../../lib/constants'
import { fmtCurrency as formatCurrency } from '../../utils/format'

const STATUS_ACTIONS = [
  { status: APPOINTMENT_STATUS.CONFIRMED, label: 'Confirmar', variant: 'primary' },
  { status: APPOINTMENT_STATUS.IN_PROGRESS, label: 'En curso', variant: 'primary' },
  { status: APPOINTMENT_STATUS.COMPLETED, label: 'Completada', variant: 'primary' },
  { status: APPOINTMENT_STATUS.CANCELLED, label: 'Cancelar', variant: 'danger' },
  { status: APPOINTMENT_STATUS.NO_SHOW, label: 'No asistió', variant: 'danger' },
]

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: APPOINTMENT_STATUS.PENDING, label: 'Pendientes' },
  { value: APPOINTMENT_STATUS.CONFIRMED, label: 'Confirmadas' },
  { value: APPOINTMENT_STATUS.IN_PROGRESS, label: 'En curso' },
  { value: APPOINTMENT_STATUS.COMPLETED, label: 'Completadas' },
  { value: APPOINTMENT_STATUS.CANCELLED, label: 'Canceladas' },
  { value: APPOINTMENT_STATUS.NO_SHOW, label: 'No asistieron' },
]

const STATUS_BADGE = {
  [APPOINTMENT_STATUS.PENDING]: 'bg-amber-100 text-amber-700',
  [APPOINTMENT_STATUS.CONFIRMED]: 'bg-emerald-100 text-emerald-700',
  [APPOINTMENT_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
  [APPOINTMENT_STATUS.COMPLETED]: 'bg-gray-100 text-gray-600',
  [APPOINTMENT_STATUS.CANCELLED]: 'bg-red-100 text-red-700',
  [APPOINTMENT_STATUS.NO_SHOW]: 'bg-gray-100 text-gray-500',
}

const STATUS_LABEL = {
  [APPOINTMENT_STATUS.PENDING]: 'Pendiente',
  [APPOINTMENT_STATUS.CONFIRMED]: 'Confirmada',
  [APPOINTMENT_STATUS.IN_PROGRESS]: 'En curso',
  [APPOINTMENT_STATUS.COMPLETED]: 'Completada',
  [APPOINTMENT_STATUS.CANCELLED]: 'Cancelada',
  [APPOINTMENT_STATUS.NO_SHOW]: 'No asistió',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr + 'T12:00:00'))
  } catch { return '—' }
}

function formatTime(time) {
  if (!time) return '--:--'
  const [h, m] = time.split(':')
  return `${(h || '').padStart(2, '0')}:${(m || '').padStart(2, '0')}`
}

export default function AppointmentsPage() {
  const { businessId } = useAuth()
  const { planName, limits, loading: planLoading } = usePlan()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [completingApp, setCompletingApp] = useState(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const { isMobile } = useResponsiveTable()

  useEffect(() => {
    if (businessId) fetchAppointments()
  }, [businessId])

  async function fetchAppointments() {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('appointments')
          .select(
            `
            id, date, start_time, status, total, notes, created_at,
            client:client_id (id, name, phone),
            barber:barber_id (id, name),
            services:appointment_services ( id, price, service:services ( name, price ) ),
            products:appointment_products ( id, quantity, price, product:inventory_products ( name, price, current_stock ) )
          `
          )
        .eq('business_id', businessId)

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }
      if (dateFilter) {
        query = query.eq('date', dateFilter)
      }

      query = query.order('date', { ascending: false }).order('start_time', { ascending: false })

      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr

      setAppointments(data || [])
    } catch (err) {
      setError(err?.message || 'Error al cargar reservas')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(appointment, newStatus) {
    setActionLoading(true)
    try {
      const { error: updateErr } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointment.id)
      if (updateErr) throw updateErr
      await fetchAppointments()
    } catch (err) {
      setError(err?.message || 'Error al actualizar estado')
    } finally {
      setActionLoading(false)
    }
  }

  function handleCompleteOpen(appointment) {
    setCompletingApp(appointment)
  }

  async function handleCompleteConfirm(appointmentId, completedItems) {
    setActionLoading(true)
    try {
      const { data, error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_completed_products: completedItems.products || [],
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Error al completar')

      setCompletingApp(null)
      await fetchAppointments()
    } catch (err) {
      setError(err?.message || 'Error al completar la reserva')
    } finally {
      setActionLoading(false)
    }
  }

  function canShowAction(appt, action) {
    const status = appt.status
    if (action.status === APPOINTMENT_STATUS.CONFIRMED) return status === APPOINTMENT_STATUS.PENDING
    if (action.status === APPOINTMENT_STATUS.IN_PROGRESS) return status === APPOINTMENT_STATUS.CONFIRMED
    if (action.status === APPOINTMENT_STATUS.COMPLETED) return status === APPOINTMENT_STATUS.IN_PROGRESS
    if (action.status === APPOINTMENT_STATUS.CANCELLED) return status === APPOINTMENT_STATUS.PENDING || status === APPOINTMENT_STATUS.CONFIRMED
    if (action.status === APPOINTMENT_STATUS.NO_SHOW) return status === APPOINTMENT_STATUS.CONFIRMED || status === APPOINTMENT_STATUS.IN_PROGRESS
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Cargando reservas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reservas</h1>
        <p className="mt-1 text-sm text-gray-500">Gestiona todas las reservas de tu negocio</p>
        {!planLoading && (
          <p className="mt-1 text-xs text-gray-400">
            Plan {planName}: Limite de <strong>{limits.max_monthly_bookings.toLocaleString('es-MX')}</strong> reservas/mes
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Cerrar</button>
        </div>
      )}

      {/* Filters */}
      <Card padding={false}>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Estado:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
               className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Fecha:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          <Button variant="secondary" size="sm" onClick={fetchAppointments}>
            Filtrar
          </Button>

          {(statusFilter || dateFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setDateFilter('') }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Appointments table / mobile cards */}
      <Card padding={false}>
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-gray-900">No hay reservas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter || dateFilter ? 'No se encontraron reservas con los filtros seleccionados.' : 'Aún no hay reservas registradas.'}
            </p>
          </div>
        ) : isMobile ? (
          /* ── Mobile card layout ── */
          <div className="space-y-3 p-4">
            {appointments.map((appt) => (
              <div key={appt.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900">{appt.client?.name || '—'}</span>
                    {appt.client?.phone && (
                      <span className="block text-xs text-gray-400">{appt.client.phone}</span>
                    )}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[appt.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[appt.status] || appt.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-400">Barbero</span>
                    <p className="text-gray-700">{appt.barber?.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Servicio</span>
                    <p className="truncate text-gray-700">{appt.services?.[0]?.service?.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Fecha</span>
                    <p className="text-gray-700">{formatDate(appt.date)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Hora</span>
                    <p className="text-gray-700">{formatTime(appt.start_time)}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {appt.total ? formatCurrency(appt.total) : '—'}
                  </span>
                </div>
                {STATUS_ACTIONS.some((a) => canShowAction(appt, a)) && (
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                    {STATUS_ACTIONS.filter((a) => canShowAction(appt, a)).map((action) => (
                      <Button
                        key={action.status}
                        variant={action.variant === 'danger' ? 'ghost' : 'ghost'}
                        size="sm"
                        onClick={() => action.status === APPOINTMENT_STATUS.COMPLETED ? handleCompleteOpen(appt) : handleStatusChange(appt, action.status)}
                        disabled={actionLoading}
                        className={action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : ''}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop table ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 sm:px-6">Cliente</th>
                  <th className="px-4 py-3 sm:px-6">Barbero</th>
                  <th className="px-4 py-3 sm:px-6">Servicio</th>
                  <th className="px-4 py-3 sm:px-6">Fecha</th>
                  <th className="px-4 py-3 sm:px-6">Hora</th>
                  <th className="px-4 py-3 sm:px-6">Total</th>
                  <th className="px-4 py-3 sm:px-6">Estado</th>
                  <th className="px-4 py-3 sm:px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 sm:px-6">
                      <span className="font-medium text-gray-900">{appt.client?.name || '—'}</span>
                      {appt.client?.phone && (
                        <span className="block text-xs text-gray-400">{appt.client.phone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 sm:px-6 text-gray-600">{appt.barber?.name || '—'}</td>
                    <td className="px-4 py-3 sm:px-6 text-gray-600">{appt.services?.[0]?.service?.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600 sm:px-6">{formatDate(appt.date)}</td>
                    <td className="px-4 py-3 text-gray-600 sm:px-6">{formatTime(appt.start_time)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 sm:px-6">
                      {appt.total ? formatCurrency(appt.total) : '—'}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[appt.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[appt.status] || appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <div className="flex items-center justify-end gap-1">
                        {STATUS_ACTIONS.filter((a) => canShowAction(appt, a)).map((action) => (
                          <Button
                            key={action.status}
                            variant={action.variant === 'danger' ? 'ghost' : 'ghost'}
                            size="sm"
                          onClick={() => action.status === APPOINTMENT_STATUS.COMPLETED ? handleCompleteOpen(appt) : handleStatusChange(appt, action.status)}
                          disabled={actionLoading}
                          className={action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : ''}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_FILTERS.filter((f) => f.value).map((f) => {
          const count = appointments.filter((a) => a.status === f.value).length
          return (
            <Card key={f.value} className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{f.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
            </Card>
          )
        })}
      </div>

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

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './ui/Modal'
import { fmtCurrency } from '../utils/format'

const STATUS_STYLES = {
  completed: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr + 'T12:00:00'))
  } catch {
    return '—'
  }
}

function formatTime(time) {
  if (!time) return '--:--'
  const [h, m] = time.split(':')
  return `${(h || '').padStart(2, '0')}:${(m || '').padStart(2, '0')}`
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function ClientHistoryModal({ clientId, onClose }) {
  const [client, setClient] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedAppt, setExpandedAppt] = useState(null)

  useEffect(() => {
    if (clientId) fetchData()
  }, [clientId])

  async function fetchData() {
    setLoading(true)
    setError(null)

    try {
      const [{ data: clientData, error: clientErr }, { data: history, error: historyErr }] =
        await Promise.all([
          supabase
            .from('clients')
            .select('name, phone, email')
            .eq('id', clientId)
            .single(),
          supabase
            .from('appointments')
            .select(
              `
              id, date, start_time, end_time, status, total, created_at,
              barber:barber_id(id, name),
              services:appointment_services(service:service_id(id, name, price)),
              products:appointment_products(id, product:product_id(id, name, price), quantity)
            `
            )
            .eq('client_id', clientId)
            .order('date', { ascending: false })
            .limit(50),
        ])

      if (clientErr) throw clientErr
      if (historyErr) throw historyErr

      setClient(clientData)
      setAppointments(history || [])
    } catch (err) {
      setError(err?.message || 'Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  const validVisits = appointments.filter((a) =>
    ['completed', 'in_progress', 'confirmed'].includes(a.status)
  )
  const totalVisits = validVisits.length
  const totalSpent = validVisits.reduce((s, a) => s + (Number(a.total) || 0), 0)
  const lastVisit = appointments.length > 0 ? appointments[0].date : null
  const avgPerVisit = totalVisits > 0 ? totalSpent / totalVisits : 0

  return (
    <Modal open={true} onClose={onClose} title="" size="xl">
      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg
              className="mx-auto h-8 w-8 animate-spin text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500">Cargando historial...</p>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">Error al cargar</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:brightness-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && !error && (
        <div className="space-y-6">
          {/* Client header */}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              {client?.name || 'Cliente'}
            </h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              {client?.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {client.phone}
                </span>
              )}
              {client?.email && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {client.email}
                </span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total visitas', value: totalVisits, icon: 'calendar' },
              { label: 'Total gastado', value: fmtCurrency(totalSpent), icon: 'cash' },
              {
                label: 'Última visita',
                value: lastVisit ? formatDate(lastVisit) : '—',
                icon: 'clock',
              },
              { label: 'Promedio por visita', value: fmtCurrency(avgPerVisit), icon: 'chart' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  {stat.label}
                </p>
                <p className="mt-1.5 text-lg font-bold tracking-tight text-gray-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Appointments list */}
          <div>
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              Reservas {appointments.length > 0 && `(${appointments.length})`}
            </h3>

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12">
                <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-3 text-sm text-gray-400">Este cliente no tiene reservas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map((appt) => {
                  const isExpanded = expandedAppt === appt.id
                  const services = appt.services || []
                  const products = appt.products || []
                  const servicesTotal = services.reduce(
                    (s, as) => s + (Number(as.service?.price) || 0),
                    0
                  )
                  const productsTotal = products.reduce(
                    (s, ap) => s + (Number(ap.product?.price) || 0) * (Number(ap.quantity) || 1),
                    0
                  )

                  return (
                    <div
                      key={appt.id}
                      className="rounded-xl border border-gray-100 transition-colors hover:border-gray-200 hover:bg-gray-50/30"
                    >
                      {/* Main row — always visible */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(appt.date)}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-sm text-gray-600">
                              {formatTime(appt.start_time)}
                              {appt.end_time && ` - ${formatTime(appt.end_time)}`}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                            <span>{appt.barber?.name || '—'}</span>
                            {services.length > 0 && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="truncate max-w-[200px]">
                                  {services.map((s) => s.service?.name).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="hidden items-center gap-3 sm:flex">
                          <span className="text-sm font-semibold text-gray-900">
                            {fmtCurrency(appt.total)}
                          </span>
                          <StatusBadge status={appt.status} />
                        </div>

                        {/* Mobile: total + status stacked */}
                        <div className="flex flex-col items-end gap-1 sm:hidden">
                          <span className="text-sm font-semibold text-gray-900">
                            {fmtCurrency(appt.total)}
                          </span>
                          <StatusBadge status={appt.status} />
                        </div>

                        <button
                          onClick={() =>
                            setExpandedAppt(isExpanded ? null : appt.id)
                          }
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          aria-label={isExpanded ? 'Cerrar detalle' : 'Ver detalle'}
                        >
                          <svg
                            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-3">
                          <div className="grid gap-4 sm:grid-cols-2">
                            {/* Services */}
                            <div>
                              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                Servicios
                              </h4>
                              {services.length === 0 ? (
                                <p className="text-xs text-gray-400">Sin servicios</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {services.map((as, i) => (
                                    <li key={i} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-700">{as.service?.name || '—'}</span>
                                      <span className="font-medium text-gray-900">
                                        {fmtCurrency(as.service?.price)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Products */}
                            <div>
                              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                Productos
                              </h4>
                              {products.length === 0 ? (
                                <p className="text-xs text-gray-400">Sin productos</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {products.map((ap) => (
                                    <li key={ap.id} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-700">
                                        {ap.product?.name || '—'}
                                        <span className="text-gray-400">
                                          {' '}× {ap.quantity || 1}
                                        </span>
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        {fmtCurrency(
                                          (Number(ap.product?.price) || 0) * (Number(ap.quantity) || 1)
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          {/* Subtotal breakdown */}
                          {(servicesTotal > 0 || productsTotal > 0) && (
                            <div className="mt-3 border-t border-gray-100 pt-3">
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between text-gray-500">
                                  <span>Servicios</span>
                                  <span>{fmtCurrency(servicesTotal)}</span>
                                </div>
                                {productsTotal > 0 && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Productos</span>
                                    <span>{fmtCurrency(productsTotal)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-semibold text-gray-900">
                                  <span>Total</span>
                                  <span>{fmtCurrency(appt.total)}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Timestamps */}
                          <div className="mt-3 flex gap-4 text-[10px] text-gray-400">
                            {appt.created_at && (
                              <span>Creada: {formatDate(appt.created_at.split('T')[0])}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

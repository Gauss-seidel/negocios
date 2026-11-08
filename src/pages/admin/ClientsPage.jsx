import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useBranch } from '../../contexts/BranchContext'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { fmtCurrency as formatCurrency } from '../../utils/format'
import ClientHistoryModal from '../../components/ClientHistoryModal'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('es-PY', {
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

export default function ClientsPage() {
  const { businessId } = useAuth()
  const { currentBranch } = useBranch()
  const [clients, setClients] = useState([])
  // filteredClients derived from search/clients via useMemo below
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [expandedClient, setExpandedClient] = useState(null)
  const [clientHistory, setClientHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyClientId, setHistoryClientId] = useState(null)

  const { isMobile } = useResponsiveTable()

  useEffect(() => {
    if (businessId) fetchClients()
  }, [businessId])

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    )
  }, [search, clients])

  async function fetchClients() {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchErr } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', businessId)
        .order('name')

      if (fetchErr) throw fetchErr

      // Enrich with appointment stats
      const enriched = await Promise.all(
        (data || []).map(async (client) => {
          const { count: totalVisits } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .in('status', ['completed', 'in_progress', 'confirmed'])

          const { data: totals } = await supabase
            .from('appointments')
            .select('total')
            .eq('client_id', client.id)
            .in('status', ['completed', 'in_progress', 'confirmed'])

          const totalSpent = (totals || []).reduce((sum, a) => sum + (Number(a.total) || 0), 0)

          return {
            ...client,
            total_visits: totalVisits ?? 0,
            total_spent: totalSpent,
          }
        })
      )

      setClients(enriched)
    } catch (err) {
      setError(err?.message || 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  async function toggleExpand(client) {
    if (expandedClient === client.id) {
      setExpandedClient(null)
      setClientHistory([])
      return
    }

    setExpandedClient(client.id)
    setHistoryLoading(true)

    try {
      const { data, error: fetchErr } = await supabase
        .from('appointments')
        .select(
          `
          id, date, start_time, status, total,
          barber:barber_id (name),
          services:appointment_services ( service:services ( name ) )
        `
        )
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .limit(20)

      if (fetchErr) throw fetchErr
      setClientHistory(data || [])
    } catch {
      setClientHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  function renderStatusBadge(status) {
    const colors = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-[var(--color-paper-2)] text-[var(--color-text-secondary)]',
      cancelled: 'bg-red-100 text-red-700',
      no_show: 'bg-[var(--color-paper-2)] text-[var(--color-text-secondary)]',
    }
    const labels = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      in_progress: 'En curso',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No asistió',
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-[var(--color-paper-2)] text-[var(--color-text-secondary)]'}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg aria-hidden="true" focusable="false" className="mx-auto h-10 w-10 animate-spin text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Cargando clientes…</p>
        </div>
      </div>
    )
  }

  if (error && clients.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg aria-hidden="true" focusable="false" className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">Error al cargar</h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{error}</p>
          <button
            onClick={fetchClients}
            className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:brightness-90"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Clientes</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Historial y datos de tus clientes</p>
      </div>

      {/* Search */}
      <Card>
        <div className="max-w-md">
          <Input
            label="Buscar cliente"
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, teléfono o email…"
          />
        </div>
      </Card>

      {/* Clients list */}
      {filteredClients.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <svg aria-hidden="true" focusable="false" className="h-12 w-12 text-[var(--color-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-[var(--color-text)]">
              {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {search ? 'Intenta con otro término de búsqueda.' : 'Los clientes aparecerán cuando agenden citas.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card key={client.id} padding={false}>
              {/* Client header row */}
              <div
                className="flex cursor-pointer items-center gap-4 px-4 py-4 sm:px-6"
                onClick={() => toggleExpand(client)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper-2)] text-sm font-bold text-[var(--color-text-secondary)]">
                  {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--color-text)] truncate">{client.name || 'Sin nombre'}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-secondary)]">
                    {client.phone && <span>{client.phone}</span>}
                    {client.email && <span>{client.email}</span>}
                  </div>
                </div>
                {/* Desktop stats — visible sm:block */}
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">{client.total_visits} visitas</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{formatCurrency(client.total_spent)}</p>
                </div>
                {/* Mobile compact stats — visible solo en mobile */}
                <div className="sm:hidden text-right shrink-0">
                  <p className="text-xs font-medium text-[var(--color-text)]">{client.total_visits}</p>
                  <p className="text-[10px] text-[var(--color-muted)]">visitas</p>
                </div>
                {/* History button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setHistoryClientId(client.id)
                  }}
                  className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-paper)]"
                >
                  Historial
                </button>
                <svg aria-hidden="true" focusable="false"
                  className={`h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform ${
                    expandedClient === client.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded history */}
              {expandedClient === client.id && (
                <div className="border-t border-[var(--color-border)] px-4 py-4 sm:px-6">
                  <h4 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Historial de reservas</h4>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <svg aria-hidden="true" focusable="false" className="h-6 w-6 animate-spin text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : clientHistory.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">Sin reservas registradas.</p>
                  ) : isMobile ? (
                    /* ── Mobile cards for history ── */
                    <div className="space-y-2">
                      {clientHistory.map((appt) => (
                        <div key={appt.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--color-text)]">
                              {formatDate(appt.date)} · {formatTime(appt.start_time)}
                            </span>
                            {renderStatusBadge(appt.status)}
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                            <span>{appt.barber?.name || '—'}</span>
                            <span className="text-[var(--color-muted)]">|</span>
                            <span className="truncate">{appt.services?.[0]?.service?.name || '—'}</span>
                            <span className="ml-auto font-medium text-[var(--color-text)]">
                              {appt.total ? formatCurrency(appt.total) : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* ── Desktop table ── */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
 <tr className="border-b border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)]">
                            <th className="pb-2 pr-4">Fecha</th>
                            <th className="pb-2 pr-4">Hora</th>
                            <th className="pb-2 pr-4">Barbero</th>
                            <th className="pb-2 pr-4">Servicio</th>
                            <th className="pb-2 pr-4">Total</th>
                            <th className="pb-2 pr-4">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                          {clientHistory.map((appt) => (
                            <tr key={appt.id} className="hover:bg-[var(--color-paper)]">
                              <td className="whitespace-nowrap py-2 pr-4 text-[var(--color-text-secondary)]">{formatDate(appt.date)}</td>
                              <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{formatTime(appt.start_time)}</td>
                              <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{appt.barber?.name || '—'}</td>
                              <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{appt.services?.[0]?.service?.name || '—'}</td>
                              <td className="py-2 pr-4 font-medium text-[var(--color-text)]">
                                {appt.total ? formatCurrency(appt.total) : '—'}
                              </td>
                              <td className="py-2">{renderStatusBadge(appt.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Client History Modal */}
      {historyClientId && (
        <ClientHistoryModal
          clientId={historyClientId}
          branchId={currentBranch?.id}
          onClose={() => setHistoryClientId(null)}
        />
      )}
    </div>
  )
}

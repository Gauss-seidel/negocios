import { supabase } from '../../lib/supabase'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'

export default function BarberProfile() {
  const { user, businessId } = useAuth()
  const [barberId, setBarberId] = useState(null)
  const [barber, setBarber] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBarber = useCallback(async () => {
    if (!user?.id || !businessId) return
    setLoading(true)
    setError(null)
    try {
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

      const { data: barberData, error: be } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', bid)
        .single()

      if (be) throw be
      setBarber(barberData)
    } catch (err) {
      setError(err?.message || 'Error al cargar perfil')
    } finally {
      setLoading(false)
    }
  }, [user, businessId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user?.id && businessId) fetchBarber()
  }, [user, businessId, fetchBarber])

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
        <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  /* ── No profile ── */
  if (!barberId) return (
    <div className="flex items-center justify-center py-32">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <svg aria-hidden="true" focusable="false" className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">Perfil no encontrado</h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Tu usuario aún no está vinculado a un perfil de barbero. Contactá al administrador de tu barbería.</p>
      </div>
    </div>
  )

  const accentColor = barber?.color || 'var(--color-accent)'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-[var(--color-ink)] sm:text-[2.125rem]">Mi Perfil</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Información personal y configuración de tu perfil de barbero</p>
      </div>

      {/* Profile card */}
      <Card padding={false}>
        <div className="flex flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div
            className="flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-md"
            style={{ backgroundColor: accentColor }}
          >
            {barber?.name?.charAt(0)?.toUpperCase() || 'B'}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text)]">{barber?.name || 'Sin nombre'}</h2>
              {barber?.email && (
                <p className="mt-1 text-sm text-[var(--color-muted)]">{barber.email}</p>
              )}
            </div>

            {barber?.specialty && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-paper-2)] px-3 py-1">
                <svg aria-hidden="true" focusable="false" className="h-3.5 w-3.5 text-[var(--color-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{barber.specialty}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Details card */}
      <Card>
        <h3 className="mb-4 text-base font-semibold text-[var(--color-text)]">Detalles del Perfil</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
            <p className="text-xs font-medium text-[var(--color-muted)]">Nombre</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{barber?.name || '—'}</p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
            <p className="text-xs font-medium text-[var(--color-muted)]">Email</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{barber?.email || '—'}</p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
            <p className="text-xs font-medium text-[var(--color-muted)]">Teléfono</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{barber?.phone || '—'}</p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
            <p className="text-xs font-medium text-[var(--color-muted)]">Especialidad</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{barber?.specialty || '—'}</p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
            <p className="text-xs font-medium text-[var(--color-muted)]">Color</p>
            <div className="mt-1 flex items-center gap-2">
              <div
                className="h-5 w-5 rounded-md border border-[var(--color-border)]"
                style={{ backgroundColor: accentColor }}
              />
              <span className="text-sm font-medium text-[var(--color-text)]">{barber?.color || 'Color de la barbería'}</span>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
    </div>
  )
}

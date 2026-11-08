import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { openStatus } from '../../utils/hours'

function extractCity(address) {
  if (!address) return null
  const parts = address.split(',').map((p) => p.trim())
  const last = parts[parts.length - 1]
  return last.replace(/^(CP|Código Postal|Zona|Barrio)\s+/i, '').trim() || null
}

const STATUS_DOT = {
  open: 'bg-emerald-600',
  later: 'bg-[var(--color-brass)]',
  closed: 'bg-[var(--color-muted)]',
}

function BusinessCard({ business, hours, eager }) {
  const pending = business.status !== 'active'
  const status = pending ? { state: 'closed', label: 'Próximamente' } : openStatus(hours)

  return (
    <Link
      to={`/barberia/${business.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-[var(--color-border-strong)] hover:shadow-md sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-bottle)] text-[var(--color-brass-soft)]">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt=""
              className="h-full w-full object-cover"
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
            />
          ) : (
            <span className="font-serif text-2xl font-semibold">{business.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[1.375rem] font-semibold leading-tight text-[var(--color-ink)]">
            {business.name}
          </h3>
          {business.address && (
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--color-text-secondary)]">
              {business.address}
            </p>
          )}
        </div>
      </div>

      {business.description && (
        <p className="mt-4 line-clamp-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          {business.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        {status.label ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status.state] || STATUS_DOT.closed}`} aria-hidden="true" />
            {status.label}
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex h-10 items-center rounded-lg bg-[var(--color-paper-2)] px-4 text-sm font-semibold text-[var(--color-ink)] transition-colors group-hover:bg-[var(--color-bottle)] group-hover:text-[var(--color-accent-ink)]">
          {pending ? 'Ver barbería' : 'Reservar'}
        </span>
      </div>
    </Link>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6" aria-hidden="true">
      <div className="flex gap-4">
        <div className="skeleton h-14 w-14 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-5 w-2/3" />
          <div className="skeleton h-4 w-full" />
        </div>
      </div>
      <div className="skeleton mt-6 h-4 w-5/6" />
      <div className="mt-6 flex justify-between">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-10 w-24 rounded-lg" />
      </div>
    </div>
  )
}

function CityChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-[var(--color-brass-soft)] text-[var(--color-ink)]'
          : 'text-[var(--color-accent-ink)]/85 ring-1 ring-inset ring-white/25 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

const STEPS = [
  { t: 'Elegí la barbería', d: 'Mirá servicios, precios y horarios antes de decidir.' },
  { t: 'Reservá barbero y hora', d: 'Solo ves los horarios que de verdad están libres.' },
  { t: 'Llegá a tu turno', d: 'Tu lugar queda confirmado al instante, sin llamadas.' },
]

export default function Marketplace() {
  const [businesses, setBusinesses] = useState([])
  const [hoursByBiz, setHoursByBiz] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const searchRef = useRef(null)

  const loadBusinesses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .in('status', ['active', 'pending'])
        .order('name')
      if (error) throw error
      const list = data || []
      setBusinesses(list)
      if (list.length) {
        const { data: hrs } = await supabase
          .from('business_hours')
          .select('business_id, day_of_week, open_time, close_time, is_closed')
          .in('business_id', list.map((b) => b.id))
        const grouped = {}
        for (const h of hrs || []) (grouped[h.business_id] ||= []).push(h)
        setHoursByBiz(grouped)
      }
    } catch (err) {
      console.error('Error:', err)
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
  useEffect(() => { loadBusinesses() }, [loadBusinesses])

  const cities = useMemo(
    () => [...new Set(businesses.map((b) => extractCity(b.address)).filter(Boolean))].sort(),
    [businesses]
  )

  const q = search.trim().toLowerCase()
  const filtered = businesses.filter((b) => {
    const matchesSearch = !q || b.name.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q)
    const matchesCity = !cityFilter || extractCity(b.address) === cityFilter
    return matchesSearch && matchesCity
  })
  const hasFilters = Boolean(q || cityFilter)
  const clearFilters = () => { setSearch(''); setCityFilter(''); searchRef.current?.focus() }

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-[var(--color-bottle)] text-[var(--color-accent-ink)]">
        <div className="container-page grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:items-end lg:gap-16 lg:py-24">
          <div className="max-w-2xl">
            <h1 className="font-serif text-display font-semibold text-balance">
              Reservá tu corte sin hacer fila.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-accent-ink)]/75 sm:text-lg">
              Elegí barbería, barbero y horario. Tu turno queda confirmado al instante.
            </p>
          </div>

          <div className="max-w-2xl lg:pb-2">
            <label htmlFor="market-search" className="sr-only">Buscar por nombre o dirección</label>
            <div className="flex h-14 items-center gap-3 rounded-xl bg-[var(--color-surface)] px-4 text-[var(--color-ink)] shadow-lg ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[var(--color-brass)]">
              <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--color-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
              <input
                ref={searchRef}
                id="market-search"
                type="search"
                placeholder="Nombre de la barbería o zona"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-full w-full bg-transparent text-base placeholder:text-[var(--color-muted)] focus:outline-none"
                autoComplete="off"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); searchRef.current?.focus() }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-paper-2)]"
                  aria-label="Borrar búsqueda"
                >
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {cities.length > 1 && (
              <div className="-mx-[var(--gutter)] mt-4 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0">
                <div className="flex gap-2 sm:flex-wrap" role="group" aria-label="Filtrar por ciudad">
                  <CityChip active={!cityFilter} onClick={() => setCityFilter('')}>Todas</CityChip>
                  {cities.map((city) => (
                    <CityChip key={city} active={cityFilter === city} onClick={() => setCityFilter(city === cityFilter ? '' : city)}>
                      {city}
                    </CityChip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="rule-brass absolute inset-x-0 bottom-0" aria-hidden="true" />
      </section>

      {/* Listado */}
      <section id="barberias" className="container-page py-10 sm:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mb-8">
          <div>
            <h2 className="font-serif text-title font-semibold text-[var(--color-ink)]">
              {hasFilters ? 'Resultados' : 'Barberías'}
            </h2>
            {!loading && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {filtered.length} {filtered.length === 1 ? 'barbería' : 'barberías'}
                {cityFilter ? ` en ${cityFilter}` : ''}
              </p>
            )}
          </div>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-sm font-semibold text-[var(--color-brass-ink)] underline-offset-4 hover:underline">
              Quitar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3" aria-label="Cargando barberías">
            {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] px-6 py-14 text-center">
            <p className="font-serif text-xl font-semibold text-[var(--color-ink)]">
              {hasFilters ? 'Ninguna barbería coincide con tu búsqueda' : 'Todavía no hay barberías publicadas'}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {hasFilters ? 'Probá con otra zona o quitá los filtros.' : 'Volvé a mirar en unos días.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="mt-5 inline-flex h-11 items-center rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-accent-ink)]">
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {filtered.map((business, i) => (
              <BusinessCard key={business.id} business={business} hours={hoursByBiz[business.id]} eager={i < 3} />
            ))}
          </div>
        )}
      </section>

      {/* Cómo funciona — es una secuencia real, por eso va numerada */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container-page py-12 sm:py-16">
          <h2 className="font-serif text-title font-semibold text-[var(--color-ink)]">Cómo funciona</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4 sm:block">
                <span className="font-serif text-4xl font-semibold leading-none text-[var(--color-brass)] tabular sm:text-5xl" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="sm:mt-4">
                  <h3 className="text-base font-semibold text-[var(--color-ink)]">{s.t}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Para dueños */}
      <section className="container-page py-12 sm:py-14">
        <div className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-xl">
            <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)]">¿Tenés una barbería?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
              Agenda, caja, inventario y tu propia página de reservas con el estilo de tu local.
            </p>
          </div>
          <Link to="/admin" className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] px-6 text-[15px] font-semibold text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)]">
            Entrar al panel
          </Link>
        </div>
      </section>
    </div>
  )
}

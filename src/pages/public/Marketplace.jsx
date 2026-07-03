import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'

function AnimatedSection({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useIntersectionObserver()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}
      style={{ transitionDelay: `${delay}ms`, transitionTimingFunction: 'var(--ease-out-expo)' }}
    >
      {children}
    </div>
  )
}

function BusinessCard({ business, index }) {
  const [ref, isVisible] = useIntersectionObserver()

  return (
    <Link
      to={`/barberia/${business.slug}`}
      ref={ref}
      className={`group relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{
        transitionDelay: `${index * 100}ms`,
        transitionTimingFunction: 'var(--ease-out-expo)',
      }}
    >
      {/* Double-bezel card */}
      <div className="relative rounded-2xl bg-white/5 p-[1px] transition-all duration-500 group-hover:shadow-[0_0_40px_-12px_rgba(233,69,96,0.3)]">
        <div className="relative rounded-[calc(1rem-1px)] bg-white p-6 transition-all duration-500 group-hover:translate-y-[-2px]">
          {/* Logo with ring */}
          <div className="relative mb-5 flex items-start justify-between">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-black/5 transition-all duration-500 group-hover:ring-2 group-hover:ring-[var(--color-accent)]/20">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="text-xl font-bold text-gray-400">{business.name.charAt(0)}</span>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              business.status === 'active'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${business.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {business.status === 'active' ? 'Abierto' : 'Próximamente'}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">
            {business.name}
          </h3>

          {/* Address */}
          {business.address && (
            <a
              href={business.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-start gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {business.address}
            </a>
          )}

          {/* Phone / WhatsApp */}
          {business.phone && (
            <a
              href={`https://wa.me/${business.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-start gap-2 text-sm text-[var(--color-text-secondary)] hover:text-green-500 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {business.phone}
            </a>
          )}

          {/* Description */}
          {business.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {business.description}
            </p>
          )}

          {/* CTA */}
          <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
            <span className="text-sm font-semibold text-[var(--color-accent)] transition-all duration-300 group-hover:translate-x-1">
              Reservar turno
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-sm transition-all duration-300 group-hover:bg-[var(--color-accent)] group-hover:text-white group-hover:translate-x-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function extractCity(address) {
  if (!address) return null
  const parts = address.split(',').map(p => p.trim())
  const last = parts[parts.length - 1]
  return last
    .replace(/^(CP|Código Postal|Zona|Barrio)\s+/i, '')
    .trim()
    || null
}

export default function Marketplace() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [cityFilter, setCityFilter] = useState('')
  const [availableCities, setAvailableCities] = useState([])

  useEffect(() => {
    loadBusinesses()
    setTimeout(() => setHeroLoaded(true), 100)
  }, [])

  async function loadBusinesses() {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .in('status', ['active', 'pending'])
        .order('name')

      if (error) throw error
      const cities = [...new Set((data || []).map(b => extractCity(b.address)).filter(Boolean))]
      setAvailableCities(cities.sort())
      setTimeout(() => {
        setBusinesses(data || [])
        setLoading(false)
      }, 300)
    } catch (err) {
      console.error('Error:', err)
      setBusinesses([])
      setLoading(false)
    }
  }

  const filtered = businesses.filter((b) => {
    const matchesSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address?.toLowerCase().includes(search.toLowerCase())
    const matchesCity = !cityFilter ||
      extractCity(b.address) === cityFilter
    return matchesSearch && matchesCity
  })

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90dvh] overflow-hidden bg-[var(--color-primary)]">
        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[var(--color-accent)]/20 to-transparent blur-3xl" style={{ willChange: 'transform' }} />
          <div className="absolute -right-40 -top-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-[var(--color-accent-secondary)]/15 to-transparent blur-3xl" style={{ willChange: 'transform' }} />
          <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 bg-gradient-to-t from-white/[0.03] to-transparent" />
        </div>

        {/* Floating Nav */}
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <nav className={`transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="glass-dark flex items-center gap-6 rounded-2xl px-5 py-2.5">
              <span className="text-sm font-bold text-white tracking-tight">BarberShifts</span>
              <div className="hidden items-center gap-4 text-sm text-white/60 sm:flex">
                <a href="#barberias" className="transition-colors hover:text-white">Barberías</a>
                <a href="#como-funciona" className="transition-colors hover:text-white">Cómo funciona</a>
              </div>
              <Link
                to="/admin"
                className="ml-2 rounded-xl bg-white/10 px-4 py-1.5 text-sm text-white transition-all hover:bg-white/20 active:scale-[0.97]"
              >
                Admin
              </Link>
            </div>
          </nav>
        </div>

        {/* Hero content */}
        <div className="relative mx-auto flex min-h-[90dvh] max-w-6xl flex-col items-center justify-center px-6 text-center">
          <div className={`max-w-3xl transition-all duration-1000 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            {/* Eyebrow */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Plataforma de reservas
            </div>

            {/* Main heading */}
            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Encuentra tu{' '}
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                barbería ideal
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/50">
              Reservá tu turno en las mejores barberías y peluquerías en segundos. Sin esperas, sin filas, sin complicaciones.
            </p>

            {/* Search */}
            <div className="mx-auto mt-10 max-w-md">
              <div className="group relative">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[var(--color-accent)]/20 to-[var(--color-accent-secondary)]/20 opacity-0 blur-xl transition-opacity duration-500 group-focus-within:opacity-100" />
                <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 focus-within:border-white/20 focus-within:bg-white/10">
                  <svg className="pointer-events-none absolute left-4 h-5 w-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar barbería..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent py-4 pl-12 pr-4 text-base text-white placeholder:text-white/25 focus:outline-none"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="mr-2 rounded-lg p-2 text-white/30 transition-colors hover:text-white/60"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* City filter pills */}
            {availableCities.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setCityFilter('')}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                    !cityFilter
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                  }`}
                >
                  Todas
                </button>
                {availableCities.map(city => (
                  <button
                    key={city}
                    onClick={() => setCityFilter(city === cityFilter ? '' : city)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      cityFilter === city
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-10 flex flex-wrap justify-center gap-10 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{businesses.length || '—'}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">Barberías</div>
              </div>
              <div className="hidden sm:block">
                <div className="text-2xl font-bold text-white">0</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">Reservas hoy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-white/40">Sin filas</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BARBERÍAS GRID ===== */}
      <section id="barberias" className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)] shadow-sm">
              Barberías disponibles
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-[var(--color-text)] sm:text-4xl">
              {search
                ? `Resultados para "${search}"`
                : 'Encontrá tu estilo'
              }
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[var(--color-text-secondary)]">
              {search || cityFilter
                ? `${filtered.length} barbería${filtered.length !== 1 ? 's' : ''} encontrada${filtered.length !== 1 ? 's' : ''}`
                : 'Seleccioná tu barbería favorita y reservá al instante'
              }
              {cityFilter && (
                <span className="text-xs ml-2">
                  en {cityFilter}
                </span>
              )}
            </p>
          </div>
        </AnimatedSection>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
              {search ? 'No encontramos barberías con ese nombre' : 'No hay barberías disponibles'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-3 text-sm font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent)]/80"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((business, i) => (
              <BusinessCard key={business.id} business={business} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section id="como-funciona" className="border-t border-black/5 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection>
            <div className="mb-16 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[var(--color-bg)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-secondary)]">
                Cómo funciona
              </span>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-[var(--color-text)] sm:text-4xl">
                Reservá en tres pasos
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: '01', title: 'Elegí tu barbería', desc: 'Explorá las mejores barberías, mirá sus servicios, precios y horarios.', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              { step: '02', title: 'Seleccioná tu turno', desc: 'Elegí servicio, barbero, fecha y horario. Sin registro, sin vueltas.', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { step: '03', title: 'Recibí tu servicio', desc: 'Llegá a la barbería a la hora reservada. Tu turno te espera.', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 150}>
                <div className="group rounded-2xl border border-black/5 bg-[var(--color-bg)] p-8 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white transition-all duration-500 group-hover:scale-105">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </div>
                  <div className="mt-6 font-mono text-[11px] font-medium tracking-widest text-[var(--color-text-secondary)]">
                    {item.step}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-[var(--color-text)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-black/5 bg-white py-8">
        <div className="mx-auto flex flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p className="text-sm font-semibold text-[var(--color-text)]">BarberShifts</p>
          <p className="text-sm text-[var(--color-text-secondary)]">© 2026 Todos los derechos reservados.</p>
          <Link to="/admin" className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]">
            Administración
          </Link>
        </div>
      </footer>
    </div>
  )
}

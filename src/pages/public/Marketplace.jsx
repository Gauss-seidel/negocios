import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

function AnimatedSection({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useIntersectionObserver()
  const reduce = usePrefersReducedMotion()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: reduce ? 1 : (isVisible ? 1 : 0),
        transform: reduce ? 'none' : (isVisible ? 'translateY(0)' : 'translateY(14px)'),
        transitionProperty: reduce ? 'none' : 'opacity, transform',
        transitionDuration: reduce ? '0ms' : '600ms',
        transitionDelay: reduce ? '0ms' : `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {children}
    </div>
  )
}

function BusinessCard({ business, index }) {
  const [ref, isVisible] = useIntersectionObserver()
  const reduce = usePrefersReducedMotion()
  return (
    <Link
      to={`/barberia/${business.slug}`}
      ref={ref}
      className="group block focus:outline-none"
      style={{
        opacity: reduce ? 1 : (isVisible ? 1 : 0),
        transform: reduce ? 'none' : (isVisible ? 'translateY(0)' : 'translateY(14px)'),
        transitionProperty: reduce ? 'none' : 'opacity, transform',
        transitionDuration: reduce ? '0ms' : '550ms',
        transitionDelay: reduce ? '0ms' : `${Math.min(index * 55, 320)}ms`,
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <article
        className="h-full rounded-[20px] border p-5 transition-[transform,box-shadow,border-color] duration-300 ease-out group-hover:-translate-y-1 group-focus-visible:-translate-y-1"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 1px 0 rgba(255,253,250,.7) inset, 0 12px 28px -22px rgba(31,26,23,.35)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1"
            style={{ backgroundColor: 'var(--color-paper-2)', color: 'var(--color-accent)', ringColor: 'var(--color-border)' }}
          >
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : undefined} decoding="async" />
            ) : (
              <span className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif' }}>{business.name.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[1.05rem] font-bold tracking-[-0.01em]" style={{ color: 'var(--color-text)' }}>{business.name}</h3>
            <span
              className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${business.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}
              style={{ boxShadow: `inset 0 0 0 1px ${business.status === 'active' ? 'rgba(4,120,87,.14)' : 'rgba(146,64,14,.14)'}` }}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${business.status === 'active' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
              {business.status === 'active' ? 'Abierto' : 'Próximamente'}
            </span>
          </div>
        </div>

        {business.address && (
          <a
            href={business.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-start gap-2 text-sm leading-snug transition-colors duration-200 hover:underline underline-offset-2"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg aria-hidden="true" focusable="false" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>{business.address}</span>
          </a>
        )}
        {business.phone && (
          <a
            href={`https://wa.me/${business.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 flex items-center gap-2 text-sm transition-colors duration-200 hover:underline underline-offset-2"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0" style={{ color: 'var(--color-muted)' }} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            <span>{business.phone}</span>
          </a>
        )}
        {business.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{business.description}</p>
        )}

        <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>Reservar turno</span>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full transition-[transform,background-color,color] duration-300 ease-out group-hover:translate-x-0.5"
            style={{ backgroundColor: 'var(--color-paper-2)', color: 'var(--color-text)' }}
            aria-hidden="true"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </span>
        </div>
      </article>
    </Link>
  )
}

function extractCity(address) {
  if (!address) return null
  const parts = address.split(',').map(p => p.trim())
  const last = parts[parts.length - 1]
  return last.replace(/^(CP|Código Postal|Zona|Barrio)\s+/i, '').trim() || null
}

function CityChip({ active, onClick, children, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 active:scale-[0.98]"
      style={active
        ? {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-accent-ink)',
            boxShadow: '0 8px 18px -12px rgba(139,74,43,.55), inset 0 1px 0 rgba(255,250,248,.18)',
            border: '1px solid transparent',
          }
        : {
            backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, var(--color-paper-2))',
            color: 'var(--color-text-secondary)',
            boxShadow: 'inset 0 0 0 1px var(--color-border)',
            border: '1px solid transparent',
          }}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

export default function Marketplace() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [availableCities, setAvailableCities] = useState([])
  const searchRef = useRef(null)

  const loadBusinesses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .in('status', ['active', 'pending'])
        .order('name')
      if (error) throw error
      const cities = [...new Set((data || []).map(b => extractCity(b.address)).filter(Boolean))]
      setAvailableCities(cities.sort())
      setBusinesses(data || [])
    } catch (err) {
      console.error('Error:', err)
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBusinesses() }, [loadBusinesses])

  const filtered = businesses.filter((b) => {
    const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.address?.toLowerCase().includes(search.toLowerCase())
    const matchesCity = !cityFilter || extractCity(b.address) === cityFilter
    return matchesSearch && matchesCity
  })

  return (
    <div style={{ color: 'var(--color-text)' }}>
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-paper-2) 55%, var(--color-bg)) 0%, var(--color-bg) 100%)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
            <div>
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} />
                  Reservas simples, sin filas
                </div>
                <h1 className="mt-4 text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[3.35rem]" style={{ color: 'var(--color-text)', textWrap: 'balance' }}>
                  Encontrá tu barbería
                  <span className="block" style={{ color: 'var(--color-accent)' }}>y reservá en segundos.</span>
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                  Compará opciones cerca tuyo, elegí servicio y horario, y confirmá sin llamadas.
                </p>
              </AnimatedSection>

              <AnimatedSection delay={80}>
                <div
                  className="mt-8 rounded-[22px] border p-4 sm:p-5"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: '0 1px 0 rgba(255,253,250,.75) inset, 0 18px 44px -34px rgba(31,26,23,.38)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Buscar barbería</div>
                    {(search || cityFilter) && (
                      <button
                        type="button"
                        onClick={() => { setSearch(''); setCityFilter(''); searchRef.current?.focus() }}
                        className="text-xs font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 rounded"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>

                  <label htmlFor="market-search" className="sr-only">Buscar por nombre o dirección</label>
                  <div
                    className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-[box-shadow,border-color] duration-200"
                    style={{
                      backgroundColor: 'var(--color-paper)',
                      boxShadow: 'inset 0 0 0 1px var(--color-border)',
                    }}
                  >
                    <svg aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0" style={{ color: 'var(--color-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                      ref={searchRef}
                      id="market-search"
                      type="text"
                      placeholder="Nombre, zona o dirección"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-transparent text-[15px] placeholder:opacity-80 focus:outline-none"
                      style={{ color: 'var(--color-text)' }}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => { setSearch(''); searchRef.current?.focus() }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[var(--color-paper-2)] focus:outline-none focus-visible:ring-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                        aria-label="Borrar búsqueda"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>

                  {availableCities.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--color-muted)' }}>
                        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        Ciudad
                      </div>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por ciudad">
                        <CityChip active={!cityFilter} onClick={() => setCityFilter('')}>Todas</CityChip>
                        {availableCities.map(city => (
                          <CityChip key={city} active={cityFilter === city} onClick={() => setCityFilter(city === cityFilter ? '' : city)}>
                            {city}
                          </CityChip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            </div>

            <AnimatedSection delay={120} className="lg:pt-6">
              <aside
                className="rounded-[22px] border p-6"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-surface) 88%, var(--color-paper-2))',
                  borderColor: 'var(--color-border)',
                  boxShadow: '0 1px 0 rgba(255,253,250,.6) inset',
                }}
              >
                <h2 className="text-lg font-bold tracking-[-0.01em]" style={{ color: 'var(--color-text)' }}>Cómo funciona</h2>
                <ol className="mt-4 space-y-3.5">
                  {[
                    ['Elegí', 'una barbería y el servicio que querés.'],
                    ['Seleccioná', 'barbero, fecha y horario disponible.'],
                    ['Confirmá', 'y llegá a tu hora, sin esperar.'],
                  ].map(([a, b], i) => (
                    <li key={a} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ backgroundColor: 'var(--color-paper-2)', color: 'var(--color-accent)' }}>{i + 1}</span>
                      <span><strong style={{ color: 'var(--color-text)' }}>{a}</strong> {b}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--color-paper)' }}>
                    <div className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--color-text)' }}>{businesses.length || 0}</div>
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--color-muted)' }}>Barberías</div>
                  </div>
                  <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--color-paper)' }}>
                    <div className="text-xl font-extrabold" style={{ color: 'var(--color-text)' }}>24/7</div>
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--color-muted)' }}>Reservas online</div>
                  </div>
                </div>
              </aside>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section id="barberias" className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <AnimatedSection>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.02em]" style={{ color: 'var(--color-text)' }}>
                {search ? `Resultados para “${search}”` : 'Barberías disponibles'}
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {search || cityFilter
                  ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}${cityFilter ? ` en ${cityFilter}` : ''}`
                  : 'Elegí tu barbería y reservá al instante.'}
              </p>
            </div>
          </div>
        </AnimatedSection>

        {loading ? (
          <div className="flex justify-center py-20" aria-label="Cargando barberías">
            <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-border)' }}>
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-2 w-2 animate-pulse-soft rounded-full" style={{ backgroundColor: 'var(--color-accent)', animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[22px] border px-6 py-16 text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-paper-2)', color: 'var(--color-muted)' }}>
              <svg aria-hidden="true" focusable="false" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {search || cityFilter ? 'No encontramos barberías con esos filtros' : 'No hay barberías disponibles'}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {search || cityFilter ? 'Probá con otra ciudad o borrá la búsqueda.' : 'Volvé a intentar en unos minutos.'}
            </p>
            {(search || cityFilter) && (
              <button type="button" onClick={() => { setSearch(''); setCityFilter('') }} className="mt-4 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-150" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((business, i) => (
              <BusinessCard key={business.id} business={business} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-5xl px-4 py-14 lg:px-6">
          <AnimatedSection>
            <h2 className="text-center text-2xl font-bold tracking-[-0.02em] sm:text-3xl" style={{ color: 'var(--color-text)' }}>Listo en tres pasos</h2>
          </AnimatedSection>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { t: 'Elegí tu barbería', d: 'Explorá servicios, precios y horarios reales.' },
              { t: 'Reservá tu turno', d: 'Seleccioná barbero, fecha y hora en minutos.' },
              { t: 'Llegá sin esperar', d: 'Tu turno queda confirmado al instante.' },
            ].map((item, i) => (
              <AnimatedSection key={item.t} delay={i * 90}>
                <div className="h-full rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border)', boxShadow: '0 1px 0 rgba(255,253,250,.7) inset' }}>
                  <div className="text-[11px] font-extrabold" style={{ color: 'var(--color-accent)' }}>0{i + 1}</div>
                  <h3 className="mt-1.5 text-base font-bold" style={{ color: 'var(--color-text)' }}>{item.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item.d}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver'

function AnimatedSection({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useIntersectionObserver()
  return (
    <div
      ref={ref}
      className={`transition duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
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
      className={`group block transition duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 80}ms`, transitionTimingFunction: 'var(--ease-out-expo)' }}
    >
      <article className="h-full rounded-2xl border p-5 transition duration-300 hover:-translate-y-1" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 10px 30px -22px rgba(31,26,23,.28)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--color-paper-2)', color: 'var(--color-accent-warm)' }}>
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : undefined} decoding="async" />
              ) : (
                <span className="text-lg font-bold">{business.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold" style={{ color: 'var(--color-text)' }}>{business.name}</h3>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={business.status === 'active' ? { backgroundColor: '#edf5ef', color: '#2f6b4f' } : { backgroundColor: '#fff4e8', color: '#8a5a14' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: business.status === 'active' ? '#2f6b4f' : '#8a5a14' }} />
                {business.status === 'active' ? 'Abierto' : 'Próximamente'}
              </span>
            </div>
          </div>
        </div>

        {business.address && (
          <a
            href={business.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-start gap-2 text-sm hover:underline underline-offset-2"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg aria-hidden="true" focusable="false" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>{business.address}</span>
          </a>
        )}
        {business.phone && (
          <a
            href={`https://wa.me/${business.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 flex items-center gap-2 text-sm hover:underline underline-offset-2"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            <span>{business.phone}</span>
          </a>
        )}
        {business.description && (
          <p className="mt-3 line-clamp-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{business.description}</p>
        )}

        <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--color-accent-warm)' }}>Reservar turno</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full transition duration-300 group-hover:translate-x-0.5" style={{ backgroundColor: 'var(--color-paper-2)', color: 'var(--color-text)' }} aria-hidden="true">
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

export default function Marketplace() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [availableCities, setAvailableCities] = useState([])

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
    <div>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent-warm)' }}>Reservas sin filas</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: 'var(--color-text)', textWrap: 'balance' }}>
              Encontrá tu barbería y reservá en segundos
            </h1>
            <p className="mt-4 max-w-2xl text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              Compará barberías, elegí servicio y horario, y confirmá tu turno sin llamadas ni esperas.
            </p>

            <div className="mt-8 rounded-2xl border p-3" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: '0 10px 30px -24px rgba(31,26,23,.25)' }}>
              <label htmlFor="market-search" className="sr-only">Buscar barbería</label>
              <div className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-paper)' }}>
                <svg aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0" style={{ color: 'var(--color-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  id="market-search"
                  type="text"
                  placeholder="Buscar por nombre o dirección…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-base focus:outline-none"
                  style={{ color: 'var(--color-text)' }}
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="rounded-lg px-2 py-1 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }} aria-label="Limpiar búsqueda">Limpiar</button>
                )}
              </div>
              {availableCities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setCityFilter('')} className="rounded-full px-3 py-1.5 text-sm font-semibold border transition" style={!cityFilter ? { backgroundColor: 'var(--color-accent-warm)', color: 'var(--color-accent-ink)', borderColor: 'var(--color-accent-warm)' } : { backgroundColor: 'var(--color-paper)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>Todas</button>
                  {availableCities.map(city => (
                    <button key={city} type="button" onClick={() => setCityFilter(city === cityFilter ? '' : city)} className="rounded-full px-3 py-1.5 text-sm font-semibold border transition" style={cityFilter === city ? { backgroundColor: 'var(--color-accent-warm)', color: 'var(--color-accent-ink)', borderColor: 'var(--color-accent-warm)' } : { backgroundColor: 'var(--color-paper)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>{city}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Reservar es simple</h2>
            <ol className="mt-4 space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <li><strong style={{ color: 'var(--color-text)' }}>1. Elegí</strong> una barbería y servicio.</li>
              <li><strong style={{ color: 'var(--color-text)' }}>2. Seleccioná</strong> barbero, fecha y hora.</li>
              <li><strong style={{ color: 'var(--color-text)' }}>3. Confirmá</strong> y llegá sin esperar.</li>
            </ol>
            <div className="mt-5 flex gap-6 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <div><div className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>{businesses.length || '—'}</div><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Barberías</div></div>
              <div><div className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>24/7</div><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Reservas online</div></div>
            </div>
          </aside>
        </div>
      </section>

      <section id="barberias" className="mx-auto max-w-7xl px-4 pb-16 lg:px-6">
        <AnimatedSection>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
                {search ? `Resultados para “${search}”` : 'Barberías disponibles'}
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {search || cityFilter ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}${cityFilter ? ` en ${cityFilter}` : ''}` : 'Elegí tu barbería y reservá al instante.'}
              </p>
            </div>
          </div>
        </AnimatedSection>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex gap-1.5" aria-label="Cargando">
              <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full" style={{ backgroundColor: 'var(--color-accent-warm)', animationDelay: '0ms' }} />
              <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full" style={{ backgroundColor: 'var(--color-accent-warm)', animationDelay: '150ms' }} />
              <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full" style={{ backgroundColor: 'var(--color-accent-warm)', animationDelay: '300ms' }} />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border py-16 text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {search ? 'No encontramos barberías con ese nombre' : 'No hay barberías disponibles'}
            </p>
            {search && (
              <button type="button" onClick={() => setSearch('')} className="mt-3 text-sm font-bold underline-offset-2 hover:underline" style={{ color: 'var(--color-accent-warm)' }}>
                Limpiar búsqueda
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

      <section id="como-funciona" className="border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
          <AnimatedSection>
            <h2 className="text-center text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Reservá en tres pasos</h2>
          </AnimatedSection>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[{ n: '01', t: 'Elegí tu barbería', d: 'Explorá servicios, precios y horarios.' }, { n: '02', t: 'Seleccioná tu turno', d: 'Servicio, barbero, fecha y hora en minutos.' }, { n: '03', t: 'Confirmá y listo', d: 'Llegá a la hora reservada, sin filas.' }].map((item, i) => (
              <AnimatedSection key={item.n} delay={i * 120}>
                <div className="h-full rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-paper)', borderColor: 'var(--color-border)' }}>
                  <div className="text-sm font-extrabold tracking-wider" style={{ color: 'var(--color-accent-warm)' }}>{item.n}</div>
                  <h3 className="mt-2 text-lg font-bold" style={{ color: 'var(--color-text)' }}>{item.t}</h3>
                  <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{item.d}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

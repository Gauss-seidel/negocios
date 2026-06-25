import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTemplateConfig, getAnimationStyle } from '../../templates/registry'
import { DAYS_OF_WEEK } from '../../lib/constants'

function useIntersectionObserver(options = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.unobserve(element)
      }
    }, { threshold: 0.1, ...options })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

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

function BarberiaHero({ business, templateConfig }) {
  const { colors } = templateConfig
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setTimeout(() => setLoaded(true), 100) }, [])

  // Determinar clase de animación basada en el template
  const getAnimationClass = () => {
    const templateId = business.template_id || 'classic'
    return `animate-${templateId}-hero`
  }

  const animationClass = getAnimationClass()

  return (
    <section
      className="relative overflow-hidden py-16 lg:py-28"
      style={{ backgroundColor: colors.primary }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-32 -top-32 h-[400px] w-[400px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${colors.accent}20, transparent)` }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${colors.secondary}30, transparent)` }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4">
        <div className={`flex flex-col items-center text-center ${animationClass}`}>
          {/* Logo con anillo */}
          <div className="relative">
            <div
              className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl shadow-2xl ring-2 ring-white/10 lg:h-36 lg:w-36"
              style={{ backgroundColor: colors.secondary }}
            >
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl font-bold lg:text-6xl" style={{ color: colors.accent }}>
                  {business.name.charAt(0)}
                </span>
              )}
            </div>
            <div
              className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white shadow-lg"
              style={{ backgroundColor: colors.accent }}
            >
              {business.name.charAt(1) || business.name.charAt(0)}
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
            {business.name}
          </h1>

          {business.description && (
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-white/60">
              {business.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-5 text-sm">
            {business.address && (
              <a
                href={business.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/50 backdrop-blur-sm transition-colors hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {business.address}
              </a>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/50 backdrop-blur-sm transition-colors hover:text-white">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {business.phone}
              </a>
            )}
          </div>

          <Link
            to={`/barberia/${business.slug}/reservar`}
            className="group mt-8 inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: colors.accent }}
          >
            Reservar turno
            <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

function BarberiaServices({ services, colors, templateId = 'classic' }) {
  if (!services?.length) return null

  const getCardAnimationClass = (index) => {
    return `animate-${templateId}-card`
  }

  return (
    <AnimatedSection>
      <section className="mx-auto max-w-5xl px-4 py-16 lg:py-20">
        <div className="mb-10 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em]"
            style={{ backgroundColor: `${colors.primary}08`, color: colors.textSecondary }}
          >
            Nuestros servicios
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight" style={{ color: colors.accent }}>
            Servicios
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
           {services.map((service, i) => (
            <div
              key={service.id}
              className={`group relative rounded-2xl border bg-white/50 p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl ${getCardAnimationClass(i)}`}
              style={{
                borderColor: `${colors.primary}12`,
                animationDelay: `${i * 60}ms`,
              }}
            >
              {/* Price badge */}
              <div
                className="absolute right-4 top-4 rounded-xl px-3 py-1 text-sm font-bold text-white"
                style={{ backgroundColor: colors.accent }}
              >
                ₲{service.price}
              </div>

              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={{ backgroundColor: colors.primary }}
              >
                {service.name.charAt(0)}
              </div>

              <h3 className="text-lg font-bold" style={{ color: colors.text }}>
                {service.name}
              </h3>
              {service.description && (
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                  {service.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-3 text-sm" style={{ color: colors.textSecondary }}>
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {service.duration} min
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AnimatedSection>
  )
}

function BarberiaHours({ hours, colors }) {
  if (!hours?.length) return null

  const today = new Date().getDay()
  const todayIndex = today === 0 ? 6 : today - 1

  return (
    <AnimatedSection delay={100}>
      <section className="border-t py-16 lg:py-20" style={{ borderColor: `${colors.primary}08` }}>
        <div className="mx-auto max-w-lg px-4">
          <div className="mb-10 text-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em]"
              style={{ backgroundColor: `${colors.primary}08`, color: colors.textSecondary }}
            >
              Horarios
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight" style={{ color: colors.accent }}>
              Horarios de atención
            </h2>
          </div>

          <div className="space-y-1.5 rounded-2xl border p-2" style={{ borderColor: `${colors.accent}10`, backgroundColor: `${colors.primary}03` }}>
            {DAYS_OF_WEEK.map((day) => {
              const hour = hours.find((h) => h.day_of_week === day.value)
              const isToday = day.value === todayIndex
              return (
                <div
                  key={day.value}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-300 ${
                    isToday ? 'font-semibold shadow-sm' : ''
                  }`}
                  style={{
                    backgroundColor: isToday ? `${colors.accent}10` : 'transparent',
                    borderLeft: isToday ? `3px solid ${colors.accent}` : '3px solid transparent',
                  }}
                >
                  <span className="flex items-center gap-2 text-sm" style={{ color: colors.accent }}>
                    {isToday && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.accent }} />}
                    {day.label}
                  </span>
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    {hour && !hour.is_closed
                      ? `${hour.open_time.slice(0, 5)} – ${hour.close_time.slice(0, 5)}`
                      : 'Cerrado'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </AnimatedSection>
  )
}

function BarberiaProducts({ products, colors }) {
  if (!products?.length) return null

  return (
    <AnimatedSection delay={50}>
      <section className="border-t py-16 lg:py-20" style={{ borderColor: `${colors.primary}08` }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10 text-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em]"
              style={{ backgroundColor: `${colors.primary}08`, color: colors.textSecondary }}
            >
              Productos
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight" style={{ color: colors.accent }}>
              Nuestros productos
            </h2>
            <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
              Llévate el cuidado profesional a casa
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="group relative rounded-2xl border bg-white/50 p-0 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                style={{ borderColor: `${colors.primary}12` }}
              >
                {/* Image */}
                <div
                  className="h-44 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: `${colors.primary}06` }}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5rem;font-weight:bold;color:${colors.accent}66">${product.name.charAt(0)}</div>`
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full" style={{ color: `${colors.accent}66` }}>
                      <span className="text-4xl font-bold">{product.name.charAt(0)}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-lg font-bold" style={{ color: colors.text }}>
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                      {product.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm" style={{ color: colors.textSecondary }}>
                      Stock: {product.current_stock} {product.unit}
                    </span>
                    <span className="text-xl font-bold" style={{ color: colors.accent }}>
                      ₲ {product.price}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AnimatedSection>
  )
}

export default function BarberiaPage() {
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [hours, setHours] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBarberia()
  }, [slug])

  async function loadBarberia() {
    setLoading(true)
    setError(null)
    try {
      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .in('status', ['active', 'pending'])
        .single()
      if (bizErr) throw bizErr
      if (!biz) throw new Error('Barbería no encontrada')
      setBusiness(biz)

      const { data: svc } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', biz.id)
        .eq('is_active', true)
        .order('name')
      setServices(svc || [])

      const { data: hrs } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', biz.id)
        .order('day_of_week')
      setHours(hrs || [])

      const { data: prods } = await supabase
        .from('inventory_products')
        .select('*')
        .eq('business_id', biz.id)
        .eq('is_product', true)
        .eq('is_active', true)
        .gt('current_stock', 0)
        .order('name')
      setProducts(prods || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold" style={{ color: 'var(--color-text)' }}>Barbería no encontrada</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{error || 'La barbería que buscas no existe o no está disponible.'}</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent)]/80">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const templateConfig = getTemplateConfig(business.template_id, business.template_colors)
  const { colors } = templateConfig

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background, color: colors.text }}>
      <style>{`
        :root {
          --barber-primary: ${colors.primary};
          --barber-secondary: ${colors.secondary};
          --barber-accent: ${colors.accent};
          --barber-bg: ${colors.background};
          --barber-text: ${colors.text};
          --barber-text-secondary: ${colors.textSecondary};
        }
      `}</style>

      {/* Navbar minimal */}
      <nav
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: `${colors.primary}08`, backgroundColor: `${colors.background}D9` }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="group flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: colors.textSecondary }}>
            <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Todas las barberías
          </Link>
          <span className="text-sm font-semibold" style={{ color: colors.text }}>
            {business.name}
          </span>
        </div>
      </nav>

      <BarberiaHero business={business} templateConfig={templateConfig} />
      <BarberiaServices services={services} colors={colors} templateId={business.template_id} />
      <BarberiaProducts products={products} colors={colors} />
      <BarberiaHours hours={hours} colors={colors} />

      {/* CTA Final */}
      <section className="py-16 text-center" style={{ backgroundColor: `${colors.primary}04` }}>
        <AnimatedSection>
          <div className="mx-auto max-w-lg px-4">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.accent }}>
              ¿Listo para tu próximo corte?
            </h2>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              Reserva tu turno en segundos y sin complicaciones.
            </p>
            <Link
              to={`/barberia/${business.slug}/reservar`}
              className="group mt-6 inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: colors.accent }}
            >
              Reservar ahora
              <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </AnimatedSection>
      </section>
    </div>
  )
}

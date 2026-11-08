import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTemplateConfig } from '../../templates/registry'
import { DAYS_OF_WEEK } from '../../lib/constants'
import { fmtCurrency } from '../../utils/format'
import { openStatus, todayIndex } from '../../utils/hours'
import { useTemplateFont, templateStyleVars } from '../../templates/useTemplateTheme'

/* ─── Small building blocks ───────────────────────────────── */

function Heading({ as: Tag = 'h2', className = '', children }) {
  return (
    <Tag className={`font-semibold text-[var(--t-text)] ${className}`} style={{ fontFamily: 'var(--t-font-h)' }}>
      {children}
    </Tag>
  )
}

function SectionTitle({ children, aside }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <Heading className="text-[clamp(1.625rem,1.2rem+1.6vw,2.25rem)] leading-tight">{children}</Heading>
      {aside}
    </div>
  )
}

function Logo({ business, shape, size = 'lg' }) {
  const dims = {
    oval: size === 'lg' ? 'h-32 w-24 sm:h-40 sm:w-30 rounded-[999px]' : 'h-14 w-11 rounded-[999px]',
    square: size === 'lg' ? 'h-24 w-24 sm:h-28 sm:w-28 rounded-[var(--t-radius)]' : 'h-12 w-12 rounded-[var(--t-radius)]',
    round: size === 'lg' ? 'h-24 w-24 sm:h-28 sm:w-28 rounded-full' : 'h-12 w-12 rounded-full',
  }[shape] || ''
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-[var(--t-accent)]/60 ${dims}`}
      style={{ backgroundColor: 'var(--t-secondary)', color: 'var(--t-accent)' }}
    >
      {business.logo_url ? (
        <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" />
      ) : (
        <span className={size === 'lg' ? 'text-5xl' : 'text-xl'} style={{ fontFamily: 'var(--t-font-h)' }}>
          {business.name.charAt(0)}
        </span>
      )}
    </div>
  )
}

function CtaButton({ to, children, variant = 'accent', size = 'lg', className = '' }) {
  const styles = {
    accent: { backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' },
    primary: { backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' },
    outline: { boxShadow: 'inset 0 0 0 1.5px currentColor' },
  }
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--t-radius-btn)] font-semibold transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] ${
        size === 'lg' ? 'h-13 px-7 text-base' : 'h-11 px-5 text-sm'
      } ${className}`}
      style={styles[variant]}
    >
      {children}
    </Link>
  )
}

function StatusLine({ status, address, tone = 'text' }) {
  const color = tone === 'onPrimary' ? 'var(--t-on-primary)' : 'var(--t-muted)'
  if (!status.label && !address) return null
  return (
    <div className="flex flex-wrap items-center justify-[inherit] gap-x-5 gap-y-2 text-sm" style={{ color }}>
      {status.label && (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: status.state === 'open' ? '#22a06b' : status.state === 'later' ? 'var(--t-accent)' : 'currentColor', opacity: status.state === 'closed' ? 0.5 : 1 }}
            aria-hidden="true"
          />
          {status.label}
        </span>
      )}
      {address && <span className="opacity-90">{address}</span>}
    </div>
  )
}

/* ─── Hero variants ───────────────────────────────────────── */

function Hero({ business, shape, bookHref, status }) {
  const desc = business.description
  const cta = <CtaButton to={bookHref}>Reservar turno</CtaButton>

  if (shape.hero === 'split') {
    return (
      <section className="mx-auto grid max-w-[var(--t-width)] gap-8 px-[var(--gutter)] pt-8 pb-12 sm:pt-12 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14 lg:pt-16 lg:pb-20">
        <div className="order-2 lg:order-1">
          <Heading as="h1" className="text-[clamp(2.5rem,1.6rem+4vw,4.5rem)] leading-[1.02] tracking-[-0.02em]">{business.name}</Heading>
          {desc && <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--t-muted)]">{desc}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            {cta}
            <StatusLine status={status} />
          </div>
        </div>
        <div
          className="order-1 flex aspect-[16/10] items-center justify-center rounded-[var(--t-radius-lg)] lg:order-2 lg:aspect-[4/3.4]"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          <Logo business={business} shape={shape.logo} />
        </div>
      </section>
    )
  }

  if (shape.hero === 'fullbleed') {
    return (
      <section className="relative overflow-hidden border-b border-[var(--t-border)]">
        <div className="mx-auto max-w-[var(--t-width)] px-[var(--gutter)] pt-12 pb-14 sm:pt-16 lg:pt-24 lg:pb-24">
          <Logo business={business} shape={shape.logo} size="sm" />
          <Heading as="h1" className="mt-8 text-[clamp(3rem,1.5rem+7vw,7rem)] leading-[0.95] tracking-[-0.03em] uppercase">
            {business.name}
          </Heading>
          <div className="mt-6 h-[3px] w-16" style={{ backgroundColor: 'var(--t-accent)' }} aria-hidden="true" />
          {desc && <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--t-muted)]">{desc}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            {cta}
            <StatusLine status={status} address={business.address} />
          </div>
        </div>
      </section>
    )
  }

  if (shape.hero === 'editorial') {
    return (
      <section className="mx-auto max-w-[var(--t-width)] px-[var(--gutter)] pt-14 pb-14 text-center sm:pt-20 lg:pt-28 lg:pb-20">
        <div className="flex justify-center"><Logo business={business} shape={shape.logo} size="sm" /></div>
        <Heading as="h1" className="mx-auto mt-8 max-w-3xl text-[clamp(2.75rem,1.6rem+5vw,5.5rem)] leading-[1.02] tracking-[-0.015em]">
          {business.name}
        </Heading>
        <div className="mx-auto mt-8 flex max-w-xs items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--t-accent)' }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: 'var(--t-accent)' }} />
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--t-accent)' }} />
        </div>
        {desc && <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-[var(--t-muted)]">{desc}</p>}
        <div className="mt-10 flex flex-col items-center gap-5 justify-center">
          <CtaButton to={bookHref} variant="primary">Reservar turno</CtaButton>
          <StatusLine status={status} />
        </div>
      </section>
    )
  }

  if (shape.hero === 'blocks') {
    return (
      <section className="mx-auto max-w-[var(--t-width)] px-[var(--gutter)] pt-4 sm:pt-6">
        <div className="rounded-[var(--t-radius-lg)] px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-20" style={{ backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' }}>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Logo business={business} shape={shape.logo} size="sm" />
              <h1 className="mt-6 text-[clamp(2.5rem,1.5rem+4.5vw,4.75rem)] font-bold leading-[1] tracking-[-0.02em]" style={{ fontFamily: 'var(--t-font-h)' }}>
                {business.name}
              </h1>
              {desc && <p className="mt-5 max-w-xl text-lg leading-relaxed opacity-85">{desc}</p>}
            </div>
            <CtaButton to={bookHref} variant="primary" className="self-start lg:self-auto">Reservar turno</CtaButton>
          </div>
        </div>
        <div className="px-1 pt-4"><StatusLine status={status} address={business.address} /></div>
      </section>
    )
  }

  // centered (Clásica)
  return (
    <section style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' }}>
      <div className="mx-auto flex max-w-[var(--t-width)] flex-col items-center px-[var(--gutter)] py-14 text-center sm:py-20 lg:py-24">
        <Logo business={business} shape={shape.logo} />
        <h1 className="mt-8 max-w-3xl text-[clamp(2.5rem,1.6rem+4vw,4.25rem)] font-semibold leading-[1.04]" style={{ fontFamily: 'var(--t-font-h)' }}>
          {business.name}
        </h1>
        {desc && <p className="mt-4 max-w-xl text-lg leading-relaxed opacity-75">{desc}</p>}
        <div className="mt-9 flex flex-col items-center gap-5 justify-center">
          {cta}
          <StatusLine status={status} tone="onPrimary" />
        </div>
      </div>
      <div className="h-px opacity-60" style={{ background: 'linear-gradient(90deg, transparent, var(--t-accent) 20%, var(--t-accent) 80%, transparent)' }} aria-hidden="true" />
    </section>
  )
}

/* ─── Services ────────────────────────────────────────────── */

function ServicesBoard({ services, large }) {
  return (
    <ul className="divide-y divide-[var(--t-border)] border-t border-[var(--t-border)]">
      {services.map((s) => (
        <li key={s.id} className={large ? 'py-6 sm:py-7' : 'py-5'}>
          <div className="flex items-baseline gap-3">
            <span className={`font-semibold text-[var(--t-text)] ${large ? 'text-xl sm:text-2xl' : 'text-lg'}`} style={{ fontFamily: large ? 'var(--t-font-h)' : undefined }}>
              {s.name}
            </span>
            <span className="leader text-[var(--t-text)]" aria-hidden="true" />
            <span className={`shrink-0 font-semibold tabular-nums text-[var(--t-accent-text)] ${large ? 'text-xl sm:text-2xl' : 'text-lg'}`}>
              {fmtCurrency(s.price)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-[15px] text-[var(--t-muted)]">
            <span>{s.duration} min</span>
            {s.description && <span className="min-w-0 flex-1 basis-60">{s.description}</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function ServicesCards({ services, animation }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {services.map((s, i) => (
        <div
          key={s.id}
          className={`flex flex-col rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] p-5 sm:p-6 ${animation}`}
          style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
        >
          <div className="flex items-start justify-between gap-4">
            <Heading as="h3" className="text-lg leading-snug">{s.name}</Heading>
            <span className="shrink-0 text-lg font-bold tabular-nums text-[var(--t-accent-text)]">{fmtCurrency(s.price)}</span>
          </div>
          {s.description && <p className="mt-2 text-[15px] leading-relaxed text-[var(--t-muted)]">{s.description}</p>}
          <span className="mt-auto pt-4 text-sm font-medium text-[var(--t-muted)]">{s.duration} min</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Team, products, info ────────────────────────────────── */

function Team({ barbers }) {
  if (!barbers?.length) return null
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {barbers.map((b) => (
        <li key={b.id} className="flex flex-col items-start">
          <div className="aspect-square w-full max-w-40 overflow-hidden rounded-[var(--t-radius)] bg-[var(--t-surface)] ring-1 ring-[var(--t-border)]">
            {b.photo_url ? (
              <img src={b.photo_url} alt={b.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-[var(--t-accent-text)]" style={{ fontFamily: 'var(--t-font-h)' }}>
                {b.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </div>
            )}
          </div>
          <p className="mt-3 font-semibold text-[var(--t-text)]">{b.name}</p>
          {b.specialty && <p className="text-sm text-[var(--t-muted)]">{b.specialty}</p>}
        </li>
      ))}
    </ul>
  )
}

function Products({ products }) {
  const [imgErrors, setImgErrors] = useState({})
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <div key={p.id} className="overflow-hidden rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)]">
          <div className="flex aspect-square items-center justify-center bg-[var(--t-sunken)]">
            {p.image_url && !imgErrors[p.id] ? (
              <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" onError={() => setImgErrors((e) => ({ ...e, [p.id]: true }))} />
            ) : (
              <span className="text-3xl text-[var(--t-muted)]" style={{ fontFamily: 'var(--t-font-h)' }}>{p.name.charAt(0)}</span>
            )}
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-[15px] font-semibold leading-snug text-[var(--t-text)]">{p.name}</p>
            <p className="mt-1 font-semibold tabular-nums text-[var(--t-accent-text)]">{fmtCurrency(p.price)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function HoursList({ hours }) {
  const today = todayIndex()
  return (
    <ul className="divide-y divide-[var(--t-border)] border-y border-[var(--t-border)]">
      {DAYS_OF_WEEK.map((day) => {
        const h = hours.find((x) => x.day_of_week === day.value)
        const isToday = day.value === today
        const open = h && !h.is_closed
        return (
          <li key={day.value} className={`flex items-center justify-between py-3 text-[15px] ${isToday ? 'font-semibold text-[var(--t-text)]' : 'text-[var(--t-muted)]'}`}>
            <span className="flex items-center gap-2">
              {day.label}
              {isToday && <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' }}>Hoy</span>}
            </span>
            <span className="tabular-nums">{open ? `${h.open_time.slice(0, 5)} – ${h.close_time.slice(0, 5)}` : 'Cerrado'}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Locations({ business, branches, slug }) {
  const places = branches?.length ? branches : [{ id: 'main', name: business.name, address: business.address, phone: business.phone }]
  return (
    <ul className="space-y-4">
      {places.map((p) => (
        <li key={p.id} className="rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] p-5">
          <p className="font-semibold text-[var(--t-text)]">{p.name}</p>
          {p.address && (
            <a
              href={business.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent(p.address)}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-1 block text-[15px] text-[var(--t-muted)] underline-offset-4 hover:underline"
            >
              {p.address}
            </a>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {p.phone && (
              <a href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                 className="inline-flex h-10 items-center rounded-[var(--t-radius-btn)] px-4 text-sm font-semibold text-[var(--t-text)] ring-1 ring-inset ring-[var(--t-border-strong)]">
                Escribir por WhatsApp
              </a>
            )}
            {branches?.length > 1 && (
              <Link to={`/barberia/${slug}/reservar?branch=${p.slug}`}
                    className="inline-flex h-10 items-center rounded-[var(--t-radius-btn)] px-4 text-sm font-semibold"
                    style={{ backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' }}>
                Reservar aquí
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ─── Page ────────────────────────────────────────────────── */

export default function BarberiaPage() {
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [hours, setHours] = useState([])
  const [products, setProducts] = useState([])
  const [branches, setBranches] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadBarberia = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: biz, error: bizErr } = await supabase
        .from('businesses').select('*').eq('slug', slug).in('status', ['active', 'pending']).single()
      if (bizErr) throw bizErr
      if (!biz) throw new Error('Barbería no encontrada')
      setBusiness(biz)
      const [svc, hrs, prods, brn, bar] = await Promise.allSettled([
        supabase.from('services').select('*').eq('business_id', biz.id).eq('is_active', true).order('name'),
        supabase.from('business_hours').select('*').eq('business_id', biz.id).order('day_of_week'),
        supabase.from('inventory_products').select('*').eq('business_id', biz.id).eq('is_product', true).eq('is_active', true).gt('current_stock', 0).order('name'),
        supabase.from('branches').select('*').eq('business_id', biz.id).eq('is_active', true).order('name'),
        supabase.from('barbers').select('id, name, photo_url, specialty, is_active').eq('business_id', biz.id).eq('is_active', true).order('name'),
      ])
      const val = (r) => (r.status === 'fulfilled' ? r.value.data || [] : [])
      setServices(val(svc)); setHours(val(hrs)); setProducts(val(prods)); setBranches(val(brn)); setBarbers(val(bar))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
  useEffect(() => { loadBarberia() }, [loadBarberia])

  const templateConfig = business ? getTemplateConfig(business.template_id, business.template_colors) : null
  useTemplateFont(templateConfig)

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]" aria-label="Cargando barbería">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-24">
          <div className="skeleton h-28 w-28 rounded-full" />
          <div className="skeleton mt-8 h-10 w-2/3" />
          <div className="skeleton mt-4 h-5 w-1/2" />
          <div className="skeleton mt-8 h-12 w-48 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="max-w-sm text-center">
          <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)]">No encontramos esta barbería</h1>
          <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">Puede que haya cambiado de dirección o que todavía no esté publicada.</p>
          <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-accent-ink)]">
            Ver todas las barberías
          </Link>
        </div>
      </div>
    )
  }

  const shape = templateConfig.config?.shape || templateConfig.shape || { hero: 'centered', services: 'board', radius: '8px', logo: 'square', width: '64rem' }
  const templateId = business.template_id || 'classic'
  const bookHref = `/barberia/${business.slug}/reservar${branches.length === 1 ? `?branch=${branches[0].slug}` : ''}`
  const status = business.status === 'active' ? openStatus(hours) : { state: 'closed', label: 'Próximamente' }
  const largeBoard = shape.hero === 'editorial'

  return (
    <div className="min-h-screen bg-[var(--t-bg)] pb-24 text-[var(--t-text)] sm:pb-0" style={templateStyleVars(templateConfig, shape)}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--t-border)] bg-[color-mix(in_srgb,var(--t-bg)_90%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[var(--t-width)] items-center justify-between gap-4 px-[var(--gutter)] sm:h-16">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--t-muted)] hover:text-[var(--t-text)]">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Barberías
          </Link>
          <span className="truncate text-sm font-semibold sm:hidden">{business.name}</span>
          <span className="hidden sm:block"><CtaButton to={bookHref} size="sm">Reservar turno</CtaButton></span>
        </div>
      </header>

      <div className={`animate-${templateId}-hero`}>
        <Hero business={business} shape={shape} bookHref={bookHref} status={status} />
      </div>

      <main className="mx-auto max-w-[var(--t-width)] px-[var(--gutter)]">
        {services.length > 0 && (
          <section id="servicios" className="py-14 sm:py-20">
            <SectionTitle>Servicios</SectionTitle>
            {shape.services === 'cards'
              ? <ServicesCards services={services} animation={`animate-${templateId}-card`} />
              : <ServicesBoard services={services} large={largeBoard} />}
          </section>
        )}

        {barbers.length > 0 && (
          <section className="border-t border-[var(--t-border)] py-14 sm:py-20">
            <SectionTitle>El equipo</SectionTitle>
            <Team barbers={barbers} />
          </section>
        )}

        {products.length > 0 && (
          <section className="border-t border-[var(--t-border)] py-14 sm:py-20">
            <SectionTitle>Productos</SectionTitle>
            <Products products={products} />
          </section>
        )}

        <section className="grid gap-12 border-t border-[var(--t-border)] py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
          {hours.length > 0 && (
            <div>
              <SectionTitle>Horarios</SectionTitle>
              <HoursList hours={hours} />
            </div>
          )}
          <div>
            <SectionTitle>{branches.length > 1 ? 'Sucursales' : 'Dónde estamos'}</SectionTitle>
            <Locations business={business} branches={branches} slug={slug} />
          </div>
        </section>
      </main>

      {/* Closing CTA */}
      <section style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' }}>
        <div className="mx-auto flex max-w-[var(--t-width)] flex-col items-start gap-6 px-[var(--gutter)] py-14 sm:flex-row sm:items-center sm:justify-between sm:py-16">
          <h2 className="text-[clamp(1.75rem,1.3rem+1.8vw,2.5rem)] font-semibold leading-tight" style={{ fontFamily: 'var(--t-font-h)' }}>
            Tu próximo corte, a una reserva.
          </h2>
          <CtaButton to={bookHref}>Reservar turno</CtaButton>
        </div>
      </section>
      <footer className="mx-auto max-w-[var(--t-width)] px-[var(--gutter)] py-6 text-sm text-[var(--t-muted)]">
        Reservas con <Link to="/" className="font-semibold text-[var(--t-text)] underline-offset-4 hover:underline">BarberShifts</Link>
      </footer>

      {/* Mobile sticky booking bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--t-border)] bg-[var(--t-bg)] px-[var(--gutter)] pt-3 pb-safe sm:hidden">
        <CtaButton to={bookHref} className="w-full">Reservar turno</CtaButton>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTemplateConfig } from '../../templates/registry'
import { fmtCurrency } from '../../utils/format'
import { templateStyleVars } from '../../templates/useTemplateTheme'

/* ─── Utilities ─── */

function generateTimeSlots(openTime, closeTime, durationMinutes, existingAppointments = [], selectedDate = null) {
  const slots = []
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM
  const busySlots = existingAppointments.map((a) => ({ start: a.start_time, end: a.end_time }))

  // Ponytail: one-line now filter — skip past slots for today
  const now = new Date()
  const isToday = selectedDate && selectedDate === localISO(now)
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0

  for (let mins = openMinutes; mins + durationMinutes <= closeMinutes; mins += durationMinutes) {
    const sH = Math.floor(mins / 60)
    const sM = mins % 60
    const startStr = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`
    const eMins = mins + durationMinutes
    const eH = Math.floor(eMins / 60)
    const eM = eMins % 60
    const endStr = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`

    // Skip past slots for today
    if (isToday && mins <= currentMinutes) continue

    const isBusy = busySlots.some((b) => startStr < b.end && endStr > b.start)
    if (!isBusy) slots.push(startStr)
  }
  return slots
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getNext7Days() {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = localISO(d)
    const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
    const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
    const month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
    return { date: dateStr, label, weekday, dayNum: d.getDate(), month, isToday: i === 0, dayOfWeek: d.getDay() === 0 ? 7 : d.getDay() }
  })
}

/* ─── Presentational helpers (template-aware via --t-* vars) ─── */
const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function StepHeading({ title, subtitle, onBack }) {
  return (
    <div className="mb-6 sm:mb-8">
      {onBack && (
        <button type="button" onClick={onBack} className="-ml-2 mb-3 inline-flex h-10 items-center gap-1.5 rounded-[var(--t-radius-btn)] px-2 text-sm font-medium text-[var(--t-muted)] hover:text-[var(--t-text)]">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Atrás
        </button>
      )}
      <h1 className="text-[clamp(1.75rem,1.35rem+1.6vw,2.5rem)] font-semibold leading-tight text-[var(--t-text)]" style={{ fontFamily: 'var(--t-font-h)' }}>{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] text-[var(--t-muted)]">{subtitle}</p>}
    </div>
  )
}

// Selectable surface used by every option in the flow.
function Option({ selected, onClick, disabled, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-[var(--t-radius)] border transition-[border-color,box-shadow,background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? 'border-[var(--t-accent)] bg-[color-mix(in_srgb,var(--t-accent)_8%,var(--t-surface))] shadow-[0_0_0_1px_var(--t-accent)]'
          : 'border-[var(--t-border)] bg-[var(--t-surface)] hover:border-[var(--t-border-strong)]'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

function Avatar({ name, photo, size = 'h-12 w-12' }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--t-sunken)] text-[var(--t-accent-text)] ${size}`}>
      {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : (
        <span className="text-base font-semibold">{name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
      )}
    </div>
  )
}

function TField({ label, error, id, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--t-text)]">{label}</label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={`block h-12 w-full rounded-[var(--t-radius-btn)] border bg-[var(--t-bg)] px-4 text-base text-[var(--t-text)] placeholder:text-[var(--t-muted)] placeholder:opacity-70 focus:outline-none focus:ring-3 focus:ring-[color-mix(in_srgb,var(--t-accent)_25%,transparent)] ${error ? 'border-red-500' : 'border-[var(--t-border-strong)] focus:border-[var(--t-accent)]'}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm font-medium text-red-500">{error}</p>}
    </div>
  )
}

function SummaryRow({ label, value, onEdit }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--t-muted)]">{label}</p>
        <p className={`mt-0.5 text-[15px] ${value ? 'font-semibold text-[var(--t-text)]' : 'text-[var(--t-muted)]'}`}>{value || 'Sin elegir'}</p>
      </div>
      {value && onEdit && (
        <button type="button" onClick={onEdit} className="shrink-0 pt-4 text-sm font-semibold text-[var(--t-accent-text)] underline-offset-4 hover:underline">Cambiar</button>
      )}
    </div>
  )
}

const SLOT_GROUPS = [
  { label: 'Mañana', test: (t) => t < '12:00' },
  { label: 'Tarde', test: (t) => t >= '12:00' && t < '18:00' },
  { label: 'Noche', test: (t) => t >= '18:00' },
]

/* ─── Main component ─── */

export default function BookingPage() {
  const { slug } = useParams()
  const location = useLocation()
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [hours, setHours] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedService, setSelectedService] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [step, setStep] = useState(1)
  const [products, setProducts] = useState([])
  const [barberServices, setBarberServices] = useState({})
  const [selectedProducts, setSelectedProducts] = useState([])
  const [imgErrors, setImgErrors] = useState({})
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimerRef = useRef(null)
  const [formErrors, setFormErrors] = useState({})
  const [holidays, setHolidays] = useState([])
  const [businessPlan, setBusinessPlan] = useState(null) // BOOK-002: plan fetched directly

  const days = getNext7Days()
  const contentRef = useRef(null)

  // Solo barberos que realizan el servicio elegido (sin configuración = todos).
  const eligibleBarbers = useMemo(() => {
    if (!selectedService) return barbers
    return barbers.filter((b) => {
      const assigned = barberServices[b.id]
      return !assigned || assigned.size === 0 || assigned.has(selectedService.id)
    })
  }, [barbers, barberServices, selectedService])


  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (submitError) setSubmitError(null)
  }, [step])

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!business) return
    const cfg = getTemplateConfig(business.template_id, business.template_colors)
    const href = cfg.fonts?.google
    const id = 'barber-font-preset'
    let link = document.getElementById(id)
    if (!href) { if (link) link.remove(); return }
    if (!link) { link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'; document.head.appendChild(link) }
    if (link.href !== href) link.href = href
  }, [business])

  // BOOK-017: Re-fetch barbers and hours when branch changes
  useEffect(() => {
    if (!business || !selectedBranch) return

    async function refetchBranchData() {
      const { data: bar } = await supabase
        .from('barbers').select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .eq('branch_id', selectedBranch.id)
      setBarbers(bar || [])

      const { data: hrs } = await supabase
        .from('business_hours').select('*')
        .eq('business_id', business.id)
        .eq('branch_id', selectedBranch.id)
        .order('day_of_week')
      setHours(hrs || [])

      // Reset selections when branch changes
      setSelectedService(null)
      setSelectedBarber(null)
      setSelectedDate(null)
      setSelectedTime(null)
      setStep(1)
    }

    refetchBranchData()
  }, [selectedBranch?.id, business?.id])

  async function loadBarberia() {
    setLoading(true)
    try {
      // BOOK-009: Filter to active businesses only
      const { data: biz } = await supabase
        .from('businesses').select('*').eq('slug', slug).eq('status', 'active').single()
      if (!biz) throw new Error('Barbería no encontrada o no disponible')
      setBusiness(biz)

      // BOOK-002: Fetch plan directly from business row
      setBusinessPlan(biz.plan || 'basic')

      const { data: svc } = await supabase
        .from('services').select('*').eq('business_id', biz.id).eq('is_active', true).order('name')
      setServices(svc || [])

      const { data: branchData } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', biz.id)
        .eq('is_active', true)
        .order('name')

      let initialBranch = null
      if (branchData && branchData.length > 0) {
        setBranches(branchData)
        const params = new URLSearchParams(location.search)
        const branchSlug = params.get('branch')
        const matchedBranch = branchSlug
          ? branchData.find(b => b.slug === branchSlug)
          : null
        if (matchedBranch) {
          initialBranch = matchedBranch
        } else if (branchData.length === 1) {
          initialBranch = branchData[0]
        }
      }
      setSelectedBranch(initialBranch)

      // Columnas explícitas: anon no tiene acceso a email/teléfono de empleados.
      let barQuery = supabase
        .from('barbers')
        .select('id, name, photo_url, specialty, color_hex, branch_id, is_active')
        .eq('business_id', biz.id)
        .eq('is_active', true)
      if (initialBranch) barQuery = barQuery.eq('branch_id', initialBranch.id)
      const { data: bar } = await barQuery
      const barberList = bar || []
      setBarbers(barberList)

      // Servicios habilitados por barbero: el backend rechaza combinaciones
      // barbero/servicio no configuradas, así que la UI no debe ofrecerlas.
      if (barberList.length > 0) {
        const { data: links } = await supabase
          .from('barber_services')
          .select('barber_id, service_id')
          .in('barber_id', barberList.map((b) => b.id))
        const map = {}
        for (const link of links || []) {
          if (!map[link.barber_id]) map[link.barber_id] = new Set()
          map[link.barber_id].add(link.service_id)
        }
        setBarberServices(map)
      } else {
        setBarberServices({})
      }

      let hrsQuery = supabase
        .from('business_hours').select('*').eq('business_id', biz.id).order('day_of_week')
      if (initialBranch) hrsQuery = hrsQuery.eq('branch_id', initialBranch.id)
      const { data: hrs } = await hrsQuery
      setHours(hrs || [])

      const { data: prods } = await supabase
        .from('inventory_products')
        .select('id, name, description, price, current_stock, unit, image_url, branch_id, is_active')
        .eq('business_id', biz.id)
        .eq('is_product', true)
        .eq('is_active', true)
        .gt('current_stock', 0)
        .order('name')
      setProducts(prods || [])

      // BOOK-012: Pre-fetch holidays for the next 7 days
      const dateStart = days[0].date
      const dateEnd = days[days.length - 1].date
      const { data: hol } = await supabase
        .from('business_holidays')
        .select('date, is_closed')
        .eq('business_id', biz.id)
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .eq('is_closed', true)
      setHolidays(hol || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // BOOK-016: Added try-catch to loadSlots
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBarberia()
  }, [slug])

  useEffect(() => {
    if (!selectedDate || !selectedService || !business) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlotsLoading(true)
    setSelectedTime(null)

    async function loadSlots() {
      const dayOfWeek = new Date(selectedDate + 'T12:00:00').getDay() || 7
      const dayHours = hours.find((h) => h.day_of_week === dayOfWeek)
      if (!dayHours || dayHours.is_closed) { setAvailableSlots([]); setSlotsLoading(false); return }

      const { data: holidaysOnDate } = await supabase
        .from('business_holidays').select('*')
        .eq('business_id', business.id).eq('date', selectedDate).eq('is_closed', true)
      if (holidaysOnDate?.length > 0) { setAvailableSlots([]); setSlotsLoading(false); return }

        // Disponibilidad vía RPC: anon ya no puede leer appointments directamente.
        try {
          const { data: existing, error: slotsErr } = await supabase.rpc('get_busy_slots', {
            p_business_id: business.id,
            p_date: selectedDate,
            p_barber_id: selectedBarber || null,
          })
          if (slotsErr) {
            console.error('No se pudo cargar la disponibilidad:', slotsErr.message)
          }
          const slotDuration = dayHours.slot_duration || selectedService.duration || 30
          const slots = generateTimeSlots(dayHours.open_time, dayHours.close_time, slotDuration, existing || [], selectedDate)
          setAvailableSlots(slots)
        } catch (err) {
          console.error('Error loading slots:', err)
          setAvailableSlots([])
        } finally {
          setSlotsLoading(false)
        }
    }
    loadSlots()
  }, [selectedDate, selectedService, selectedBarber, business?.id, selectedBranch?.id])


  const canSubmit = useCallback(() => {
    if (cooldown > 0) return false
    setCooldown(30)
    cooldownTimerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current)
          cooldownTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return true
  }, [cooldown])

  // BOOK-003: Form validation with visible errors
  const validateForm = () => {
    const errs = {}
    if (!clientName.trim()) errs.clientName = 'El nombre es obligatorio'
    if (!clientPhone.trim()) {
      errs.clientPhone = 'El teléfono es obligatorio'
    } else if (!/^\d[\d\s\-()]{6,}$/.test(clientPhone.replace(/\s/g, ''))) {
      errs.clientPhone = 'Ingresá un número de teléfono válido (mínimo 7 dígitos)'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    if (!selectedTime || !selectedService || !selectedDate) return
    if (!canSubmit()) {
      setSubmitError(`Ya realizaste una reserva recientemente. Podés agendar otra en ${cooldown} segundos.`)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const productIds = selectedProducts.map((sp) => sp.product_id)
      const productQtys = selectedProducts.map((sp) => sp.quantity || 1)

        const { data: rpcData, error: rpcErr } = await supabase.rpc('create_appointment_atomic', {
          p_business_id: business.id,
          p_branch_id: selectedBranch?.id || null,
          p_service_id: selectedService.id,
          p_client_name: clientName,
          p_client_phone: clientPhone,
          p_client_email: clientEmail || '',
          p_date: selectedDate,
          p_start_time: selectedTime,
          p_barber_id: selectedBarber || null,
          p_product_ids: productIds,
          p_product_quantities: productQtys,
      })

        if (rpcErr) throw new Error('Error al crear reserva: ' + rpcErr.message)
        if (!rpcData || rpcData.success === false) {
          throw new Error(rpcData?.error || 'No se pudo crear la reserva')
        }

      setStep(7)
    } catch (err) {
      setSubmitError(err.message || 'Error al crear la reserva. Intenta de nuevo.')
      console.error('Booking error:', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]" aria-label="Cargando reserva">
        <div className="mx-auto max-w-3xl px-4 pt-20">
          <div className="skeleton h-9 w-2/3" />
          <div className="skeleton mt-3 h-5 w-1/2" />
          <div className="mt-8 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 w-full" />)}</div>
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="max-w-sm text-center">
          <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)]">No se puede reservar en esta barbería</h1>
          <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">{error || 'La barbería no existe o todavía no acepta reservas online.'}</p>
          <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-accent-ink)]">
            Ver todas las barberías
          </Link>
        </div>
      </div>
    )
  }

  const templateConfig = getTemplateConfig(business.template_id, business.template_colors)
  const shape = templateConfig.shape || { radius: '10px', width: '72rem' }
  const anim = `animate-${business.template_id || 'classic'}-card`
  // BOOK-002: Use businessPlan instead of plan from usePlan hook
  const showProductStep = businessPlan !== 'basic' && products.length > 0

  const flow = [1, 2, 3, 4, ...(showProductStep ? [5] : []), 6]
  const stepPos = Math.max(0, flow.indexOf(step))
  const stepNames = { 1: 'Servicio', 2: 'Barbero', 3: 'Fecha', 4: 'Hora', 5: 'Productos', 6: 'Tus datos' }
  const goBack = { 2: () => setStep(1), 3: () => setStep(2), 4: () => setStep(3), 5: () => setStep(4), 6: () => setStep(showProductStep ? 5 : 4) }[step]

  const barberName = selectedBarber ? barbers.find((b) => b.id === selectedBarber)?.name : (step > 2 ? 'Cualquier barbero' : null)
  const productsTotal = selectedProducts.reduce((sum, sp) => sum + sp.price * sp.quantity, 0)
  const total = Number(selectedService?.price || 0) + productsTotal
  const dateLabel = selectedDate ? formatDate(selectedDate) : null // e.g. 'lunes, 9 de noviembre'
  const needsBranch = branches.length > 1 && !selectedBranch

  const changeQty = (product, delta) => {
    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.product_id === product.id)
      if (delta < 0) {
        if (!existing || existing.quantity <= 1) return prev.filter((p) => p.product_id !== product.id)
        return prev.map((p) => (p.product_id === product.id ? { ...p, quantity: p.quantity - 1 } : p))
      }
      if (existing) {
        if (existing.quantity >= product.current_stock) return prev
        return prev.map((p) => (p.product_id === product.id ? { ...p, quantity: p.quantity + 1 } : p))
      }
      return [...prev, { product_id: product.id, name: product.name, quantity: 1, price: product.price }]
    })
  }

  const summary = (
    <div>
      <p className="text-lg font-semibold text-[var(--t-text)]" style={{ fontFamily: 'var(--t-font-h)' }}>Tu reserva</p>
      <div className="mt-2 divide-y divide-[var(--t-border)]">
        {selectedBranch && branches.length > 1 && <SummaryRow label="Sucursal" value={selectedBranch.name} onEdit={() => setSelectedBranch(null)} />}
        <SummaryRow label="Servicio" value={selectedService && `${selectedService.name} · ${selectedService.duration} min`} onEdit={() => setStep(1)} />
        <SummaryRow label="Barbero" value={barberName} onEdit={() => setStep(2)} />
        <SummaryRow label="Fecha" value={dateLabel} onEdit={() => setStep(3)} />
        <SummaryRow label="Hora" value={selectedTime && `${selectedTime} hs`} onEdit={() => setStep(4)} />
        {selectedProducts.length > 0 && (
          <div className="py-3">
            <p className="text-xs font-medium text-[var(--t-muted)]">Productos</p>
            {selectedProducts.map((sp) => (
              <div key={sp.product_id} className="mt-1 flex justify-between text-[15px] text-[var(--t-text)]">
                <span>{sp.name} × {sp.quantity}</span>
                <span className="tabular-nums">{fmtCurrency(sp.price * sp.quantity)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-[var(--t-border-strong)] pt-4">
        <span className="font-semibold text-[var(--t-text)]">Total</span>
        <span className="text-xl font-semibold tabular-nums text-[var(--t-text)]">{fmtCurrency(total)}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--t-muted)]">Se paga en la barbería.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--t-bg)] text-[var(--t-text)]" style={templateStyleVars(templateConfig, shape)}>
      {/* Header + progress */}
      <header className="sticky top-0 z-40 border-b border-[var(--t-border)] bg-[color-mix(in_srgb,var(--t-bg)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[72rem] items-center justify-between gap-4 px-[var(--gutter)] sm:h-16">
          <Link to={`/barberia/${slug}`} className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-[var(--t-muted)] hover:text-[var(--t-text)]">
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            <span className="truncate">{business.name}</span>
          </Link>
          {step < 7 && !needsBranch && (
            <span className="shrink-0 text-sm text-[var(--t-muted)]">
              Paso <span className="font-semibold text-[var(--t-text)] tabular-nums">{stepPos + 1}</span> de {flow.length}
              <span className="hidden sm:inline"> · {stepNames[step]}</span>
            </span>
          )}
        </div>
        {step < 7 && !needsBranch && (
          <div className="h-[3px] bg-[var(--t-border)]" role="progressbar" aria-valuemin={1} aria-valuemax={flow.length} aria-valuenow={stepPos + 1} aria-label="Progreso de la reserva">
            <div className="h-full transition-[width] duration-500 ease-out" style={{ width: `${((stepPos + 1) / flow.length) * 100}%`, backgroundColor: 'var(--t-accent)' }} />
          </div>
        )}
      </header>

      <div ref={contentRef} className={`mx-auto max-w-[72rem] px-[var(--gutter)] pt-8 pb-16 sm:pt-12 ${step < 7 && !needsBranch ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12' : ''}`}>
        <div className="mx-auto w-full max-w-2xl lg:mx-0">
          {/* Branch selector (multi branch) */}
          {needsBranch && (
            <div className={anim}>
              <StepHeading title="¿En qué sucursal?" subtitle="Cada sucursal tiene su propio equipo y horarios." />
              <div className="grid gap-3 sm:grid-cols-2">
                {branches.map((branch) => (
                  <Option key={branch.id} onClick={() => setSelectedBranch(branch)} className="w-full p-5 text-left">
                    <p className="font-semibold text-[var(--t-text)]">{branch.name}</p>
                    {branch.address && <p className="mt-1 text-sm text-[var(--t-muted)]">{branch.address}</p>}
                  </Option>
                ))}
              </div>
            </div>
          )}

          {!needsBranch && (
            <>
              {/* Step 1: Service */}
              {step === 1 && (
                <div className={anim}>
                  <StepHeading title="Elegí el servicio" subtitle="Después elegís barbero, día y hora." />
                  {services.length === 0 ? (
                    <div className="rounded-[var(--t-radius)] border border-dashed border-[var(--t-border-strong)] p-10 text-center">
                      <p className="font-semibold text-[var(--t-text)]">Esta barbería todavía no publicó sus servicios</p>
                      <p className="mt-1 text-sm text-[var(--t-muted)]">Mientras tanto podés escribirles para reservar.</p>
                      <Link to={`/barberia/${slug}`} className="mt-4 inline-flex text-sm font-semibold text-[var(--t-accent-text)]">Volver a la barbería</Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {services.map((svc) => (
                        <Option key={svc.id} selected={selectedService?.id === svc.id} onClick={() => { setSelectedService(svc); setStep(2) }} className="w-full p-4 text-left sm:p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-[var(--t-text)] sm:text-lg">{svc.name}</p>
                              <p className="mt-1 text-sm text-[var(--t-muted)]">
                                {svc.duration} min{svc.description ? ` · ${svc.description}` : ''}
                              </p>
                            </div>
                            <p className="shrink-0 text-base font-semibold tabular-nums text-[var(--t-accent-text)] sm:text-lg">{fmtCurrency(svc.price)}</p>
                          </div>
                        </Option>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Barber */}
              {step === 2 && (
                <div className={anim}>
                  <StepHeading title="¿Con quién?" subtitle="Si no tenés preferencia, te asignamos el primero libre." onBack={goBack} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Option selected={selectedBarber === null && step > 2} onClick={() => { setSelectedBarber(null); setStep(3) }} className="flex w-full items-center gap-4 p-4 text-left">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--t-border-strong)] text-[var(--t-muted)]">
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--t-text)]">Cualquier barbero</p>
                        <p className="text-sm text-[var(--t-muted)]">Más horarios disponibles</p>
                      </div>
                    </Option>
                    {eligibleBarbers.map((barber) => (
                      <Option key={barber.id} selected={selectedBarber === barber.id} onClick={() => { setSelectedBarber(barber.id); setStep(3) }} className="flex w-full items-center gap-4 p-4 text-left">
                        <Avatar name={barber.name} photo={barber.photo_url} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--t-text)]">{barber.name}</p>
                          {barber.specialty && <p className="truncate text-sm text-[var(--t-muted)]">{barber.specialty}</p>}
                        </div>
                      </Option>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Date */}
              {step === 3 && (
                <div className={anim}>
                  <StepHeading title="¿Qué día?" subtitle="Mostramos los próximos 7 días." onBack={goBack} />
                  <div className="-mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)] pb-2 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0">
                    <div className="grid w-max grid-flow-col gap-2 sm:w-full sm:grid-flow-row sm:grid-cols-7">
                      {days.map((day) => {
                        const isClosedHoliday = holidays.some((h) => h.date === day.date)
                        const dh = hours.find((h) => h.day_of_week === day.dayOfWeek)
                        const isClosed = isClosedHoliday || (hours.length > 0 && (!dh || dh.is_closed))
                        return (
                          <Option
                            key={day.date}
                            selected={selectedDate === day.date}
                            disabled={isClosed}
                            onClick={() => { setSelectedDate(day.date); setStep(4) }}
                            className="flex w-[4.5rem] flex-col items-center py-3 text-center sm:w-full"
                          >
                            <span className="text-xs font-medium capitalize text-[var(--t-muted)]">{day.isToday ? 'Hoy' : day.weekday}</span>
                            <span className="mt-1 text-2xl font-semibold tabular-nums text-[var(--t-text)]">{day.dayNum}</span>
                            <span className="text-xs capitalize text-[var(--t-muted)]">{isClosed ? 'Cerrado' : day.month}</span>
                          </Option>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Time */}
              {step === 4 && (
                <div className={anim}>
                  <StepHeading title="¿A qué hora?" subtitle={dateLabel && dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} onBack={goBack} />
                  {slotsLoading ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5" aria-label="Cargando horarios">
                      {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton h-12" />)}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="rounded-[var(--t-radius)] border border-dashed border-[var(--t-border-strong)] p-10 text-center">
                      <p className="font-semibold text-[var(--t-text)]">No quedan horarios libres ese día</p>
                      <p className="mt-1 text-sm text-[var(--t-muted)]">Probá con otro día{selectedBarber ? ' o con cualquier barbero' : ''}.</p>
                      <button type="button" onClick={() => setStep(3)} className="mt-4 text-sm font-semibold text-[var(--t-accent-text)]">Elegir otro día</button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {SLOT_GROUPS.map((g) => {
                        const slots = availableSlots.filter(g.test)
                        if (!slots.length) return null
                        return (
                          <div key={g.label}>
                            <p className="mb-2.5 text-sm font-medium text-[var(--t-muted)]">{g.label}</p>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                              {slots.map((slot) => (
                                <Option
                                  key={slot}
                                  selected={selectedTime === slot}
                                  onClick={() => { setSelectedTime(slot); setStep(showProductStep ? 5 : 6) }}
                                  className="h-12 w-full text-center text-[15px] font-semibold tabular-nums text-[var(--t-text)]"
                                >
                                  {slot}
                                </Option>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Products */}
              {step === 5 && (
                <div className={anim}>
                  <StepHeading title="¿Algo para llevar?" subtitle="Opcional. Lo pagás junto con el servicio." onBack={goBack} />
                  <div className="divide-y divide-[var(--t-border)] rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)]">
                    {products.map((product) => {
                      const qty = selectedProducts.find((p) => p.product_id === product.id)?.quantity || 0
                      return (
                        <div key={product.id} className="flex w-full items-center gap-4 p-4 text-left">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--t-radius-btn)] bg-[var(--t-sunken)]">
                            {product.image_url && !imgErrors[product.id] ? (
                              <img src={product.image_url} alt="" className="h-full w-full object-cover" onError={() => setImgErrors((prev) => ({ ...prev, [product.id]: true }))} />
                            ) : (
                              <span className="text-xl text-[var(--t-muted)]">{product.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug text-[var(--t-text)]">{product.name}</p>
                            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--t-accent-text)]">{fmtCurrency(product.price)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {qty > 0 && (
                              <>
                                <button type="button" onClick={() => changeQty(product, -1)} aria-label={`Quitar un ${product.name}`} className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-[var(--t-text)] ring-1 ring-inset ring-[var(--t-border-strong)]">−</button>
                                <span className="w-7 text-center font-semibold tabular-nums">{qty}</span>
                              </>
                            )}
                            <button type="button" onClick={() => changeQty(product, 1)} aria-label={`Agregar ${product.name}`} disabled={qty >= product.current_stock} className="flex h-11 w-11 items-center justify-center rounded-full text-xl disabled:opacity-40" style={{ backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' }}>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
                    <button type="button" onClick={() => { setSelectedProducts([]); setStep(6) }} className="h-12 rounded-[var(--t-radius-btn)] px-6 text-[15px] font-semibold text-[var(--t-text)] ring-1 ring-inset ring-[var(--t-border-strong)]">
                      No, gracias
                    </button>
                    <button type="button" onClick={() => setStep(6)} disabled={selectedProducts.length === 0} className="h-12 rounded-[var(--t-radius-btn)] px-6 text-[15px] font-semibold disabled:opacity-40" style={{ backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' }}>
                      Agregar y seguir
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Client data */}
              {step === 6 && (
                <div className={anim}>
                  <StepHeading title="Tus datos" subtitle="Los usamos solo para confirmarte el turno." onBack={goBack} />
                  <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSubmit() }} noValidate>
                    <TField
                      id="client-name" label="Nombre y apellido" autoComplete="name" value={clientName} maxLength={100} required
                      placeholder="Juan Pérez" error={formErrors.clientName}
                      onChange={(e) => { setClientName(e.target.value); if (formErrors.clientName) setFormErrors((prev) => ({ ...prev, clientName: null })) }}
                    />
                    <TField
                      id="client-phone" label="Teléfono (WhatsApp)" type="tel" inputMode="tel" autoComplete="tel" value={clientPhone} maxLength={20} required
                      placeholder="0981 123 456" error={formErrors.clientPhone}
                      onChange={(e) => { setClientPhone(e.target.value); if (formErrors.clientPhone) setFormErrors((prev) => ({ ...prev, clientPhone: null })) }}
                    />
                    <TField
                      id="client-email" label="Correo (opcional)" type="email" autoComplete="email" value={clientEmail} maxLength={100}
                      placeholder="juan@correo.com" onChange={(e) => setClientEmail(e.target.value)}
                    />

                    <div className="rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] p-5 lg:hidden">{summary}</div>

                    {submitError && (
                      <div role="alert" className="rounded-[var(--t-radius-btn)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-[var(--t-text)]">{submitError}</div>
                    )}
                    <button
                      type="submit"
                      disabled={submitting || cooldown > 0}
                      className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-[var(--t-radius-btn)] text-base font-semibold transition-[filter] hover:brightness-110 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' }}
                    >
                      {submitting && <svg aria-hidden="true" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                      {cooldown > 0 ? `Podés reservar otra vez en ${cooldown} s` : `Confirmar reserva · ${fmtCurrency(total)}`}
                    </button>
                  </form>
                </div>
              )}

              {/* Step 7: Success */}
              {step === 7 && (
                <div className={`${anim} mx-auto max-w-lg py-4 text-center`}>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' }}>
                    <svg aria-hidden="true" className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h1 className="mt-6 text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] font-semibold leading-tight" style={{ fontFamily: 'var(--t-font-h)' }}>Reserva confirmada</h1>
                  <p className="mt-2 text-[15px] text-[var(--t-muted)]">Te esperamos en {business.name}.</p>

                  <div className="mt-8 rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] text-left">
                    <div className="border-b border-dashed border-[var(--t-border-strong)] p-5 sm:p-6">
                      <p className="text-sm text-[var(--t-muted)]">{dateLabel && dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
                      <p className="mt-1 text-4xl font-semibold tabular-nums" style={{ fontFamily: 'var(--t-font-h)' }}>{selectedTime} hs</p>
                    </div>
                    <dl className="grid gap-3 p-5 text-[15px] sm:p-6">
                      <div className="flex justify-between gap-4"><dt className="text-[var(--t-muted)]">Servicio</dt><dd className="text-right font-semibold">{selectedService?.name}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-[var(--t-muted)]">Barbero</dt><dd className="text-right font-semibold">{barberName || 'Cualquier barbero'}</dd></div>
                      {(selectedBranch?.address || business.address) && (
                        <div className="flex justify-between gap-4"><dt className="text-[var(--t-muted)]">Dirección</dt><dd className="text-right font-semibold">{selectedBranch?.address || business.address}</dd></div>
                      )}
                      <div className="flex justify-between gap-4 border-t border-[var(--t-border)] pt-3"><dt className="text-[var(--t-muted)]">Total a pagar</dt><dd className="font-semibold tabular-nums">{fmtCurrency(total)}</dd></div>
                    </dl>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <Link to={`/barberia/${slug}`} className="inline-flex h-12 items-center justify-center rounded-[var(--t-radius-btn)] text-[15px] font-semibold" style={{ backgroundColor: 'var(--t-accent)', color: 'var(--t-on-accent)' }}>
                      Volver a la barbería
                    </Link>
                    {(selectedBranch?.phone || business.phone) ? (
                      <a href={`https://wa.me/${(selectedBranch?.phone || business.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-[var(--t-radius-btn)] text-[15px] font-semibold ring-1 ring-inset ring-[var(--t-border-strong)]">
                        Escribir por WhatsApp
                      </a>
                    ) : (
                      <Link to="/" className="inline-flex h-12 items-center justify-center rounded-[var(--t-radius-btn)] text-[15px] font-semibold ring-1 ring-inset ring-[var(--t-border-strong)]">Ver más barberías</Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Desktop summary */}
        {step < 7 && !needsBranch && (
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[var(--t-radius)] border border-[var(--t-border)] bg-[var(--t-surface)] p-6">{summary}</div>
          </aside>
        )}
      </div>
    </div>
  )
}

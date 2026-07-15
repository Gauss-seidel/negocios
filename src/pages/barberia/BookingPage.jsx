import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTemplateConfig } from '../../templates/registry'
import { fmtCurrency } from '../../utils/format'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

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
  const isToday = selectedDate && selectedDate === now.toISOString().split('T')[0]
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
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
    return { date: dateStr, label, dayOfWeek: d.getDay() === 0 ? 7 : d.getDay() }
  })
}

/* ─── Step progress ─── */

function StepProgress({ step, colors }) {
  const steps = ['Servicio', 'Barbero', 'Fecha', 'Hora', 'Producto', 'Datos']

  return (
    <div className="flex items-center justify-center gap-0 sm:gap-1">
      {steps.map((label, i) => {
        const num = i + 1
        const isDone = step > num
        const isCurrent = step === num
        const isLast = i === steps.length - 1

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all duration-500 ${
                  isDone
                    ? 'scale-100'
                    : isCurrent
                    ? 'scale-110 shadow-lg'
                    : 'scale-100'
                }`}
                style={{
                  backgroundColor: isDone || isCurrent ? colors.accent : `${colors.primary}10`,
                  color: isDone || isCurrent ? '#fff' : colors.textSecondary,
                  boxShadow: isCurrent ? `0 4px 20px ${colors.accent}40` : 'none',
                }}
              >
                {isDone ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  num
                )}
              </div>
              <span
                className={`hidden text-[10px] font-semibold uppercase tracking-wider transition-colors sm:inline ${
                  isCurrent ? 'opacity-100' : 'opacity-50'
                }`}
                style={{ color: isCurrent ? colors.accent : colors.textSecondary }}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`mx-1 h-px w-6 sm:mx-2 sm:w-10 transition-colors duration-500 ${
                  isDone ? 'opacity-60' : 'opacity-20'
                }`}
                style={{ backgroundColor: isDone ? colors.accent : colors.textSecondary }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step transitions ─── */

function StepContainer({ children, isActive }) {
  return (
    <div
      className={`transition-all duration-500 ${
        isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute pointer-events-none'
      }`}
    >
      {children}
    </div>
  )
}

/* ─── Service card ─── */

function ServiceCard({ service, isSelected, onClick, colors }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
      style={{
        borderColor: isSelected ? colors.accent : `${colors.primary}12`,
        backgroundColor: isSelected ? `${colors.accent}06` : 'white',
        boxShadow: isSelected ? `0 4px 20px ${colors.accent}15` : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {isSelected && (
        <div
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: colors.accent }}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div
            className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: colors.primary }}
          >
            {service.name.charAt(0)}
          </div>
          <div className="font-semibold" style={{ color: colors.text }}>{service.name}</div>
          {service.description && (
            <div className="mt-0.5 text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
              {service.description}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="text-lg font-bold" style={{ color: colors.accent }}>{fmtCurrency(service.price)}</div>
          <div className="flex items-center gap-1 text-xs" style={{ color: colors.textSecondary }}>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {service.duration} min
          </div>
        </div>
      </div>
    </button>
  )
}

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
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [step, setStep] = useState(1)
  const [products, setProducts] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])
  const [imgErrors, setImgErrors] = useState({})
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimerRef = useRef(null)
  const [formErrors, setFormErrors] = useState({})
  const [holidays, setHolidays] = useState([])
  const [businessPlan, setBusinessPlan] = useState(null) // BOOK-002: plan fetched directly

  const days = getNext7Days()
  const contentRef = useRef(null)

  useEffect(() => {
    loadBarberia()
  }, [slug])

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    if (submitError) setSubmitError(null)
  }, [step])

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    }
  }, [])

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

      let barQuery = supabase
        .from('barbers').select('*').eq('business_id', biz.id).eq('is_active', true)
      if (initialBranch) barQuery = barQuery.eq('branch_id', initialBranch.id)
      const { data: bar } = await barQuery
      setBarbers(bar || [])

      let hrsQuery = supabase
        .from('business_hours').select('*').eq('business_id', biz.id).order('day_of_week')
      if (initialBranch) hrsQuery = hrsQuery.eq('branch_id', initialBranch.id)
      const { data: hrs } = await hrsQuery
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
    if (!selectedDate || !selectedService || !business) return
    setSlotsLoading(true)
    setSelectedTime(null)

    async function loadSlots() {
      try {
        const dayOfWeek = new Date(selectedDate + 'T12:00:00').getDay() || 7
        const dayHours = hours.find((h) => h.day_of_week === dayOfWeek)
        if (!dayHours || dayHours.is_closed) { setAvailableSlots([]); setSlotsLoading(false); return }

        const { data: holidaysOnDate } = await supabase
          .from('business_holidays').select('*')
          .eq('business_id', business.id).eq('date', selectedDate).eq('is_closed', true)
        if (holidaysOnDate?.length > 0) { setAvailableSlots([]); setSlotsLoading(false); return }

        let query = supabase
          .from('appointments').select('start_time, end_time')
          .eq('business_id', business.id).eq('date', selectedDate)
          .not('status', 'in', '("cancelled","no_show")')
        // BOOK-018: Filter by branch_id when a branch is selected
        if (selectedBranch) query = query.eq('branch_id', selectedBranch.id)
        if (selectedBarber) query = query.eq('barber_id', selectedBarber)

        const { data: existing, error: slotErr } = await query
        if (slotErr) throw new Error('Error al cargar horarios disponibles')

        // BOOK-006: Use slot_duration from business_hours instead of hardcoded 30
        const slotDuration = dayHours.slot_duration || 30
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

  const checkSlotAvailable = async () => {
    const [h, m] = selectedTime.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = startMin + selectedService.duration
    const eH = String(Math.floor(endMin / 60)).padStart(2, '0')
    const eM = String(endMin % 60).padStart(2, '0')
    const endTimeStr = `${eH}:${eM}`

    let query = supabase
      .from('appointments')
      .select('id')
      .eq('business_id', business.id)
      .eq('date', selectedDate)
      .not('status', 'in', '("cancelled","no_show")')
      .lt('start_time', endTimeStr)
      .gt('end_time', selectedTime)

    if (selectedBarber) {
      query = query.eq('barber_id', selectedBarber)
    } else {
      // BOOK-014: For "any barber", check if there's an existing "any barber" booking in the slot
      query = query.is('barber_id', null)
    }

    // BOOK-018: Also filter by branch
    if (selectedBranch) query = query.eq('branch_id', selectedBranch.id)

    const { data: conflicts, error } = await query
    if (error) throw new Error('Error al verificar disponibilidad: ' + error.message)
    if (conflicts && conflicts.length > 0) {
      throw new Error('Este horario acaba de ser reservado por otra persona. Por favor elegí otro turno.')
    }
    return endTimeStr
  }

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
      // Verificar que el slot sigue disponible (evita doble reserva)
      const endTime = await checkSlotAvailable()

      let clientId = null

      // Buscar cliente existente por teléfono
      const { data: existingClient, error: findErr } = await supabase
        .from('clients').select('id')
        .eq('business_id', business.id).eq('phone', clientPhone).maybeSingle()
      if (findErr) throw new Error('Error al buscar cliente: ' + findErr.message)

      if (existingClient) {
        clientId = existingClient.id
      } else {
        // Crear nuevo cliente
        const { data: newClient, error: insertClientErr } = await supabase
          .from('clients').insert({
            business_id: business.id, name: clientName.trim(), phone: clientPhone.trim(), email: clientEmail.trim() || null
          }).select().single()
        if (insertClientErr) throw new Error('Error al crear cliente: ' + insertClientErr.message)
        if (!newClient) throw new Error('No se pudo crear el cliente')
        clientId = newClient.id
      }

      // Crear reserva
      const { data: appointment, error: insertApptErr } = await supabase
        .from('appointments').insert({
          business_id: business.id, branch_id: selectedBranch?.id || null, client_id: clientId, barber_id: selectedBarber || null,
          date: selectedDate, start_time: selectedTime, end_time: endTime, status: 'pending',
          total: Number(selectedService?.price || 0) + selectedProducts.reduce((sum, sp) => sum + Number(sp.price || 0) * (sp.quantity || 1), 0),
        }).select().single()
      if (insertApptErr) {
        // Si hay un error de unique constraint, el slot se acaba de ocupar
        if (insertApptErr.code === '23505') {
          throw new Error('Este horario acaba de ser reservado por otra persona. Por favor elegí otro turno.')
        }
        throw new Error('Error al crear reserva: ' + insertApptErr.message)
      }
      if (!appointment) throw new Error('No se pudo crear la reserva')

      // Agregar servicio a la reserva
      const { error: insertSvcErr } = await supabase.from('appointment_services').insert({
        appointment_id: appointment.id, service_id: selectedService.id, price: selectedService.price,
      })
      if (insertSvcErr) throw new Error('Error al agregar servicio: ' + insertSvcErr.message)

      // Agregar productos a la reserva
      // BOOK-007: Stock is decremented at completion time via complete_appointment function.
      // This is intentional — stock is reserved, not consumed, at booking time.
      if (selectedProducts.length > 0) {
        const productInserts = selectedProducts.map(sp => ({
          appointment_id: appointment.id,
          product_id: sp.product_id,
          quantity: sp.quantity,
          price: sp.price,
        }))
        const { error: insertProdErr } = await supabase
          .from('appointment_products')
          .insert(productInserts)
        if (insertProdErr) throw new Error('Error al agregar productos: ' + insertProdErr.message)
      }

      setSuccess(true)
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Barbería no encontrada</h2>
          <p className="mt-1 text-sm text-gray-500">{error || 'La barbería que buscas no existe o no está disponible.'}</p>
          <Link to="/" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent)]/80">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const templateConfig = getTemplateConfig(business.template_id, business.template_colors)
  const { colors } = templateConfig

  // Obtener clase de animación para el template actual
  const getStepAnimationClass = () => `animate-${business.template_id || 'classic'}-card`
  // BOOK-002: Use businessPlan instead of plan from usePlan hook
  const showProductStep = businessPlan !== 'basic' && products.length > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
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

      {/* Navbar */}
      <nav
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: `${colors.primary}08`, backgroundColor: `${colors.background}D9` }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            to={`/barberia/${slug}`}
            className="group flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: colors.textSecondary }}
          >
            <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>
          <span className="text-sm font-semibold" style={{ color: colors.text }}>
            Reservar en {business.name}
          </span>
        </div>
      </nav>

      {/* Progress */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        <StepProgress step={step} colors={colors} />
      </div>

      {/* Content */}
      <div ref={contentRef} className="mx-auto max-w-3xl px-4 pb-20">
        {/* Branch Selector (multi branch) */}
        {branches.length > 1 && !selectedBranch && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
              Elegí tu sucursal
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {branches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => setSelectedBranch(branch)}
                  className="rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-[var(--color-accent)] hover:shadow-md"
                >
                  <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                  {branch.address && (
                    <p className="mt-1 text-sm text-gray-500">{branch.address}</p>
                  )}
                  {branch.phone && (
                    <p className="mt-1 text-sm text-gray-500">{branch.phone}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Branch indicator (always visible when branch is selected) */}
        {selectedBranch && (
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
            style={{ backgroundColor: `${colors.accent}08`, border: `1px solid ${colors.accent}20` }}
          >
            <svg className="h-4 w-4" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span style={{ color: colors.text }}>
              <strong>{selectedBranch.name}</strong>
              {selectedBranch.address && <span className="ml-1 opacity-60">— {selectedBranch.address}</span>}
            </span>
          </div>
        )}

        {/* Guard: don't show booking form until branch is selected when multiple exist */}
        {branches.length > 1 && !selectedBranch ? null : (
        <>
        {/* Step 1: Service */}
        {step === 1 && (
          <div className={step === 1 ? getStepAnimationClass() : ''}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.accent }}>Elegí un servicio</h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>Seleccioná el servicio que querés recibir</p>
            </div>
            {/* BOOK-001: Empty state when no services */}
            {services.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: `${colors.primary}20` }}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="mt-4 text-lg font-medium" style={{ color: colors.textSecondary }}>
                  No hay servicios disponibles
                </p>
                <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                  Esta barbería aún no publicó sus servicios. Volvé pronto.
                </p>
                <Link
                  to={`/barberia/${slug}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: colors.accent }}
                >
                  ← Volver a la barbería
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((svc) => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    isSelected={selectedService?.id === svc.id}
                    onClick={() => { setSelectedService(svc); setStep(2) }}
                    colors={colors}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Barber */}
        {step === 2 && (
          <div className={getStepAnimationClass()}>
            {/* BOOK-011: Back button on step 2 */}
            <div className="mb-6">
              <button
                onClick={() => { setSelectedService(null); setStep(1) }}
                className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver a servicios
              </button>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.accent }}>
                Elegí un barbero
              </h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                Opcional — podés dejar que te atienda cualquier barbero disponible
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => { setSelectedBarber(null); setStep(3) }}
                className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  borderColor: selectedBarber === null ? colors.accent : `${colors.primary}20`,
                  backgroundColor: selectedBarber === null ? `${colors.accent}06` : 'transparent',
                }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl transition-transform group-hover:scale-105">
                  <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold" style={{ color: colors.text }}>Cualquier barbero</div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>Sin preferencia</div>
                </div>
              </button>

              {barbers.map((barber) => {
                const isSelected = selectedBarber === barber.id
                return (
                  <button
                    key={barber.id}
                    onClick={() => { setSelectedBarber(barber.id); setStep(3) }}
                    className="group flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      borderColor: isSelected ? colors.accent : `${colors.primary}12`,
                      backgroundColor: isSelected ? `${colors.accent}06` : 'white',
                      boxShadow: isSelected ? `0 4px 20px ${colors.accent}15` : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-black/5">
                      {barber.photo_url ? (
                        <img src={barber.photo_url} alt={barber.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-gray-400">{barber.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold" style={{ color: colors.text }}>{barber.name}</div>
                      {barber.specialty && (
                        <div className="text-sm" style={{ color: colors.textSecondary }}>{barber.specialty}</div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: colors.accent }}>
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Date */}
        {step === 3 && (
          <div className={getStepAnimationClass()}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.accent }}>Elegí una fecha</h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>Seleccioná el día para tu turno</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {days.map((day) => {
                const isSelected = selectedDate === day.date
                // BOOK-012: Check if date is a holiday (closed)
                const isClosed = holidays.some(h => h.date === day.date)
                return (
                  <button
                    key={day.date}
                    onClick={() => { if (!isClosed) { setSelectedDate(day.date); setStep(4) } }}
                    disabled={isClosed}
                    className="group rounded-2xl border p-4 text-center transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    style={{
                      borderColor: isSelected ? colors.accent : isClosed ? `${colors.primary}08` : `${colors.primary}12`,
                      backgroundColor: isSelected ? `${colors.accent}06` : 'white',
                      boxShadow: isSelected ? `0 4px 20px ${colors.accent}15` : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                      {day.label.split(' ')[0]}
                    </div>
                    <div className="mt-1.5 text-2xl font-bold" style={{ color: colors.text }}>
                      {day.label.split(' ')[1]}
                    </div>
                    {isClosed && (
                      <div className="mt-1 text-[9px] font-medium uppercase tracking-wider" style={{ color: '#ef4444' }}>
                        Cerrado
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 4: Time */}
        {step === 4 && (
          <div className={getStepAnimationClass()}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.accent }}>Elegí un horario</h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                {selectedDate && formatDate(selectedDate)}
              </p>
            </div>

            {slotsLoading ? (
              <div className="flex justify-center py-16">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: colors.accent, animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: colors.accent, animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: colors.accent, animationDelay: '300ms' }} />
                </div>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: `${colors.primary}20` }}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="mt-4 text-lg font-medium" style={{ color: colors.textSecondary }}>
                  No hay horarios disponibles para esta fecha
                </p>
                <button
                  onClick={() => setStep(3)}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: colors.accent }}
                >
                  ← Elegir otra fecha
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot
                  return (
                    <button
                      key={slot}
                      onClick={() => { setSelectedTime(slot); setStep(showProductStep ? 5 : 6) }}
                      className="rounded-2xl border px-3 py-3.5 text-center font-semibold transition-all duration-300 hover:-translate-y-0.5"
                      style={{
                        borderColor: isSelected ? colors.accent : `${colors.primary}12`,
                        backgroundColor: isSelected ? `${colors.accent}06` : 'white',
                        color: colors.text,
                        boxShadow: isSelected ? `0 4px 20px ${colors.accent}15` : '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Products */}
        {step === 5 && (
          <div className={getStepAnimationClass()}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.accent }}>
                ¿Quieres un producto más?
              </h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                Agregá productos a tu reserva para llevarte el cuidado a casa
              </p>
            </div>

            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: `${colors.primary}20` }}>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  No hay productos disponibles en este momento
                </p>
                <button
                  onClick={() => setStep(6)}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: colors.accent }}
                >
                  Continuar sin productos →
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => {
                    const sp = selectedProducts.find(p => p.product_id === product.id)
                    const qty = sp?.quantity || 0
                    return (
                      <div
                        key={product.id}
                        className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                          qty > 0 ? 'shadow-lg' : ''
                        }`}
                        style={{
                          borderColor: qty > 0 ? colors.accent : `${colors.primary}12`,
                          backgroundColor: 'white',
                        }}
                      >
                        {/* Image */}
                        <div className="h-32 flex items-center justify-center overflow-hidden bg-gray-50">
                          {product.image_url && !imgErrors[product.id] ? (
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover"
                              onError={() => setImgErrors(prev => ({ ...prev, [product.id]: true }))}
                            />
                          ) : (
                            <span className="text-2xl font-bold" style={{ color: `${colors.accent}44` }}>
                              {product.name.charAt(0)}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold" style={{ color: colors.text }}>{product.name}</h3>
                              <p className="text-xs" style={{ color: colors.textSecondary }}>
                                Stock: {product.current_stock} {product.unit}
                              </p>
                            </div>
                            <span className="text-lg font-bold" style={{ color: colors.accent }}>
                              {fmtCurrency(product.price)}
                            </span>
                          </div>

                          {/* Quantity selector */}
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>Cantidad</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setSelectedProducts(prev => {
                                    const existing = prev.find(p => p.product_id === product.id)
                                    if (!existing || existing.quantity <= 1) {
                                      return prev.filter(p => p.product_id !== product.id)
                                    }
                                    return prev.map(p => p.product_id === product.id
                                      ? { ...p, quantity: p.quantity - 1 }
                                      : p
                                    )
                                  })
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full border text-lg font-medium transition-colors hover:bg-gray-50"
                                style={{ borderColor: `${colors.primary}20`, color: colors.text }}
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-semibold" style={{ color: colors.text }}>{qty}</span>
                              <button
                                onClick={() => {
                                  setSelectedProducts(prev => {
                                    const existing = prev.find(p => p.product_id === product.id)
                                    if (existing) {
                                      if (existing.quantity >= product.current_stock) return prev
                                      return prev.map(p => p.product_id === product.id
                                        ? { ...p, quantity: p.quantity + 1 }
                                        : p
                                      )
                                    }
                                    return [...prev, {
                                      product_id: product.id,
                                      name: product.name,
                                      quantity: 1,
                                      price: product.price,
                                    }]
                                  })
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-medium text-white transition-colors"
                                style={{ backgroundColor: colors.accent }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div className="mt-8 flex items-center justify-between">
                  <button
                    onClick={() => { setSelectedProducts([]); setStep(4) }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                    style={{ color: colors.textSecondary }}
                  >
                    ← Volver
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setSelectedProducts([]); setStep(6) }}
                      className="rounded-2xl border px-5 py-2.5 text-sm font-medium transition-all"
                      style={{ borderColor: `${colors.primary}20`, color: colors.textSecondary }}
                    >
                      Saltar
                    </button>
                    <button
                      onClick={() => setStep(6)}
                      className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: colors.accent }}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 6: Client data */}
        {step === 6 && (
          <div className={getStepAnimationClass()}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: colors.accent }}>Tus datos</h2>
              <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                Completá tus datos para confirmar la reserva
              </p>
              {showProductStep && (
                <button
                  onClick={() => setStep(5)}
                  className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: colors.textSecondary }}
                >
                  ← Volver a productos
                </button>
              )}
            </div>

            <div className="space-y-5 rounded-2xl border p-6" style={{ borderColor: `${colors.primary}12`, backgroundColor: 'white' }}>
              <Input
                label="Nombre completo"
                value={clientName}
                onChange={(e) => { setClientName(e.target.value); if (formErrors.clientName) setFormErrors(prev => ({ ...prev, clientName: null })) }}
                placeholder="Ej: Juan Pérez"
                required
                maxLength={100}
                error={formErrors.clientName}
              />
              <Input
                label="Teléfono"
                type="tel"
                value={clientPhone}
                onChange={(e) => { setClientPhone(e.target.value); if (formErrors.clientPhone) setFormErrors(prev => ({ ...prev, clientPhone: null })) }}
                placeholder="Ej: 11 1234 5678"
                required
                maxLength={20}
                error={formErrors.clientPhone}
              />
              <Input
                label="Correo electrónico (opcional)"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="ej: juan@email.com"
                maxLength={100}
              />

              {/* Summary */}
              <div className="rounded-xl p-4" style={{ backgroundColor: `${colors.primary}05` }}>
                <p className="mb-3 text-sm font-semibold" style={{ color: colors.text }}>Resumen de la reserva</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>Sucursal</span>
                    <span className="font-medium" style={{ color: colors.text }}>{selectedBranch?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>Servicio</span>
                    <span className="font-medium" style={{ color: colors.text }}>{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>Barbero</span>
                    <span className="font-medium" style={{ color: colors.text }}>
                      {selectedBarber ? barbers.find(b => b.id === selectedBarber)?.name || '—' : 'Cualquier barbero'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>Fecha</span>
                    <span className="font-medium" style={{ color: colors.text }}>{selectedDate && formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>Hora</span>
                    <span className="font-medium" style={{ color: colors.text }}>{selectedTime} hs</span>
                  </div>
                  {selectedProducts.length > 0 && (
                    <>
                      <div className="border-t pt-2" style={{ borderColor: `${colors.primary}12` }}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                          Productos adicionales
                        </p>
                        {selectedProducts.map(sp => (
                          <div key={sp.product_id} className="flex justify-between text-sm">
                            <span style={{ color: colors.textSecondary }}>
                              {sp.name} ×{sp.quantity}
                            </span>
                            <span className="font-medium" style={{ color: colors.text }}>
                              {fmtCurrency(sp.price * sp.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="border-t pt-2" style={{ borderColor: `${colors.primary}12` }}>
                    <div className="flex justify-between">
                      <span className="font-semibold" style={{ color: colors.text }}>Total</span>
                      <span className="text-lg font-bold" style={{ color: colors.accent }}>
                        {fmtCurrency(
                          Number(selectedService?.price || 0) +
                          selectedProducts.reduce((sum, sp) => sum + sp.price * sp.quantity, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                loading={submitting}
                disabled={cooldown > 0}
                className="w-full"
                size="lg"
                style={{ backgroundColor: colors.accent }}
              >
                {cooldown > 0 ? `Esperá ${cooldown}s para agendar otra` : 'Confirmar reserva'}
              </Button>

              {submitError && (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{submitError}</div>
              )}
            </div>
          </div>
        )}

        {/* Step 7: Success */}
        {step === 7 && (
          <div className={`${getStepAnimationClass()} py-8`}>
            <div className="rounded-2xl border p-8 text-center" style={{ borderColor: `${colors.primary}12`, backgroundColor: 'white' }}>
              {/* Celebration check */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl" style={{ backgroundColor: `${colors.accent}12` }}>
                <svg className="h-10 w-10" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h2 className="mt-6 text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
                ¡Reserva confirmada!
              </h2>
              <p className="mt-2" style={{ color: colors.textSecondary }}>
                Te esperamos{' '}
                <strong style={{ color: colors.text }}>
                  {selectedDate && formatDate(selectedDate)} a las {selectedTime} hs
                </strong>
                {' '}en {business.name}.
              </p>

              {/* BOOK-005: Use branch address/phone when available */}
              <div className="mt-4 flex flex-col items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                {(selectedBranch?.address || business.address) && (
                  <span>📍 {selectedBranch?.address || business.address}</span>
                )}
                {(selectedBranch?.phone || business.phone) && (
                  <span>📞 {selectedBranch?.phone || business.phone}</span>
                )}
              </div>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={`/barberia/${slug}`}
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: colors.accent }}
                >
                  Volver a la barbería
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all"
                  style={{ backgroundColor: `${colors.primary}08`, color: colors.text }}
                >
                  Ver más barberías
                </Link>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

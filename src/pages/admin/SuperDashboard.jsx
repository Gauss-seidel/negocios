import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Card from '../../components/ui/Card'
import { BUSINESS_STATUS } from '../../lib/constants'
import { fmtCurrency } from '../../utils/format'
import { TEMPLATES } from '../../templates/registry'
import { ROLES } from '../../lib/constants'

/* ─── Constants ─── */

const PLAN_LABELS = { basic: 'Básico', professional: 'Profesional', premium: 'Premium' }

const METRICS = [
  { key: 'total', label: 'Total Barberías', color: 'text-blue-400', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { key: 'active', label: 'Activas', color: 'text-emerald-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'suspended', label: 'Suspendidas', color: 'text-red-400', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'pending', label: 'Pendientes', color: 'text-yellow-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'revenue', label: 'Ingresos mensuales', color: 'text-violet-400', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'bookings', label: 'Total reservas', color: 'text-cyan-400', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
]

const INITIAL_CREATE = { name: '', slug: '', email: '', phone: '', address: '', plan: 'basic', template_id: 'classic', password: '' }
const INITIAL_EDIT = { name: '', slug: '', email: '', phone: '', address: '', plan: 'basic', template_id: 'classic', status: BUSINESS_STATUS.ACTIVE }

/* ─── Helpers ─── */

function genSlug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

const fmtDate = (d) => d ? new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d)) : '—'

function StatusBadge({ status }) {
  const map = {
    [BUSINESS_STATUS.ACTIVE]: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Activa' },
    [BUSINESS_STATUS.SUSPENDED]: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', label: 'Suspendida' },
    [BUSINESS_STATUS.PENDING]: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400', label: 'Pendiente' },
  }
  const s = map[status] || { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/5 px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function PlanBadge({ plan }) {
  const map = {
    basic: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
    professional: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    premium: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  }
  const s = map[plan] || map.basic
  return <span className={`inline-flex items-center rounded-full border border-white/5 px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>{PLAN_LABELS[plan] || plan}</span>
}

/* ─── Main ─── */

export default function SuperDashboard() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [metrics, setMetrics] = useState({ total: 0, active: 0, suspended: 0, pending: 0, revenue: 0, bookings: 0 })

  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formError, setFormError] = useState(null)

  const [createForm, setCreateForm] = useState({ ...INITIAL_CREATE })
  const [createErrors, setCreateErrors] = useState({})
  const [slugManual, setSlugManual] = useState(false)

  const [editForm, setEditForm] = useState({ ...INITIAL_EDIT })
  const [editErrors, setEditErrors] = useState({})

  const { session } = useAuth()
  const { isMobile } = useResponsiveTable()

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (slugManual || !createForm.name) return
    setCreateForm(p => ({ ...p, slug: genSlug(createForm.name) }))
  }, [createForm.name, slugManual])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [bR, mR] = await Promise.allSettled([fetchBusinesses(), fetchMetrics()])
      if (bR.status === 'fulfilled') {
        const d = bR.value
        setBusinesses(d)
        setMetrics(p => ({ ...p, total: d.length, active: d.filter(b => b.status === BUSINESS_STATUS.ACTIVE).length, suspended: d.filter(b => b.status === BUSINESS_STATUS.SUSPENDED).length, pending: d.filter(b => b.status === BUSINESS_STATUS.PENDING).length }))
      }
      if (mR.status === 'fulfilled') setMetrics(p => ({ ...p, ...mR.value }))
    } catch (err) {
      setError(err?.message || 'Error al cargar')
    } finally { setLoading(false) }
  }

  async function fetchBusinesses() {
    const { data, error: e } = await supabase.from('businesses').select('*').order('created_at', { ascending: false })
    if (e) throw e
    return data || []
  }

  async function fetchMetrics() {
    const r = { revenue: 0, bookings: 0 }
    try {
      const { data: a } = await supabase.from('appointments').select('total')
      if (a) r.revenue = a.reduce((s, x) => s + (Number(x.total) || 0), 0)
    } catch {}
    try {
      const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true })
      if (count !== null) r.bookings = count
    } catch {}
    return r
  }

  /* Forms */
  function handleCreateChange(e) {
    const { name, value } = e.target
    setCreateForm(p => ({ ...p, [name]: value }))
    if (createErrors[name]) setCreateErrors(p => ({ ...p, [name]: '' }))
    if (formError) setFormError(null)
  }
  function handleCreateSlug(e) { setSlugManual(true); handleCreateChange(e) }

  function validate(form, isCreate = false) {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es obligatorio'
    if (!form.slug.trim()) e.slug = 'El slug es obligatorio'
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Solo minúsculas, números y guiones'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (isCreate) {
      if (!form.email.trim()) e.email = 'El email es obligatorio para el admin'
      if (!form.password) e.password = 'La contraseña es obligatoria'
      else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    }
    return e
  }

  async function handleCreateSubmit(e) {
    e.preventDefault()
    const v = validate(createForm, true)
    setCreateErrors(v)
    if (Object.keys(v).length) return
    setActionLoading(true)
    setFormError(null)
    try {
      if (!session?.access_token) throw new Error('No hay sesión activa')

      const efUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-super`

      // 1. Crear usuario auth via Edge Function
      const efRes = await fetch(efUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_user',
          email: createForm.email.trim(),
          password: createForm.password,
          role: ROLES.BUSINESS_ADMIN,
        }),
      })
      const efData = await efRes.json()
      if (!efData.success) throw new Error(`Error al crear usuario: ${efData.error}`)
      const authUserId = efData.data.user_id

      // 2. Crear negocio
      const { data: biz, error: be } = await supabase.from('businesses').insert([{
        name: createForm.name.trim(), slug: createForm.slug.trim(), email: createForm.email.trim(),
        phone: createForm.phone.trim() || null, address: createForm.address.trim() || null,
        plan: createForm.plan, template_id: createForm.template_id, status: BUSINESS_STATUS.ACTIVE,
      }]).select('id').single()
      if (be) throw new Error(`Error al crear negocio: ${be.message}`)

      // 3. Asignar business_id al auth user via Edge Function
      const efRes2 = await fetch(efUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'update_user',
          user_id: authUserId,
          app_metadata: { role: ROLES.BUSINESS_ADMIN, business_id: biz.id },
        }),
      })
      const efData2 = await efRes2.json()
      if (!efData2.success) throw new Error(`Error al asignar admin: ${efData2.error}`)

      // 4. Crear staff
      const { error: se } = await supabase.from('business_staff').insert([
        { user_id: authUserId, business_id: biz.id, role: 'business_admin' },
      ])
      if (se) throw new Error(`Error al asignar staff: ${se.message}`)

      setShowCreate(false)
      setCreateForm({ ...INITIAL_CREATE })
      setCreateErrors({})
      setSlugManual(false)
      await fetchAll()
    } catch (err) { setFormError(err.message || 'Error al crear') }
    finally { setActionLoading(false) }
  }

  function openEdit(b) {
    setEditTarget(b)
    setEditForm({ name: b.name||'', slug: b.slug||'', email: b.email||'', phone: b.phone||'', address: b.address||'', plan: b.plan||'basic', template_id: b.template_id||'classic', status: b.status||BUSINESS_STATUS.ACTIVE })
    setEditErrors({})
    setFormError(null)
    setShowEdit(true)
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm(p => ({ ...p, [name]: value }))
    if (editErrors[name]) setEditErrors(p => ({ ...p, [name]: '' }))
    if (formError) setFormError(null)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    const v = validate(editForm)
    setEditErrors(v)
    if (Object.keys(v).length) return
    setActionLoading(true)
    setFormError(null)
    try {
      const { error: ue } = await supabase.from('businesses').update({
        name: editForm.name.trim(), slug: editForm.slug.trim(), email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null, address: editForm.address.trim() || null,
        plan: editForm.plan, template_id: editForm.template_id, status: editForm.status,
      }).eq('id', editTarget.id)
      if (ue) throw ue
      setShowEdit(false)
      setEditTarget(null)
      await fetchAll()
    } catch (err) { setFormError(err.message || 'Error al actualizar') }
    finally { setActionLoading(false) }
  }

  async function handleToggleStatus(b) {
    const ns = b.status === BUSINESS_STATUS.SUSPENDED ? BUSINESS_STATUS.ACTIVE : BUSINESS_STATUS.SUSPENDED
    setActionLoading(true)
    try {
      await supabase.from('businesses').update({ status: ns }).eq('id', b.id)
      await fetchAll()
    } catch (err) { setError(err.message || 'Error al cambiar estado') }
    finally { setActionLoading(false) }
  }

  function confirmDelete(b) { setDeleteTarget(b); setShowDelete(true) }
  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await supabase.from('businesses').delete().eq('id', deleteTarget.id)
      setShowDelete(false)
      setDeleteTarget(null)
      await fetchAll()
    } catch (err) { setError(err.message || 'Error al eliminar') }
    finally { setActionLoading(false) }
  }

  /* Loading */
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  /* Error */
  if (error && !businesses.length) return (
    <div className="flex items-center justify-center py-32">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Error al cargar</h3>
        <p className="mt-2 text-sm text-white/40">{error}</p>
        <Button variant="secondary" className="mt-6" onClick={fetchAll}>Reintentar</Button>
      </div>
    </div>
  )

  const isEmpty = !businesses.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Panel de Administración</h1>
          <p className="mt-1 text-sm text-white/40">Gestioná todas las barberías registradas</p>
        </div>
        <Button onClick={() => { setCreateForm({ ...INITIAL_CREATE }); setCreateErrors({}); setSlugManual(false); setShowCreate(true) }}>
          <svg className="-ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva Barbería
        </Button>
      </div>

      {/* Metrics — con text-base en mobile para evitar truncado de valores grandes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {METRICS.map(m => {
          let val = metrics[m.key]
          if (m.key === 'revenue') val = fmtCurrency(val)
          else if (m.key === 'bookings') val = val.toLocaleString('es-MX')
          return (
            <div key={m.key} className="group rounded-2xl border border-white/[0.06] bg-card-dark p-4 transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <svg className={`h-5 w-5 ${m.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white/40">{m.label}</p>
                  <p className={`truncate text-base font-bold sm:text-lg ${m.color}`}>{val}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table Card */}
      <Card dark padding={false}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Barberías Registradas</h2>
            <p className="mt-0.5 text-sm text-white/40">{businesses.length} {businesses.length === 1 ? 'registrada' : 'registradas'}</p>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <svg className="h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-white/60">No hay barberías registradas</h3>
            <p className="mt-1 text-sm text-white/30">Crea la primera barbería para comenzar</p>
            <Button variant="secondary" className="mt-4" onClick={() => { setCreateForm({ ...INITIAL_CREATE }); setShowCreate(true) }}>
              Crear Barbería
            </Button>
          </div>
        ) : isMobile ? (
          /* ── Mobile card layout ── */
          <div className="space-y-3 p-4">
            {businesses.map(b => (
              <div key={b.id} className="rounded-2xl border border-white/10 bg-card-dark p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-sm font-bold text-[var(--color-accent)]">
                      {(b.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{b.name}</p>
                      {b.email && <p className="truncate text-xs text-white/30">{b.email}</p>}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <PlanBadge plan={b.plan} />
                    <span className="text-xs text-white/30">{fmtDate(b.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-white/30 transition-all hover:bg-white/5 hover:text-white" title="Editar">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button onClick={() => handleToggleStatus(b)} disabled={actionLoading} className={`rounded-lg p-2 transition-all hover:bg-white/5 disabled:opacity-30 ${b.status === BUSINESS_STATUS.SUSPENDED ? 'text-emerald-400 hover:text-emerald-300' : 'text-amber-400 hover:text-amber-300'}`} title={b.status === BUSINESS_STATUS.SUSPENDED ? 'Activar' : 'Suspender'}>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        {b.status === BUSINESS_STATUS.SUSPENDED
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        }
                      </svg>
                    </button>
                    <button onClick={() => window.open(`/barberia/${b.slug}`, '_blank')} className="rounded-lg p-2 text-white/30 transition-all hover:bg-white/5 hover:text-white" title="Ver pública">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button onClick={() => confirmDelete(b)} className="rounded-lg p-2 text-white/30 transition-all hover:bg-red-500/10 hover:text-red-400" title="Eliminar">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop table ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-semibold uppercase tracking-wider text-white/30">
                  <th className="px-6 py-3.5">Nombre</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Creado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {businesses.map(b => (
                  <tr key={b.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-sm font-bold text-[var(--color-accent)]">
                          {(b.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{b.name}</p>
                          {b.email && <p className="truncate text-xs text-white/30">{b.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-6 py-4"><PlanBadge plan={b.plan} /></td>
                    <td className="whitespace-nowrap px-6 py-4 text-white/40">{fmtDate(b.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-white/30 transition-all hover:bg-white/5 hover:text-white" title="Editar">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button onClick={() => handleToggleStatus(b)} disabled={actionLoading} className={`rounded-lg p-2 transition-all hover:bg-white/5 disabled:opacity-30 ${b.status === BUSINESS_STATUS.SUSPENDED ? 'text-emerald-400 hover:text-emerald-300' : 'text-amber-400 hover:text-amber-300'}`} title={b.status === BUSINESS_STATUS.SUSPENDED ? 'Activar' : 'Suspender'}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            {b.status === BUSINESS_STATUS.SUSPENDED
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            }
                          </svg>
                        </button>
                        <button onClick={() => window.open(`/barberia/${b.slug}`, '_blank')} className="rounded-lg p-2 text-white/30 transition-all hover:bg-white/5 hover:text-white" title="Ver pública">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button onClick={() => confirmDelete(b)} className="rounded-lg p-2 text-white/30 transition-all hover:bg-red-500/10 hover:text-red-400" title="Eliminar">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setCreateForm({ ...INITIAL_CREATE }); setCreateErrors({}); setSlugManual(false) }} title="Nueva Barbería" size="lg" dark>
        {formError && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formError}</div>}
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nombre" name="name" value={createForm.name} onChange={handleCreateChange} placeholder="Ej: Barbería El Clásico" error={createErrors.name} dark />
            <Input label="Slug" name="slug" value={createForm.slug} onChange={handleCreateSlug} placeholder="ej: barberia-el-clasico" error={createErrors.slug} dark />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" name="email" type="email" value={createForm.email} onChange={handleCreateChange} placeholder="contacto@barberia.com" error={createErrors.email} dark />
            <Input label="Teléfono" name="phone" value={createForm.phone} onChange={handleCreateChange} placeholder="+52 555 123 4567" dark />
          </div>
          <Input label="Dirección" name="address" value={createForm.address} onChange={handleCreateChange} placeholder="Calle y número, colonia, ciudad" dark />
          <Input label="Contraseña del admin" name="password" type="password" value={createForm.password} onChange={handleCreateChange} placeholder="Mínimo 6 caracteres" error={createErrors.password} dark />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">Plan</label>
              <select name="plan" value={createForm.plan} onChange={handleCreateChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none">
                <option value="basic">Básico</option>
                <option value="professional">Profesional</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">Plantilla</label>
              <select name="template_id" value={createForm.template_id} onChange={handleCreateChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none">
                {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setCreateForm({ ...INITIAL_CREATE }) }}>Cancelar</Button>
            <Button type="submit" loading={actionLoading}>Crear Barbería</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditTarget(null) }} title={editTarget ? `Editar: ${editTarget.name}` : 'Editar'} size="lg" dark>
        {formError && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formError}</div>}
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nombre" name="name" value={editForm.name} onChange={handleEditChange} error={editErrors.name} dark />
            <Input label="Slug" name="slug" value={editForm.slug} onChange={handleEditChange} error={editErrors.slug} dark />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" name="email" type="email" value={editForm.email} onChange={handleEditChange} error={editErrors.email} dark />
            <Input label="Teléfono" name="phone" value={editForm.phone} onChange={handleEditChange} dark />
          </div>
          <Input label="Dirección" name="address" value={editForm.address} onChange={handleEditChange} dark />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">Plan</label>
              <select name="plan" value={editForm.plan} onChange={handleEditChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none">
                <option value="basic">Básico</option><option value="professional">Profesional</option><option value="premium">Premium</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">Plantilla</label>
              <select name="template_id" value={editForm.template_id} onChange={handleEditChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none">
                {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">Estado</label>
              <select name="status" value={editForm.status} onChange={handleEditChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none">
                <option value={BUSINESS_STATUS.ACTIVE}>Activa</option>
                <option value={BUSINESS_STATUS.SUSPENDED}>Suspendida</option>
                <option value={BUSINESS_STATUS.PENDING}>Pendiente</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowEdit(false); setEditTarget(null) }}>Cancelar</Button>
            <Button type="submit" loading={actionLoading}>Guardar Cambios</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={showDelete} onClose={() => { setShowDelete(false); setDeleteTarget(null) }} title="Confirmar eliminación" size="sm" dark>
        <div className="space-y-4">
          <p className="text-sm text-white/60">
            ¿Estás seguro de eliminar <strong className="text-white">{deleteTarget?.name}</strong>?
          </p>
          <p className="text-sm text-white/40">Esta acción no se puede deshacer.</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowDelete(false); setDeleteTarget(null) }}>Cancelar</Button>
            <Button type="button" variant="danger" onClick={handleDelete} loading={actionLoading}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

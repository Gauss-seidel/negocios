import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

/* ─── Main ─── */

export default function SuperConfigPage() {
  const { session } = useAuth()

  // Stats
  const [stats, setStats] = useState(null)
  const [superAdmins, setSuperAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Create super admin
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' })
  const [createErrors, setCreateErrors] = useState({})
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [{ count: bizCount }, { count: appCount }, { count: staffCount }, { count: planCount }, { data: sAdmins }] =
        await Promise.all([
          supabase.from('businesses').select('*', { count: 'exact', head: true }),
          supabase.from('appointments').select('*', { count: 'exact', head: true }),
          supabase.from('business_staff').select('*', { count: 'exact', head: true }),
          supabase.from('plans').select('*', { count: 'exact', head: true }),
          supabase.from('super_admins').select('id, name, created_at').order('created_at', { ascending: false }),
        ])

      let totalRevenue = 0
      try {
        const { data: apps } = await supabase.from('appointments').select('total')
        if (apps) totalRevenue = apps.reduce((s, x) => s + (Number(x.total) || 0), 0)
      } catch {}

      setStats({
        businesses: bizCount || 0,
        appointments: appCount || 0,
        staff: staffCount || 0,
        plans: planCount || 0,
        revenue: totalRevenue,
      })
      setSuperAdmins(sAdmins || [])
    } catch (err) {
      setError(err?.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  /* ─── Create Super Admin ─── */

  function openCreate() {
    setCreateForm({ name: '', email: '', password: '' })
    setCreateErrors({})
    setCreateError(null)
    setCreateSuccess(false)
    setShowCreate(true)
  }

  function handleCreateChange(e) {
    const { name, value } = e.target
    setCreateForm(p => ({ ...p, [name]: value }))
    if (createErrors[name]) setCreateErrors(p => ({ ...p, [name]: '' }))
    if (createError) setCreateError(null)
    if (createSuccess) setCreateSuccess(false)
  }

  function validateCreate() {
    const e = {}
    if (!createForm.name.trim()) e.name = 'Obligatorio'
    if (!createForm.email.trim()) e.email = 'Obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) e.email = 'Email inválido'
    if (!createForm.password) e.password = 'Obligatorio'
    else if (createForm.password.length < 6) e.password = 'Mínimo 6 caracteres'
    return e
  }

  async function handleCreateSubmit(e) {
    e.preventDefault()
    const v = validateCreate()
    setCreateErrors(v)
    if (Object.keys(v).length) return

    setCreateLoading(true)
    setCreateError(null)
    setCreateSuccess(false)
    try {
      if (!session?.access_token) throw new Error('No hay sesión activa')

      const efUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-super`

      // 1. Create user with super_admin role via Edge Function
      const efRes = await fetch(efUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_user',
          email: createForm.email.trim(),
          password: createForm.password,
          role: 'super_admin',
        }),
      })
      const efData = await efRes.json()
      if (!efData.success) throw new Error(efData.error)
      const userId = efData.data.user.id

      // 2. Insert into super_admins table
      const { error: ie } = await supabase.from('super_admins').insert([
        { id: userId, name: createForm.name.trim() },
      ])
      if (ie) throw new Error(`Error al registrar: ${ie.message}`)

      setCreateSuccess(true)
      setCreateForm({ name: '', email: '', password: '' })
      await fetchData()
    } catch (err) {
      setCreateError(err.message || 'Error al crear super admin')
    } finally {
      setCreateLoading(false)
    }
  }

  function fmtRevenue(v) {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0)
  }

  /* ─── Render ─── */

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '0ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '150ms' }} />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--color-accent)]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Configuración del Sistema</h1>
          <p className="mt-1 text-sm text-white/40">Estadísticas, administradores y configuración global</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Barberías registradas', value: stats?.businesses ?? '—', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'text-blue-400' },
          { label: 'Reservas totales', value: stats?.appointments?.toLocaleString() ?? '—', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'text-cyan-400' },
          { label: 'Empleados', value: stats?.staff?.toLocaleString() ?? '—', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'text-violet-400' },
          { label: 'Planes', value: stats?.plans ?? '—', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', color: 'text-amber-400' },
        ].map(s => (
          <Card key={s.label} dark hover>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                <svg className={`h-5 w-5 ${s.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/40">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* System Info + Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* System Info */}
        <Card dark padding={false}>
          <div className="border-b border-white/[0.06] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Información del Sistema</h2>
          </div>
          <div className="divide-y divide-white/[0.04] px-6 py-4">
            {[
              { label: 'Proyecto', value: import.meta.env.VITE_SUPABASE_URL.replace('https://', '').replace('.supabase.co', '') },
              { label: 'Frontend', value: 'React + Vite' },
              { label: 'Entorno', value: import.meta.env.DEV ? 'Desarrollo' : 'Producción' },
              { label: 'Super Admin', value: session?.user?.email || '—' },
              { label: 'Ingresos totales', value: fmtRevenue(stats?.revenue) },
              { label: 'Moneda', value: 'Guaraníes (PYG)' },
              { label: 'Zona horaria', value: 'America/Asuncion' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-white/40">{label}</span>
                <span className="font-medium text-white/80">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card dark>
          <h2 className="mb-4 text-lg font-semibold text-white">Acciones Rápidas</h2>
          <div className="space-y-3">
            <button
              onClick={openCreate}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70 transition-all hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 hover:text-white"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
                <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Crear Super Admin</p>
                <p className="text-xs text-white/40">Dar acceso a otro administrador del sistema</p>
              </div>
              <svg className="ml-auto h-5 w-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <a
              href="https://supabase.com/dashboard/project/mrktwxjlltqqxkvktkku"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70 transition-all hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Dashboard Supabase</p>
                <p className="text-xs text-white/40">Base de datos, auth, usuarios y más</p>
              </div>
              <svg className="ml-auto h-5 w-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </a>

            <a
              href="https://render.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-white/70 transition-all hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Dashboard Render</p>
                <p className="text-xs text-white/40">Hosting, deploy y logs de la app</p>
              </div>
              <svg className="ml-auto h-5 w-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </a>
          </div>
        </Card>
      </div>

      {/* Super Admins */}
      <Card dark padding={false}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Super Administradores</h2>
            <p className="mt-0.5 text-sm text-white/40">{superAdmins.length} {superAdmins.length === 1 ? 'registrado' : 'registrados'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <svg className="-ml-0.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo
          </Button>
        </div>
        {superAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-10">
            <p className="text-sm text-white/40">No hay super-administradores registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-semibold uppercase tracking-wider text-white/30">
                  <th className="px-6 py-3.5">Nombre</th>
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">Registrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {superAdmins.map(a => (
                  <tr key={a.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-white">{a.name}</td>
                    <td className="px-6 py-4">
                      <code className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs text-white/40 font-mono">{a.id}</code>
                    </td>
                    <td className="px-6 py-4 text-white/40">
                      {a.created_at
                        ? new Intl.DateTimeFormat('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(a.created_at))
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Super Admin Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear Super Admin" size="md" dark>
        {createSuccess ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Super Admin creado</h3>
            <p className="text-sm text-white/40">{createForm.email} ya tiene acceso como super admin.</p>
            <Button variant="secondary" onClick={() => { setShowCreate(false); setCreateSuccess(false) }}>Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{createError}</div>
            )}
            <Input
              label="Nombre"
              name="name"
              value={createForm.name}
              onChange={handleCreateChange}
              placeholder="Ej: Admin Principal"
              error={createErrors.name}
              dark
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={createForm.email}
              onChange={handleCreateChange}
              placeholder="admin@ejemplo.com"
              error={createErrors.email}
              dark
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={createForm.password}
              onChange={handleCreateChange}
              placeholder="Mínimo 6 caracteres"
              error={createErrors.password}
              dark
            />
            <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" loading={createLoading}>Crear Super Admin</Button>
            </div>
          </form>
        )}
      </Modal>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
    </div>
  )
}

import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Card from '../../components/ui/Card'
import { fmtCurrency } from '../../utils/format'

/* ─── Constants ─── */

const INITIAL_FORM = {
  name: '', slug: '', description: '', price: '',
  max_barbers: 3, max_branches: 1, max_monthly_bookings: 100,
  features: '', is_active: true,
}

/* ─── Main ─── */

export default function PlanesPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState(null)

  useEffect(() => { fetchPlans() }, [])

  async function fetchPlans() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true })
      if (e) throw e
      setPlans(data || [])
    } catch (err) {
      setError(err?.message || 'Error al cargar planes')
    } finally {
      setLoading(false)
    }
  }

  function openEdit(plan) {
    setEditTarget(plan)
    setForm({
      name: plan.name || '',
      slug: plan.slug || '',
      description: plan.description || '',
      price: String(plan.price ?? ''),
      max_barbers: plan.max_barbers ?? 3,
      max_branches: plan.max_branches ?? 1,
      max_monthly_bookings: plan.max_monthly_bookings ?? 100,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      is_active: plan.is_active ?? true,
    })
    setFormErrors({})
    setFormError(null)
    setShowEdit(true)
  }

  function closeEdit() {
    setShowEdit(false)
    setEditTarget(null)
    setForm({ ...INITIAL_FORM })
    setFormErrors({})
    setFormError(null)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    if (formErrors[name]) setFormErrors(p => ({ ...p, [name]: '' }))
    if (formError) setFormError(null)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Obligatorio'
    if (!form.slug.trim()) e.slug = 'Obligatorio'
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Solo minúsculas, números y guiones'
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Precio inválido'
    if (!form.max_barbers || isNaN(Number(form.max_barbers))) e.max_barbers = 'Número inválido'
    if (!form.max_branches || isNaN(Number(form.max_branches))) e.max_branches = 'Número inválido'
    if (!form.max_monthly_bookings || isNaN(Number(form.max_monthly_bookings))) e.max_monthly_bookings = 'Número inválido'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    setFormErrors(v)
    if (Object.keys(v).length) return

    setActionLoading(true)
    setFormError(null)
    try {
      const features = form.features
        ? form.features.split('\n').map(s => s.trim()).filter(Boolean)
        : []

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        max_barbers: Number(form.max_barbers),
        max_branches: Number(form.max_branches),
        max_monthly_bookings: Number(form.max_monthly_bookings),
        features,
        is_active: form.is_active,
      }

      const { error: ue } = await supabase
        .from('plans')
        .update(payload)
        .eq('id', editTarget.id)

      if (ue) throw ue
      closeEdit()
      await fetchPlans()
    } catch (err) {
      setFormError(err.message || 'Error al guardar')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToggle(plan) {
    setActionLoading(true)
    try {
      const { error: ue } = await supabase
        .from('plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)
      if (ue) throw ue
      await fetchPlans()
    } catch (err) {
      setError(err.message || 'Error al cambiar estado')
    } finally {
      setActionLoading(false)
    }
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
  if (error) return (
    <div className="flex items-center justify-center py-32">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">Error al cargar</h3>
        <p className="mt-2 text-sm text-white/40">{error}</p>
        <Button variant="secondary" className="mt-6" onClick={fetchPlans}>Reintentar</Button>
      </div>
    </div>
  )

  const isEmpty = !plans.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Planes de Suscripción</h1>
        <p className="mt-1 text-sm text-white/40">Administrá los planes disponibles para las barberías</p>
      </div>

      <Card dark padding={false}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Planes</h2>
            <p className="mt-0.5 text-sm text-white/40">{plans.length} {plans.length === 1 ? 'plan' : 'planes'}</p>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <svg className="h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-white/60">No hay planes registrados</h3>
            <p className="mt-1 text-sm text-white/30">Los planes se crean desde la base de datos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-semibold uppercase tracking-wider text-white/30">
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Precio</th>
                  <th className="px-6 py-3.5">Barberos</th>
                  <th className="px-6 py-3.5">Sucursales</th>
                  <th className="px-6 py-3.5">Reservas/mes</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {plans.map(p => (
                  <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{p.name}</p>
                        {p.description && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-white/30">{p.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[var(--color-accent)]">{fmtCurrency(p.price)}</span>
                      <span className="text-xs text-white/30">/mes</span>
                    </td>
                    <td className="px-6 py-4 text-white/60">{p.max_barbers === 999 ? '∞' : p.max_barbers}</td>
                    <td className="px-6 py-4 text-white/60">{p.max_branches === 999 ? '∞' : p.max_branches}</td>
                    <td className="px-6 py-4 text-white/60">{p.max_monthly_bookings >= 999999 ? '∞' : p.max_monthly_bookings.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        p.is_active
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border-red-500/20 bg-red-500/10 text-red-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-2 text-white/30 transition-all hover:bg-white/5 hover:text-white"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggle(p)}
                          disabled={actionLoading}
                          className={`rounded-lg p-2 transition-all hover:bg-white/5 disabled:opacity-30 ${
                            p.is_active
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-emerald-400 hover:text-emerald-300'
                          }`}
                          title={p.is_active ? 'Desactivar' : 'Activar'}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            {p.is_active
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            }
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

      {/* Features summary with edit */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.filter(p => p.is_active).map(p => (
          <Card key={p.id} dark hover className="group">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-bold text-white">{p.name}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/20 opacity-0 transition-all hover:bg-white/5 hover:text-white group-hover:opacity-100"
                    title="Editar plan"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[var(--color-accent)]">{fmtCurrency(p.price)}</span>
                <button
                  onClick={() => handleToggle(p)}
                  disabled={actionLoading}
                  className={`rounded-lg p-1.5 transition-all hover:bg-white/5 disabled:opacity-30 ${
                    p.is_active ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                  title={p.is_active ? 'Desactivar' : 'Activar'}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    {p.is_active
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    }
                  </svg>
                </button>
              </div>
              {p.description && (
                <p className="text-sm text-white/40">{p.description}</p>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Barberos</span>
                  <span className="font-medium text-white">{p.max_barbers === 999 ? '∞' : p.max_barbers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Sucursales</span>
                  <span className="font-medium text-white">{p.max_branches === 999 ? '∞' : p.max_branches}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Reservas/mes</span>
                  <span className="font-medium text-white">{p.max_monthly_bookings >= 999999 ? '∞' : p.max_monthly_bookings.toLocaleString()}</span>
                </div>
              </div>
              {Array.isArray(p.features) && p.features.length > 0 && (
                <ul className="space-y-1 border-t border-white/[0.06] pt-3">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/50">
                      <svg className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={closeEdit} title={`Editar: ${editTarget?.name || ''}`} size="lg" dark>
        {formError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nombre" name="name" value={form.name} onChange={handleChange} error={formErrors.name} dark />
            <Input label="Slug" name="slug" value={form.slug} onChange={handleChange} error={formErrors.slug} dark />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/70">Descripción</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Input label="Precio (Gs)" name="price" type="number" step="1000" min="0" value={form.price} onChange={handleChange} error={formErrors.price} dark />
            <Input label="Max. Barberos" name="max_barbers" type="number" min="1" value={form.max_barbers} onChange={handleChange} error={formErrors.max_barbers} dark />
            <Input label="Max. Sucursales" name="max_branches" type="number" min="1" value={form.max_branches} onChange={handleChange} error={formErrors.max_branches} dark />
            <Input label="Reservas/mes" name="max_monthly_bookings" type="number" min="1" value={form.max_monthly_bookings} onChange={handleChange} error={formErrors.max_monthly_bookings} dark />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/70">Características (una por línea)</label>
            <textarea
              name="features"
              value={form.features}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none"
              placeholder="Gestión de reservas&#10;Gestión de clientes&#10;1 sucursal&#10;3 empleados"
            />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span className="text-sm font-medium text-white/70">Plan activo</span>
          </label>
          <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-4">
            <Button type="button" variant="ghost" onClick={closeEdit}>Cancelar</Button>
            <Button type="submit" loading={actionLoading}>Guardar Cambios</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

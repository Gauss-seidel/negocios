import { supabase } from '../../lib/supabase'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Card from '../../components/ui/Card'

/* ─── Main ─── */

export default function SuperBarberosPage() {
  const { session } = useAuth()
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', specialty: '', is_active: true })
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const isMobile = useMediaQuery('(max-width: 767px)')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('barbers')
        .select('*, businesses!inner(name)')
        .order('business_id')
        .order('name')
      if (e) throw e

      // Also get business_staff info to know which barbers have auth users
      const { data: staff } = await supabase
        .from('business_staff')
        .select('barber_id, user_id, role')
        .eq('role', 'barber')

      const staffMap = {}
      if (staff) {
        staff.forEach(s => { staffMap[s.barber_id] = s.user_id })
      }

      const enriched = (data || []).map(b => ({
        ...b,
        business_name: b.businesses?.name || '—',
        has_user: !!staffMap[b.id],
        user_id: staffMap[b.id] || null,
      }))

      setBarbers(enriched)
    } catch (err) {
      setError(err?.message || 'Error al cargar barberos')
    } finally {
      setLoading(false)
    }
  }

  /* Edit */
  function openEdit(b) {
    setEditTarget(b)
    setForm({
      name: b.name || '',
      phone: b.phone || '',
      email: b.email || '',
      specialty: b.specialty || '',
      is_active: b.is_active ?? true,
    })
    setFormErrors({})
    setFormError(null)
    setShowEdit(true)
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
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
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
      const { error: ue } = await supabase
        .from('barbers')
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          specialty: form.specialty.trim() || null,
          is_active: form.is_active,
        })
        .eq('id', editTarget.id)
      if (ue) throw ue

      setShowEdit(false)
      setEditTarget(null)
      await fetchAll()
    } catch (err) {
      setFormError(err.message || 'Error al guardar')
    } finally {
      setActionLoading(false)
    }
  }

  /* Delete */
  function confirmDelete(b) { setDeleteTarget(b); setShowDelete(true) }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      // Delete barber_services
      await supabase.from('barber_services').delete().eq('barber_id', deleteTarget.id)
      // Delete business_staff entry if exists
      await supabase.from('business_staff').delete().eq('barber_id', deleteTarget.id)
      // Delete barber
      const { error: de } = await supabase.from('barbers').delete().eq('id', deleteTarget.id)
      if (de) throw de

      setShowDelete(false)
      setDeleteTarget(null)
      await fetchAll()
    } catch (err) {
      setError(err.message || 'Error al eliminar')
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
        <Button variant="secondary" className="mt-6" onClick={fetchAll}>Reintentar</Button>
      </div>
    </div>
  )

  const activeCount = barbers.filter(b => b.is_active).length
  const isEmpty = !barbers.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Barberos del Sistema</h1>
        <p className="mt-1 text-sm text-white/40">
          {barbers.length} {barbers.length === 1 ? 'barbero registrado' : 'barberos registrados'} ({activeCount} activos)
        </p>
      </div>

      <Card dark padding={false}>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <svg className="h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-white/60">No hay barberos registrados</h3>
            <p className="mt-1 text-sm text-white/30">Los barberos se crean desde cada barbería</p>
          </div>
        ) : isMobile ? (
            <div className="space-y-3 p-4">
              {barbers.map(b => (
                <div key={b.id} className="rounded-2xl border border-white/[0.06] bg-card-dark p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-sm font-bold text-[var(--color-accent)]">
                        {(b.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{b.name}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-white/60">
                          {b.business_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-white/40">Contacto</span>
                      <p className="text-white/70 truncate">{b.email || b.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-white/40">Especialidad</span>
                      <p className="text-white/50 truncate">{b.specialty || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${
                      b.has_user
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${b.has_user ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {b.has_user ? 'Con usuario' : 'Sin usuario'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${
                      b.is_active
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-500/20 bg-gray-500/10 text-gray-400'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${b.is_active ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                      {b.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1 border-t border-white/[0.06] pt-3">
                    <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-white/30 transition-all hover:bg-white/5 hover:text-white" title="Editar">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button onClick={() => confirmDelete(b)} className="rounded-lg p-2 text-white/30 transition-all hover:bg-red-500/10 hover:text-red-400" title="Eliminar">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs font-semibold uppercase tracking-wider text-white/30">
                    <th className="px-6 py-3.5">Barbero</th>
                    <th className="px-6 py-3.5">Barbería</th>
                    <th className="px-6 py-3.5">Contacto</th>
                    <th className="px-6 py-3.5">Especialidad</th>
                    <th className="px-6 py-3.5">Usuario</th>
                    <th className="px-6 py-3.5">Estado</th>
                    <th className="px-6 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {barbers.map(b => (
                    <tr key={b.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-sm font-bold text-[var(--color-accent)]">
                            {(b.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium text-white">{b.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-white/60">
                          {b.business_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          {b.email && <p className="text-white/70">{b.email}</p>}
                          {b.phone && <p className="text-xs text-white/40">{b.phone}</p>}
                          {!b.email && !b.phone && <span className="text-white/20">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/50">{b.specialty || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          b.has_user
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${b.has_user ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {b.has_user ? 'Con usuario' : 'Sin usuario'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          b.is_active
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-gray-500/20 bg-gray-500/10 text-gray-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${b.is_active ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                          {b.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => openEdit(b)}
                            className="rounded-lg p-2 text-white/30 transition-all hover:bg-white/5 hover:text-white"
                            title="Editar"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            onClick={() => confirmDelete(b)}
                            className="rounded-lg p-2 text-white/30 transition-all hover:bg-red-500/10 hover:text-red-400"
                            title="Eliminar"
                          >
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
          )
        }
      </Card>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditTarget(null) }} title={`Editar: ${editTarget?.name || ''}`} size="md" dark>
        {formError && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{formError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={handleChange} error={formErrors.name} dark />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={formErrors.email} dark />
            <Input label="Teléfono" name="phone" value={form.phone} onChange={handleChange} dark />
          </div>
          <Input label="Especialidad" name="specialty" value={form.specialty} onChange={handleChange} dark />
          <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-[var(--color-accent)] focus:ring-[var(--color-accent)]" />
            <span className="text-sm font-medium text-white/70">Barbero activo</span>
          </label>
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
            ¿Estás seguro de eliminar a <strong className="text-white">{deleteTarget?.name}</strong>?
          </p>
          <p className="text-sm text-white/40">
            {deleteTarget?.has_user
              ? 'EL usuario asociado también será eliminado del sistema.'
              : 'Esta acción no se puede deshacer.'}
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowDelete(false); setDeleteTarget(null) }}>Cancelar</Button>
            <Button type="button" variant="danger" onClick={handleDelete} loading={actionLoading}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

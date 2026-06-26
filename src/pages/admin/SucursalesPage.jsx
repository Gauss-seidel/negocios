import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { usePlan } from '../../hooks/usePlan'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import UpgradePrompt from '../../components/ui/UpgradePrompt'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'

function genSlug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function SucursalesPage() {
  const { businessId } = useAuth()
  const { limits, isPremium, loading: planLoading } = usePlan()
  const { isMobile } = useResponsiveTable()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', google_maps_url: '' })
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const atLimit = list.length >= (limits.max_branches || 999)

  useEffect(() => {
    if (businessId) fetchBranches()
  }, [businessId])

  async function fetchBranches() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .order('name')
      setList(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditTarget(null)
    setForm({ name: '', phone: '', address: '', google_maps_url: '' })
    setFormErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(branch) {
    setEditTarget(branch)
    setForm({
      name: branch.name || '',
      phone: branch.phone || '',
      address: branch.address || '',
      google_maps_url: branch.google_maps_url || '',
    })
    setFormErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Obligatorio'
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
      const payload = {
        name: form.name.trim(),
        slug: genSlug(form.name.trim()),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        google_maps_url: form.google_maps_url.trim() || null,
      }

      if (editTarget) {
        const { error: updateErr } = await supabase.from('branches').update(payload).eq('id', editTarget.id)
        if (updateErr) throw updateErr
      } else {
        payload.business_id = businessId
        const { error: insertErr } = await supabase.from('branches').insert(payload)
        if (insertErr) throw insertErr
      }

      setShowModal(false)
      await fetchBranches()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToggle(branch) {
    setActionLoading(true)
    try {
      await supabase.from('branches').update({ is_active: !branch.is_active }).eq('id', branch.id)
      await fetchBranches()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Cargando sucursales...</p>
        </div>
      </div>
    )
  }

  if (error && list.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Error al cargar</h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          <Button variant="secondary" className="mt-4" onClick={fetchBranches}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Sucursales</h1>
          {!planLoading && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {list.length} de {limits.max_branches >= 999 ? '∞' : limits.max_branches} sucursales
            </p>
          )}
        </div>
        <Button onClick={openCreate} disabled={atLimit || planLoading}>
          {atLimit ? 'Límite alcanzado' : 'Agregar sucursal'}
        </Button>
      </div>

      {/* Upgrade prompt */}
      {atLimit && !isPremium && (
        <UpgradePrompt feature="más sucursales" />
      )}

      {/* Empty state */}
      {list.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="h-12 w-12" style={{ color: 'var(--color-text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
            <h3 className="mt-4 text-base font-medium" style={{ color: 'var(--color-text)' }}>No hay sucursales</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Creá tu primera sucursal para comenzar.</p>
            <Button className="mt-4" onClick={openCreate}>Crear Sucursal</Button>
          </div>
        </Card>
      ) : isMobile ? (
        /* Mobile: card list */
        <Card padding={false}>
          <div className="space-y-3 p-4">
            {list.map(b => (
              <div key={b.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{b.name}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    b.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-red-500/20 bg-red-500/10 text-red-600'
                  }`}>
                    {b.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {b.address && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{b.address}</p>}
                {b.phone && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{b.phone}</p>}
                <div className="flex justify-end gap-1 mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" title="Editar">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button onClick={() => handleToggle(b)} className={`rounded-lg p-2 ${b.is_active ? 'text-amber-500' : 'text-emerald-500'} hover:bg-gray-100`} title={b.is_active ? 'Desactivar' : 'Activar'}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      {b.is_active
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      }
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        /* Desktop: table */
        <Card padding={false}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <th className="px-6 py-3.5">Nombre</th>
                <th className="px-6 py-3.5">Dirección</th>
                <th className="px-6 py-3.5">Teléfono</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {list.map(b => (
                <tr key={b.id} className="transition-colors hover:bg-black/[0.02]">
                  <td className="px-6 py-4 font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }}>{b.address || '—'}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-text-secondary)' }}>{b.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      b.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-red-500/20 bg-red-500/10 text-red-600'
                    }`}>
                      {b.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => openEdit(b)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" title="Editar">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => handleToggle(b)} className={`rounded-lg p-2 ${b.is_active ? 'text-amber-500 hover:text-amber-600' : 'text-emerald-500 hover:text-emerald-600'} hover:bg-gray-100`} title={b.is_active ? 'Desactivar' : 'Activar'}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          {b.is_active
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
        </Card>
      )}

      {/* Edit/Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Editar sucursal' : 'Nueva sucursal'} size="md">
        {formError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{formError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} error={formErrors.name} />
          <Input label="Teléfono" name="phone" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
          <Input label="Dirección" name="address" value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} />
          <Input label="Google Maps URL" name="google_maps_url" value={form.google_maps_url} onChange={e => setForm(p => ({...p, google_maps_url: e.target.value}))} />
          <div className="flex items-center justify-end gap-3 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={actionLoading}>{editTarget ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

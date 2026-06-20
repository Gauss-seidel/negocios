import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { usePlan } from '../../hooks/usePlan'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  specialty: '',
  photo_url: '',
  is_active: true,
  service_ids: [],
}

export default function BarbersPage() {
  const { businessId } = useAuth()
  const { planName, limits, loading: planLoading } = usePlan()
  const [barbers, setBarbers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const activeBarbers = barbers.filter(b => b.is_active)
  const atLimit = limits.max_barbers > 0 && activeBarbers.length >= limits.max_barbers

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    if (businessId) fetchAll()
  }, [businessId])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    try {
      const [barbersRes, servicesRes] = await Promise.allSettled([
        supabase
          .from('barbers')
          .select('*, barber_services(service_id)')
          .eq('business_id', businessId)
          .order('name'),
        supabase
          .from('services')
          .select('id, name')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name'),
      ])

      if (barbersRes.status === 'fulfilled') {
        setBarbers(barbersRes.value.data || [])
      }
      if (servicesRes.status === 'fulfilled') {
        setServices(servicesRes.value.data || [])
      }
    } catch (err) {
      setError(err?.message || 'Error al cargar barberos')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditTarget(null)
    setForm({ ...INITIAL_FORM })
    setFormErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function openEditModal(barber) {
    setEditTarget(barber)
    setForm({
      name: barber.name || '',
      phone: barber.phone || '',
      email: barber.email || '',
      specialty: barber.specialty || '',
      photo_url: barber.photo_url || '',
      is_active: barber.is_active ?? true,
      service_ids: (barber.barber_services || []).map((bs) => bs.service_id),
    })
    setFormErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value
    setForm((prev) => ({ ...prev, [name]: val }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (formError) setFormError(null)
  }

  function handleServiceToggle(serviceId) {
    setForm((prev) => {
      const ids = prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter((id) => id !== serviceId)
        : [...prev.service_ids, serviceId]
      return { ...prev, service_ids: ids }
    })
  }

  function validateForm() {
    const errors = {}
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email inválido'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) return

    setActionLoading(true)
    setFormError(null)

    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        specialty: form.specialty.trim() || null,
        photo_url: form.photo_url.trim() || null,
        is_active: form.is_active,
      }

      if (editTarget) {
        const { error: updateErr } = await supabase
          .from('barbers')
          .update(payload)
          .eq('id', editTarget.id)
        if (updateErr) throw updateErr

        // Sync services
        await supabase.from('barber_services').delete().eq('barber_id', editTarget.id)
        if (form.service_ids.length > 0) {
          const { error: linkErr } = await supabase.from('barber_services').insert(
            form.service_ids.map((serviceId) => ({
              barber_id: editTarget.id,
              service_id: serviceId,
            }))
          )
          if (linkErr) throw linkErr
        }
      } else {
        const { data: newBarber, error: insertErr } = await supabase
          .from('barbers')
          .insert([payload])
          .select('id')
          .single()
        if (insertErr) throw insertErr

        if (form.service_ids.length > 0 && newBarber) {
          const { error: linkErr } = await supabase.from('barber_services').insert(
            form.service_ids.map((serviceId) => ({
              barber_id: newBarber.id,
              service_id: serviceId,
            }))
          )
          if (linkErr) throw linkErr
        }
      }

      setShowModal(false)
      await fetchAll()
    } catch (err) {
      setFormError(err.message || 'Error al guardar el barbero')
    } finally {
      setActionLoading(false)
    }
  }

  function confirmDelete(barber) {
    setDeleteTarget(barber)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)

    try {
      await supabase.from('barber_services').delete().eq('barber_id', deleteTarget.id)
      const { error: deleteErr } = await supabase
        .from('barbers')
        .delete()
        .eq('id', deleteTarget.id)
      if (deleteErr) throw deleteErr

      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      await fetchAll()
    } catch (err) {
      setError(err?.message || 'Error al eliminar el barbero')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Cargando barberos...</p>
        </div>
      </div>
    )
  }

  if (error && barbers.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Error al cargar</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={fetchAll}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Barberos</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona los barberos de tu negocio</p>
          {!planLoading && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-400">Plan {planName}:</span>
                <span className={`font-semibold ${atLimit ? 'text-red-600' : 'text-emerald-600'}`}>
                  {activeBarbers.length}/{limits.max_barbers} barberos activos
                </span>
              </div>
            </div>
          )}
        </div>
        <Button onClick={openCreateModal} disabled={atLimit} title={atLimit ? `Limite de ${limits.max_barbers} barberos alcanzado para tu plan` : ''}>
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {atLimit ? 'Limite alcanzado' : 'Nuevo Barbero'}
        </Button>
      </div>

      {/* Barbers grid */}
      {barbers.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-gray-900">No hay barberos</h3>
            <p className="mt-1 text-sm text-gray-500">Agrega barberos para empezar a recibir reservas.</p>
            <Button className="mt-4" onClick={openCreateModal}>Agregar Barbero</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {barbers.map((barber) => (
            <Card key={barber.id} className="transition-shadow hover:shadow-md">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                  {barber.photo_url ? (
                    <img
                      src={barber.photo_url}
                      alt={barber.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex h-full w-full items-center justify-center text-2xl font-bold text-gray-500 ${barber.photo_url ? 'hidden' : ''}`}
                  >
                    {barber.name ? barber.name.charAt(0).toUpperCase() : '?'}
                  </div>
                </div>

                <h3 className="mt-3 font-semibold text-gray-900">{barber.name}</h3>
                {barber.specialty && (
                  <p className="text-sm text-gray-500">{barber.specialty}</p>
                )}

                <span
                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    barber.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {barber.is_active ? 'Activo' : 'Inactivo'}
                </span>

                {barber.barber_services?.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1">
                    {barber.barber_services.map((bs) => {
                      const svc = services.find((s) => s.id === bs.service_id)
                      return svc ? (
                        <span
                          key={bs.service_id}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                        >
                          {svc.name}
                        </span>
                      ) : null
                    })}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 w-full justify-center">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(barber)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => confirmDelete(barber)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Editar Barbero' : 'Nuevo Barbero'}
        size="lg"
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nombre del barbero"
            error={formErrors.name}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Teléfono"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+52 555 123 4567"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="barbero@email.com"
              error={formErrors.email}
            />
          </div>

          <Input
            label="Especialidad"
            name="specialty"
            value={form.specialty}
            onChange={handleChange}
            placeholder="Ej: Cortes clásicos, Barba, Degradados"
          />

          <Input
            label="URL de foto"
            name="photo_url"
            value={form.photo_url}
            onChange={handleChange}
            placeholder="https://ejemplo.com/foto.jpg"
          />

          {/* Services assignment */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Servicios que realiza</label>
            {services.length === 0 ? (
              <p className="text-sm text-gray-400">No hay servicios disponibles. Crea servicios primero.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-3">
                <div className="space-y-2">
                  {services.map((svc) => (
                    <label key={svc.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.service_ids.includes(svc.id)}
                        onChange={() => handleServiceToggle(svc.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                      />
                      <span className="text-sm text-gray-700">{svc.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span className="text-sm font-medium text-gray-700">Barbero activo</span>
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={actionLoading}>
              {editTarget ? 'Guardar Cambios' : 'Agregar Barbero'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }}
        title="Confirmar eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de eliminar a <strong className="text-gray-900">{deleteTarget?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} loading={actionLoading}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

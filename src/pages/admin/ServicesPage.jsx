import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { fmtCurrency as formatCurrency } from '../../utils/format'

const INITIAL_FORM = {
  name: '',
  description: '',
  duration: 30,
  price: '',
  category_id: '',
  is_active: true,
}

export default function ServicesPage() {
  const { businessId } = useAuth()
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (businessId) fetchAll()
  }, [businessId])

  async function fetchAll() {
    setLoading(true)
    setError(null)

    try {
      const [servicesRes, categoriesRes] = await Promise.allSettled([
        supabase
          .from('services')
          .select('*, category:category_id(name)')
          .eq('business_id', businessId)
          .order('name'),
        supabase
          .from('service_categories')
          .select('*')
          .eq('business_id', businessId)
          .order('name'),
      ])

      if (servicesRes.status === 'fulfilled') {
        setServices(servicesRes.value.data || [])
      }
      if (categoriesRes.status === 'fulfilled') {
        setCategories(categoriesRes.value.data || [])
      }
    } catch (err) {
      setError(err?.message || 'Error al cargar servicios')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditTarget(null)
    setForm({ ...INITIAL_FORM, category_id: categories.length > 0 ? categories[0].id : '' })
    setFormErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function openEditModal(service) {
    setEditTarget(service)
    setForm({
      name: service.name || '',
      description: service.description || '',
      duration: service.duration || 30,
      price: service.price ?? '',
      category_id: service.category_id || '',
      is_active: service.is_active ?? true,
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

  function validateForm() {
    const errors = {}
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
    if (!form.duration || Number(form.duration) < 5) errors.duration = 'La duración mínima es 5 minutos'
    if (!form.price && form.price !== 0) errors.price = 'El precio es obligatorio'
    else if (Number(form.price) < 0) errors.price = 'El precio no puede ser negativo'
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
        description: form.description.trim(),
        duration: Number(form.duration),
        price: Number(form.price),
        category_id: form.category_id || null,
        is_active: form.is_active,
      }

      if (editTarget) {
        const { error: updateErr } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editTarget.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('services')
          .insert([payload])
        if (insertErr) throw insertErr
      }

      setShowModal(false)
      await fetchAll()
    } catch (err) {
      setFormError(err.message || 'Error al guardar el servicio')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleToggleActive(service) {
    setActionLoading(true)
    try {
      const { error: updateErr } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)
      if (updateErr) throw updateErr
      await fetchAll()
    } catch (err) {
      setError(err?.message || 'Error al cambiar estado')
    } finally {
      setActionLoading(false)
    }
  }

  function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Cargando servicios...</p>
        </div>
      </div>
    )
  }

  if (error && services.length === 0) {
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Servicios</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona los servicios que ofrece tu negocio</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Servicio
        </Button>
      </div>

      {/* Services list */}
      {services.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-gray-900">No hay servicios</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primer servicio para comenzar.</p>
            <Button className="mt-4" onClick={openCreateModal}>
              Crear Servicio
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">{service.name}</h3>
                  {service.category && (
                    <span className="mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {service.category.name}
                    </span>
                  )}
                </div>
                <span
                  className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    service.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {service.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {service.description && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{service.description}</p>
              )}

              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="text-gray-500">
                  <span className="font-medium text-gray-700">{formatDuration(service.duration)}</span>
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(service.price)}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(service)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(service)}
                  disabled={actionLoading}
                >
                  {service.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Editar Servicio' : 'Nuevo Servicio'}
        size="md"
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
            placeholder="Ej: Corte de cabello"
            error={formErrors.name}
          />

          <div className="space-y-1">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              placeholder="Descripción opcional del servicio"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Duración (minutos)"
              name="duration"
              type="number"
              min={5}
              value={form.duration}
              onChange={handleChange}
              error={formErrors.duration}
            />
            <Input
              label="Precio (₲)"
              name="price"
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={handleChange}
              error={formErrors.price}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <select
              id="category_id"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span className="text-sm font-medium text-gray-700">Servicio activo</span>
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={actionLoading}>
              {editTarget ? 'Guardar Cambios' : 'Crear Servicio'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

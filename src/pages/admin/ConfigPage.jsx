import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ConfigPage() {
  const { businessId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    phone: '',
    email: '',
    address: '',
    google_maps_url: '',
    description: '',
    logo_url: '',
  })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    if (businessId) fetchBusiness()
  }, [businessId])

  async function fetchBusiness() {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()

      if (fetchErr) throw fetchErr

      if (data) {
        setForm({
          name: data.name || '',
          slug: data.slug || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          google_maps_url: data.google_maps_url || '',
          description: data.description || '',
          logo_url: data.logo_url || '',
        })
      }
    } catch (err) {
      setError(err?.message || 'Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (error) setError(null)
    if (success) setSuccess(false)
  }

  function validateForm() {
    const errors = {}
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
    if (!form.slug.trim()) {
      errors.slug = 'El slug es obligatorio'
    } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
      errors.slug = 'Solo minúsculas, números y guiones'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email inválido'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateErr } = await supabase
        .from('businesses')
        .update({
          name: form.name.trim(),
          slug: form.slug.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          google_maps_url: form.google_maps_url.trim() || null,
          description: form.description.trim() || null,
          logo_url: form.logo_url.trim() || null,
        })
        .eq('id', businessId)

      if (updateErr) throw updateErr

      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(err?.message || 'Error al guardar configuración')
    } finally {
      setSaving(false)
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
          <p className="mt-4 text-sm text-gray-500">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  if (error && !form.name) {
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
          <Button variant="secondary" className="mt-4" onClick={fetchBusiness}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">Información general de tu negocio</p>
      </div>

      {/* Success message */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Configuración guardada exitosamente.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del negocio</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre del negocio"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ej: Barbería El Clásico"
                error={formErrors.name}
              />
              <Input
                label="Slug (URL)"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="ej: barberia-el-clasico"
                error={formErrors.slug}
              />
            </div>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacto</h2>
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
                placeholder="contacto@barberia.com"
                error={formErrors.email}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h2>
            <div className="space-y-4">
              <Input
                label="Dirección"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Calle y número, colonia, ciudad"
              />
              <Input
                label="Google Maps URL"
                name="google_maps_url"
                value={form.google_maps_url}
                onChange={handleChange}
                placeholder="https://maps.app.goo.gl/VeAZcySBVie768Bm6"
              />
              {form.google_maps_url && (
                <a
                  href={form.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Probar enlace
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Descripción</h2>
            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descripción del negocio
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="Describe tu negocio, servicios destacados, etc."
              />
            </div>
          </div>

          {/* Logo */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo</h2>
            <Input
              label="URL del logo"
              name="logo_url"
              value={form.logo_url}
              onChange={handleChange}
              placeholder="https://ejemplo.com/logo.png"
            />
            {form.logo_url && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-gray-500">Vista previa:</p>
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <img
                    src={form.logo_url}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'block'
                    }}
                  />
                  <span className="hidden text-xs text-gray-400">Error al cargar</span>
                </div>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <Button type="submit" loading={saving} size="lg">
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

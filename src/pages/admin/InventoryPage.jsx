import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { usePlan } from '../../hooks/usePlan'
import UpgradePrompt from '../../components/ui/UpgradePrompt'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { fmtCurrency as formatCurrency } from '../../utils/format'

const INITIAL_FORM = {
  name: '',
  description: '',
  stock: 0,
  min_stock: 0,
  unit: 'pieza',
  price: '',
}

const UNITS = ['pieza', 'litro', 'kilogramo', 'botella', 'tubo', 'pack', 'par']

export default function InventoryPage() {
  const { businessId } = useAuth()
  const { isProfessional, hasFeature, planName, loading: planLoading } = usePlan()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [formErrors, setFormErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const [showStockModal, setShowStockModal] = useState(false)
  const [stockTarget, setStockTarget] = useState(null)
  const [stockAdjustment, setStockAdjustment] = useState('')
  const [stockAdjustmentType, setStockAdjustmentType] = useState('in')
  const [stockError, setStockError] = useState(null)

  useEffect(() => {
    if (businessId) fetchProducts()
  }, [businessId])

  async function fetchProducts() {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchErr } = await supabase
        .from('inventory_products')
        .select('*')
        .eq('business_id', businessId)
        .order('name')

      if (fetchErr) throw fetchErr
      setProducts(data || [])
    } catch (err) {
      setError(err?.message || 'Error al cargar inventario')
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

  function openEditModal(product) {
    setEditTarget(product)
    setForm({
      name: product.name || '',
      description: product.description || '',
      stock: product.current_stock ?? 0,
      min_stock: product.min_stock ?? 0,
      unit: product.unit || 'pieza',
      price: product.price ?? '',
    })
    setFormErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function handleChange(e) {
    const { name, value, type } = e.target
    const val = type === 'number' ? (value === '' ? '' : Number(value)) : value
    setForm((prev) => ({ ...prev, [name]: val }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (formError) setFormError(null)
  }

  function validateForm() {
    const errors = {}
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
    if (form.stock === '' || form.stock < 0) errors.stock = 'Stock inválido'
    if (form.min_stock === '' || form.min_stock < 0) errors.min_stock = 'Stock mínimo inválido'
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
        description: form.description.trim() || null,
        current_stock: Number(form.stock),
        min_stock: Number(form.min_stock),
        unit: form.unit,
        price: form.price === '' ? null : Number(form.price),
      }

      if (editTarget) {
        const { error: updateErr } = await supabase
          .from('inventory_products')
          .update(payload)
          .eq('id', editTarget.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('inventory_products')
          .insert([payload])
        if (insertErr) throw insertErr
      }

      setShowModal(false)
      await fetchProducts()
    } catch (err) {
      setFormError(err.message || 'Error al guardar producto')
    } finally {
      setActionLoading(false)
    }
  }

  function openStockAdjustment(product) {
    setStockTarget(product)
    setStockAdjustment('')
    setStockAdjustmentType('in')
    setStockError(null)
    setShowStockModal(true)
  }

  async function handleStockAdjustment(e) {
    e.preventDefault()
    if (!stockAdjustment || Number(stockAdjustment) <= 0) {
      setStockError('Ingresa una cantidad válida')
      return
    }

    setActionLoading(true)
    setStockError(null)

    const qty = Number(stockAdjustment)
    const newStock =
      stockAdjustmentType === 'in'
        ? (stockTarget.current_stock || 0) + qty
        : Math.max(0, (stockTarget.current_stock || 0) - qty)

    try {
      const { error: updateErr } = await supabase
        .from('inventory_products')
        .update({ current_stock: newStock })
        .eq('id', stockTarget.id)
      if (updateErr) throw updateErr

      setShowStockModal(false)
      setStockTarget(null)
      await fetchProducts()
    } catch (err) {
      setStockError(err.message || 'Error al ajustar stock')
    } finally {
      setActionLoading(false)
    }
  }

    const lowStockProducts = products.filter((p) => p.current_stock <= p.min_stock && p.min_stock > 0)

  if (loading || planLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  if (!isProfessional) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventario</h1>
          <p className="mt-1 text-sm text-gray-500">Control de productos e insumos</p>
        </div>
        <UpgradePrompt feature="El modulo de Inventario" requiredPlan="Profesional" />
      </div>
    )
  }

  if (error && products.length === 0) {
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
          <Button variant="secondary" className="mt-4" onClick={fetchProducts}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventario</h1>
          <p className="mt-1 text-sm text-gray-500">Control de productos e insumos</p>
        </div>
        <Button onClick={openCreateModal}>
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar Producto
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 7.05l1.414-1.414M7.05 7.05L5.636 5.636" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Productos con stock bajo</p>
              <p className="text-xs text-amber-700">
                {lowStockProducts.length} producto{lowStockProducts.length !== 1 ? 's' : ''} por debajo del mínimo
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStockProducts.map((p) => (
              <span key={p.id} className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {p.name} ({p.current_stock} {p.unit})
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Products */}
      {products.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-4 text-base font-medium text-gray-900">Inventario vacío</h3>
            <p className="mt-1 text-sm text-gray-500">Agrega productos para controlar tu inventario.</p>
            <Button className="mt-4" onClick={openCreateModal}>Agregar Producto</Button>
          </div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Mínimo</th>
                  <th className="px-6 py-3">Unidad</th>
                  <th className="px-6 py-3">Precio</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => {
                  const isLow = product.min_stock > 0 && product.current_stock <= product.min_stock
                  return (
                    <tr key={product.id} className={`transition-colors hover:bg-gray-50 ${isLow ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">{product.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.current_stock ?? 0}
                        </span>
                        {isLow && (
                          <svg className="ml-1 inline h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{product.min_stock ?? 0}</td>
                      <td className="px-6 py-4 text-gray-600">{product.unit || '—'}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {product.price ? formatCurrency(product.price) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openStockAdjustment(product)}>
                            Ajustar stock
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(product)}>
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Editar Producto' : 'Nuevo Producto'}
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
            placeholder="Ej: Shampoo profesional"
            error={formErrors.name}
          />

          <div className="space-y-1">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock actual"
              name="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={handleChange}
              error={formErrors.stock}
            />
            <Input
              label="Stock mínimo"
              name="min_stock"
              type="number"
              min="0"
              value={form.min_stock}
              onChange={handleChange}
              error={formErrors.min_stock}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unidad</label>
              <select
                id="unit"
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <Input
              label="Precio unitario ($)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={actionLoading}>
              {editTarget ? 'Guardar Cambios' : 'Agregar Producto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock adjustment modal */}
      <Modal
        open={showStockModal}
        onClose={() => { setShowStockModal(false); setStockTarget(null) }}
        title={`Ajustar stock: ${stockTarget?.name || ''}`}
        size="sm"
      >
        {stockError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {stockError}
          </div>
        )}

        <form onSubmit={handleStockAdjustment} className="space-y-4">
          <p className="text-sm text-gray-600">
            Stock actual: <strong className="text-gray-900">{stockTarget?.current_stock ?? 0} {stockTarget?.unit}</strong>
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="adjustment_type"
                value="in"
                checked={stockAdjustmentType === 'in'}
                onChange={() => setStockAdjustmentType('in')}
                className="h-4 w-4 border-gray-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              <span className="text-sm text-gray-700">Agregar</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="adjustment_type"
                value="out"
                checked={stockAdjustmentType === 'out'}
                onChange={() => setStockAdjustmentType('out')}
                className="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">Quitar</span>
            </label>
          </div>

          <Input
            label="Cantidad"
            type="number"
            min="1"
            value={stockAdjustment}
            onChange={(e) => setStockAdjustment(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => { setShowStockModal(false); setStockTarget(null) }}>
              Cancelar
            </Button>
            <Button type="submit" loading={actionLoading}>
              Ajustar Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

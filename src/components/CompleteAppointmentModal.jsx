import { useState } from 'react'
import Button from './ui/Button'
import { fmtCurrency } from '../utils/format'
import InvoiceModal from './InvoiceModal'

function MinusIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

export default function CompleteAppointmentModal({ appointment, services, products, onConfirm, onClose }) {
  const [checkedProducts, setCheckedProducts] = useState(
    Object.fromEntries((products || []).map(p => [p.id, true]))
  )
  const [quantities, setQuantities] = useState(
    Object.fromEntries((products || []).map(p => [p.id, p.quantity || 1]))
  )
  const [saving, setSaving] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [completedAppt, setCompletedAppt] = useState(null)

  function toggleProduct(id) {
    setCheckedProducts(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function updateQuantity(id, delta) {
    setQuantities(prev => {
      const current = prev[id] || 1
      const next = Math.max(1, current + delta)
      return { ...prev, [id]: next }
    })
  }

  function calcTotal() {
    const servicesTotal = (services || []).reduce((sum, s) => sum + Number(s.price || 0), 0)
    const productsTotal = (products || []).reduce((sum, p) => {
      if (!checkedProducts[p.id]) return sum
      return sum + Number(p.price || 0) * (quantities[p.id] || 1)
    }, 0)
    return servicesTotal + productsTotal
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      const completedProducts = (products || [])
        .filter(p => checkedProducts[p.id])
        .map(p => ({ id: p.id, quantity: quantities[p.id] || 1 }))

      const result = await onConfirm({ products: completedProducts })

      // Build invoice data from current appointment + selected items
      const usedServices = (services || []).map(s => ({
        ...s,
        price: s.price || 0,
      }))

      const usedProducts = (products || [])
        .filter(p => checkedProducts[p.id])
        .map(p => ({
          ...p,
          quantity: quantities[p.id] || 1,
          price: p.price || 0,
        }))

      const total = usedServices.reduce((sum, s) => sum + Number(s.price || 0), 0)
        + usedProducts.reduce((sum, p) => sum + Number(p.price || 0) * (p.quantity || 1), 0)

      setCompletedAppt({
        ...appointment,
        services: usedServices,
        products: usedProducts,
        total: result?.total ?? total,
      })
      setShowInvoice(true)
    } finally {
      setSaving(false)
    }
  }

  const total = calcTotal()
  const hasProducts = products && products.length > 0
  const hasServices = services && services.length > 0

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Completar reserva</h2>
            <p className="mt-1 text-sm text-gray-500">
              Verificá qué servicios y productos se realizaron realmente
            </p>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-6">
            {/* Services */}
            {hasServices && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Servicios</h3>
                <div className="space-y-2">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 accent-emerald-600"
                      />
                      <span className="flex-1 text-sm text-gray-700">{s.service?.name || s.name || 'Servicio'}</span>
                      <span className="text-sm font-medium text-gray-900">{fmtCurrency(s.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            {hasProducts && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Productos</h3>
                <div className="space-y-2">
                  {products.map(p => (
                    <div
                      key={p.id}
                      className={`rounded-lg border px-4 py-3 transition-colors ${
                        checkedProducts[p.id]
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checkedProducts[p.id] || false}
                          onChange={() => toggleProduct(p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 accent-emerald-600"
                        />
                        <span className="flex-1 text-sm text-gray-700">{p.product?.name || p.name || 'Producto'}</span>
                        <span className="text-sm font-medium text-gray-900">{fmtCurrency(p.price)}</span>
                      </div>

                      {checkedProducts[p.id] && (
                        <div className="mt-2 ml-7 flex items-center gap-2">
                          <span className="text-xs text-gray-400">Cant:</span>
                          <button
                            onClick={() => updateQuantity(p.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-emerald-300 hover:text-emerald-600"
                          >
                            <MinusIcon />
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-gray-800">
                            {quantities[p.id] || 1}
                          </span>
                          <button
                            onClick={() => updateQuantity(p.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:border-emerald-300 hover:text-emerald-600"
                          >
                            <PlusIcon />
                          </button>
                          <span className="ml-2 text-xs text-gray-400">
                            = {fmtCurrency((p.price || 0) * (quantities[p.id] || 1))}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasServices && !hasProducts && (
              <p className="py-8 text-center text-sm text-gray-400">Esta reserva no tiene servicios ni productos.</p>
            )}

            {/* Total */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm font-medium text-gray-500">Total final</span>
              <span className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
                {fmtCurrency(total)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleConfirm}
              loading={saving}
              disabled={!hasServices && !hasProducts}
            >
              Confirmar Completada
            </Button>
          </div>
        </div>
      </div>

      {showInvoice && completedAppt && (
        <InvoiceModal
          appointment={completedAppt}
          onClose={() => { setShowInvoice(false); onClose() }}
        />
      )}
    </>
  )
}

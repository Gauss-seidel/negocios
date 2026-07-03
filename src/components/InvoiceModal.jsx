import { useEffect, useRef } from 'react'
import { fmtCurrency } from '../utils/format'

function PrinterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0a6.676 6.676 0 0 1-.66.083m10.56 0a6.676 6.676 0 0 0 .66-.083m-10.56 0A6.352 6.352 0 0 0 6 13.25V15a1 1 0 0 0 1 1h1m0 0a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3m-6 0h6m-6 0a3 3 0 0 0-3 3v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3m-3 0h.008v.008H12V15Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75v5.25M3 15V9.75A2.25 2.25 0 0 1 5.25 7.5h0" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function DividerDashed() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 border-t border-dashed border-gray-200" />
      <span className="text-[9px] font-medium tracking-[0.2em] text-gray-300">✦</span>
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
  )
}

function formatTime(timeStr) {
  if (!timeStr) return '--'
  try {
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(h), parseInt(m))
    return date.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return timeStr
  }
}

export default function InvoiceModal({ appointment, onClose }) {
  const cardRef = useRef(null)
  const appt = appointment

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Trigger entry animation after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.style.opacity = '1'
        cardRef.current.style.transform = 'translateY(0)'
      }
    }, 10)
    return () => clearTimeout(timer)
  }, [])

  function handlePrint() {
    window.print()
  }

  if (!appt) return null

  const dateObj = new Date(appt.date + 'T' + (appt.start_time || '00:00'))
  const dateStr = dateObj.toLocaleDateString('es-PY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const now = new Date()
  const emissionDate = now.toLocaleDateString('es-PY', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const services = appt.services || []
  const products = appt.products || []
  const barberName = appt.barber?.name || '—'
  const total = appt.total || 0

  return (
    <>
      <style>{`
        @media print {
          body > *:not(.invoice-root) { display: none !important; }
          .invoice-root {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
          }
          .invoice-overlay { display: none !important; }
          .invoice-card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
            max-width: 420px !important;
            margin: 0 auto !important;
          }
          .no-print { display: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>

      <div className="invoice-root fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        {/* Overlay click */}
        <div className="invoice-overlay absolute inset-0" onClick={onClose} />

        {/* Card */}
        <div
          ref={cardRef}
          className="invoice-card relative w-full max-w-[420px] bg-white rounded-2xl shadow-xl transition-all duration-700"
          style={{
            opacity: 0,
            transform: 'translateY(24px)',
            transitionTimingFunction: 'var(--ease-out-expo, cubic-bezier(0.19, 1, 0.22, 1))',
          }}
        >
          {/* ─── HEADER ─── */}
          <div className="px-6 pt-6 pb-2 text-center">
            <span className="text-[10px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
              BarberShifts
            </span>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-gray-900">
              COMPROBANTE DE SERVICIO
            </h2>
          </div>

          <DividerDashed />

          {/* ─── BUSINESS INFO ─── */}
          <div className="px-6 py-3 text-center">
            <p className="text-sm font-medium text-gray-900">BarberShifts Studio</p>
            <p className="mt-0.5 text-xs text-gray-500">Av. Mariscal López 1845</p>
            <p className="text-xs text-gray-500">+595 981 234 567</p>
          </div>

          <DividerDashed />

          {/* ─── APPOINTMENT INFO ─── */}
          <div className="px-6 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Cliente</span>
              <span className="text-sm font-medium text-gray-900">{appt.client_name || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Barbero</span>
              <span className="text-sm font-medium text-gray-900">{barberName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Fecha</span>
              <span className="text-sm font-medium text-gray-900">{dateStr}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Horario</span>
              <span className="text-sm font-medium text-gray-900">
                {appt.start_time ? formatTime(appt.start_time) : '—'}
                {appt.end_time ? ` - ${formatTime(appt.end_time)}` : ''}
              </span>
            </div>
          </div>

          <DividerDashed />

          {/* ─── SERVICES ─── */}
          {services.length > 0 && (
            <div className="px-6 py-2">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase mb-2">
                Servicios
              </p>
              <div className="space-y-1.5">
                {services.map((svc, idx) => {
                  const name = svc.service?.name || svc.name || 'Servicio'
                  const price = svc.price || 0
                  return (
                    <div key={svc.id || idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 flex-1 pr-4">{name}</span>
                      <span className="text-sm font-mono font-medium text-gray-900 tabular-nums">
                        {fmtCurrency(price)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── PRODUCTS ─── */}
          {products.length > 0 && (
            <div className="px-6 py-2">
              {services.length > 0 && <DividerDashed />}
              <p className="text-[10px] font-semibold tracking-[0.15em] text-gray-400 uppercase mb-2">
                Productos
              </p>
              <div className="space-y-1.5">
                {products.map((prod, idx) => {
                  const name = prod.product?.name || prod.name || 'Producto'
                  const price = prod.price || 0
                  const qty = prod.quantity || 1
                  return (
                    <div key={prod.id || idx}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 flex-1 pr-4">{name}</span>
                        <span className="text-sm font-mono font-medium text-gray-900 tabular-nums">
                          {fmtCurrency(price * qty)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {qty} x {fmtCurrency(price)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {services.length === 0 && products.length === 0 && (
            <div className="px-6 py-6 text-center">
              <p className="text-sm text-gray-400 italic">Sin servicios ni productos registrados</p>
            </div>
          )}

          {/* ─── TOTAL ─── */}
          <div className="mx-6 mt-3 mb-4 flex items-center justify-between rounded-lg bg-gradient-to-r from-[var(--color-accent)]/5 to-transparent border-l-4 border-[var(--color-accent)] px-4 py-3.5">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold font-mono tabular-nums text-[var(--color-accent)]">
              {fmtCurrency(total)}
            </span>
          </div>

          {/* ─── DASHED SEPARATOR (tear line) ─── */}
          <div className="px-6 pb-1">
            <div className="relative">
              <div className="border-t border-dashed border-gray-300" />
              {/* Tear dots on both sides */}
              <div className="absolute -left-2 -top-[5px] h-2.5 w-2.5 rounded-full bg-[var(--color-bg)]" />
              <div className="absolute -right-2 -top-[5px] h-2.5 w-2.5 rounded-full bg-[var(--color-bg)]" />
            </div>
          </div>

          {/* ─── FOOTER ─── */}
          <div className="px-6 pb-6 pt-2 text-center">
            <p className="text-sm font-medium text-gray-700">Gracias por tu visita!</p>
            <p className="mt-1 text-[10px] text-gray-400 font-medium tracking-[0.05em] uppercase">
              Emitido: {emissionDate}
            </p>
          </div>

          {/* ─── ACTIONS ─── */}
          <div className="no-print flex items-center justify-center gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={handlePrint}
              className="no-print inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
            >
              <PrinterIcon />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="no-print inline-flex items-center gap-2 rounded-xl bg-gray-100/80 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-200 hover:text-gray-800 active:scale-[0.97]"
            >
              <XIcon />
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md', dark = false }) {
  const modalRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab') {
        const el = modalRef.current
        if (!el) return
        const focusable = el.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  const bgClass = dark
    ? 'bg-surface-dark border border-white/[0.08] text-white'
    : 'bg-[var(--color-surface)] border border-[var(--color-border)]'

  const titleClass = dark ? 'text-white' : 'text-[var(--color-text)]'
  const borderClass = dark ? 'border-white/[0.08]' : 'border-[var(--color-border)]'
  const closeClass = dark
    ? 'text-white/60 hover:bg-white/10 hover:text-white'
    : 'text-[var(--color-muted)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-text)]'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pt-[8vh] pb-10">
      <div
        className="fixed inset-0 bg-black/45"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full ${sizes[size]} rounded-2xl shadow-2xl ${bgClass}`}
        style={{ boxShadow: dark ? undefined : '0 24px 60px -32px rgba(31,26,23,.35)' }}
      >
        <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6 ${borderClass}`}>
          <h3 className={`min-w-0 text-lg font-semibold tracking-tight ${titleClass}`}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 ${closeClass}`}
          >
            <svg aria-hidden="true" focusable="false" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  )
}

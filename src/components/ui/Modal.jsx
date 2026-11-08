import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md', dark = false }) {
  const modalRef = useRef(null)
  const onCloseRef = useRef(onClose)
  // Keep the latest onClose without re-binding the keydown listener.
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

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

  void dark
  const bgClass = 'bg-[var(--color-surface)] border border-[var(--color-border)]'
  const titleClass = 'text-[var(--color-text)]'
  const borderClass = 'border-[var(--color-border)]'
  const closeClass = 'text-[var(--color-muted)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-text)]'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-start sm:px-4 sm:pt-[8vh] sm:pb-10">
      <div
        className="fixed inset-0 bg-[rgb(20_42_32/0.45)] animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 max-h-[92dvh] w-full overflow-y-auto ${sizes[size]} rounded-t-3xl pb-safe shadow-lg animate-fade-up sm:max-h-none sm:overflow-visible sm:rounded-2xl sm:pb-0 ${bgClass}`}
      >
        <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6 ${borderClass}`}>
          <h3 className={`min-w-0 text-lg font-semibold ${titleClass}`}>{title}</h3>
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
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  )
}

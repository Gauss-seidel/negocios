import { useEffect, useRef } from 'react'
import Button from './Button'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    cancelRef.current?.focus()
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  const tone = variant === 'danger'
    ? { bg: 'bg-[color-mix(in_srgb,var(--color-wine)_10%,transparent)]', fg: 'text-[var(--color-wine)]' }
    : { bg: 'bg-[var(--color-paper-2)]', fg: 'text-[var(--color-accent)]' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgb(20_42_32/0.45)] animate-fade-in" onClick={onClose} />
      <div role="alertdialog" aria-modal="true" aria-label={title} className="relative w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg animate-fade-up">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${tone.bg}`}>
          <svg aria-hidden="true" focusable="false" className={`h-6 w-6 ${tone.fg}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{message}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

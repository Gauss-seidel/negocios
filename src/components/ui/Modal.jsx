import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md', dark = false }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  const bgClass = dark
    ? 'bg-surface-dark border border-white/[0.06]'
    : 'bg-white border border-black/5'

  const titleClass = dark ? 'text-white' : 'text-[var(--color-text)]'
  const borderClass = dark ? 'border-white/[0.06]' : 'border-black/5'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-[10vh] pb-10">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 mx-4 w-full ${sizes[size]} rounded-2xl shadow-2xl ${bgClass}`}
      >
        <div className={`flex items-center justify-between border-b px-6 py-4 ${borderClass}`}>
          <h3 className={`text-lg font-semibold tracking-tight ${titleClass}`}>{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/5"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

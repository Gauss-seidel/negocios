export default function Card({ children, className = '', padding = true, hover = false, dark = false }) {
  // `dark` kept for API compatibility; the admin is light-only now, so it renders the standard surface.
  void dark
  const base = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs'
  const hoverClass = hover ? 'transition-shadow duration-200 hover:shadow-md' : ''
  return (
    <div className={`${base} ${hoverClass} ${padding ? 'p-4 sm:p-5 lg:p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

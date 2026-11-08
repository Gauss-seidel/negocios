export default function Card({ children, className = '', padding = true, hover = false, dark = false }) {
  const base = dark
    ? 'rounded-2xl border border-white/[0.06] bg-card-dark'
    : 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm'

  const hoverClass = hover
    ? 'transition duration-300 hover:shadow-md hover:-translate-y-0.5'
    : ''

  return (
    <div
      className={`${base} ${hoverClass} ${padding ? 'p-5 lg:p-6' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

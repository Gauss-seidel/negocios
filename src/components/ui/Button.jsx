export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-semibold transition duration-200 focus:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'

  const variants = {
    primary: 'rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-ink,#fff)] hover:brightness-110 shadow-sm',
    secondary: 'rounded-xl bg-[var(--color-paper-2,#f3f4f6)] text-[var(--color-text,#374151)] hover:brightness-95 border border-[var(--color-border,rgba(0,0,0,.08))]',
    danger: 'rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/15 border border-red-500/20',
    ghost: 'rounded-xl text-[var(--color-text-secondary,#6b7280)] hover:text-[var(--color-text,#374151)] hover:bg-[var(--color-paper-2,#f3f4f6)]',
    light: 'rounded-xl bg-[var(--color-surface,#f9fafb)] text-[var(--color-text,#374151)] hover:brightness-95 border border-[var(--color-border,rgba(0,0,0,.08))]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  }

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg aria-hidden="true" focusable="false" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

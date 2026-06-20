export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50'

  const variants = {
    primary: 'rounded-xl bg-[var(--color-accent)] text-white hover:brightness-110 shadow-lg shadow-[var(--color-accent)]/20',
    secondary: 'rounded-xl bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-200/60',
    danger: 'rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 border border-red-500/20',
    ghost: 'rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100',
    light: 'rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200',
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
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

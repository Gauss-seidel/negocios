export default function Input({
  label,
  error,
  className = '',
  id,
  dark = false,
  style,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  const base = dark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20 focus:bg-white/10'
    : 'border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]'

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium ${dark ? 'text-white/70' : 'text-[var(--color-text)]'}`}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`block w-full min-w-0 rounded-xl border px-4 py-3 text-[15px] leading-5 shadow-sm transition-[box-shadow,border-color,background-color] duration-150 focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-400 focus:border-red-500'
            : base
        } ${className}`}
        style={{ minHeight: '44px', ...(error ? {} : dark ? {} : { boxShadow: 'inset 0 1px 0 rgba(255,253,250,.6)' }), ...style }}
        {...props}
      />
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </div>
  )
}

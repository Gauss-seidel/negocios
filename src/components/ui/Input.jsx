export default function Input({ label, error, hint, className = '', id, dark = false, style, ...props }) {
  void dark
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        className={`block h-11 w-full min-w-0 rounded-lg border bg-[var(--color-surface)] px-3.5 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-muted)] transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-3 ${
          error
            ? 'border-[var(--color-wine)] focus:ring-[color-mix(in_srgb,var(--color-wine)_18%,transparent)]'
            : 'border-[var(--color-border-strong)] focus:border-[var(--color-brass)] focus:ring-[color-mix(in_srgb,var(--color-brass)_22%,transparent)]'
        } ${className}`}
        style={style}
        {...props}
      />
      {error ? (
        <p className="text-sm font-medium text-[var(--color-wine)]">{error}</p>
      ) : hint ? (
        <p className="text-sm text-[var(--color-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}

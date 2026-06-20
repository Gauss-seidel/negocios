export default function Input({
  label,
  error,
  className = '',
  id,
  dark = false,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  const base = dark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-white/20 focus:bg-white/10'
    : 'bg-white border-gray-200 text-[var(--color-text)] placeholder:text-gray-400 focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]'

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium ${dark ? 'text-white/70' : 'text-gray-700'}`}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`block w-full rounded-xl border px-4 py-2.5 text-sm shadow-sm transition-all focus:outline-none ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : base
        } ${className}`}
        {...props}
      />
      {error && <p className="text-sm font-medium text-red-400">{error}</p>}
    </div>
  )
}

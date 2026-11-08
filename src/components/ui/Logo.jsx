// Wordmark: Bodoni "BarberShifts" with a small brass razor-stripe mark.
export default function Logo({ tone = 'ink', size = 'md', className = '' }) {
  const color = tone === 'light' ? 'var(--color-accent-ink)' : 'var(--color-ink)'
  const text = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} style={{ color }}>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 20 28" className={size === 'lg' ? 'h-7 w-5' : 'h-6 w-[17px]'}>
        <rect x="1" y="1" width="18" height="26" rx="9" fill="none" stroke="var(--color-brass)" strokeWidth="1.6" />
        <path d="M5 8 L15 4 M5 14 L15 10 M5 20 L15 16 M5 26 L15 22" stroke="var(--color-brass)" strokeWidth="1.6" strokeLinecap="round" clipPath="inset(0 round 9px)" />
      </svg>
      <span className={`font-serif font-semibold tracking-[-0.01em] ${text}`}>BarberShifts</span>
    </span>
  )
}
